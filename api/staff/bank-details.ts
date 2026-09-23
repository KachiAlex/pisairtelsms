import type { ApiRequest, ApiResponse } from '../_lib/http-types.js';
import { sql } from '../_lib/sql.js';
import { requireRole } from '../_lib/auth-middleware.js';
import { requireCSRF } from '../_lib/csrf.js';
import { rateLimit } from '../_lib/rate-limit.js';
import { ensurePayrollTables, listBanks, resolveBankAccount, ensureTransferRecipient } from '../tenant/_lib/payroll.js';

export default async function handler(req: ApiRequest, res: ApiResponse) {
  const decoded = await requireRole(req, res, ['staff']);
  if (!decoded) return;
  const staffId = decoded.staffId || decoded.userId || decoded.sub;
  if (!staffId) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token payload' });
  }
  const tenantId = decoded.tenantId || 'default-tenant';

  await ensurePayrollTables();

  // GET — own bank details (masked) + bank list for the picker
  if (req.method === 'GET') {
    try {
      const [staffResult, bankList] = await Promise.all([
        sql`
          SELECT account_number, bank_code, bank_name, account_name, bank_verified_at
          FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1
        `,
        listBanks(),
      ]);
      const s = staffResult.rows[0];
      const acct = s?.account_number || null;
      return res.status(200).json({
        bankName: s?.bank_name || '',
        bankCode: s?.bank_code || '',
        accountNumberMasked: acct ? `••••••${acct.slice(-4)}` : '',
        accountName: s?.account_name || '',
        verified: !!s?.bank_verified_at,
        verifiedAt: s?.bank_verified_at || null,
        gatewayConfigured: bankList.source !== null,
        banks: bankList.banks,
      });
    } catch (error) {
      console.error('Error fetching bank details:', error);
      return res.status(500).json({ error: 'Failed to fetch bank details' });
    }
  }

  // PUT — save bank details; verify via gateway when one is configured
  if (req.method === 'PUT') {
    if (rateLimit(req, res, 10, 60 * 1000)) return;
    if (requireCSRF(req, res, staffId)) return;
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const accountNumber = String(body?.accountNumber || '').replace(/\D/g, '');
      const bankCode = String(body?.bankCode || '').trim();
      const bankName = String(body?.bankName || '').trim();
      const confirmed = body?.confirmed === true;

      if (!/^\d{10}$/.test(accountNumber)) {
        return res.status(400).json({ error: 'Account number must be a 10-digit NUBAN' });
      }
      if (!bankCode) {
        return res.status(400).json({ error: 'Please select your bank' });
      }

      const gatewayConfigured = !!(process.env.PAYSTACK_SECRET_KEY || process.env.FLUTTERWAVE_SECRET_KEY);
      let accountName: string | null = null;
      let verifiedAt: Date | null = null;

      if (gatewayConfigured) {
        const resolved = await resolveBankAccount(accountNumber, bankCode);
        if (!resolved.accountName) {
          return res.status(400).json({
            error: resolved.error || 'Could not verify this account — check the account number and bank',
          });
        }
        accountName = resolved.accountName;
        // Staff must confirm the resolved account name before we save — this is
        // the guard against a typo'd account number redirecting salary.
        if (!confirmed) {
          return res.status(200).json({ requiresConfirmation: true, accountName });
        }
        verifiedAt = new Date();
      }

      const updateResult = await sql`
        UPDATE staff SET
          account_number = ${accountNumber},
          bank_code = ${bankCode},
          bank_name = ${bankName || null},
          account_name = ${accountName},
          bank_verified_at = ${verifiedAt},
          transfer_recipient_code = NULL,
          updated_at = NOW()
        WHERE id = ${staffId} AND tenant_id = ${tenantId}
      `;
      if (updateResult.rowCount === 0) {
        return res.status(404).json({ error: 'Staff record not found' });
      }

      // Pre-create the Paystack transfer recipient so payday disbursement
      // doesn't fail on a bad account discovered too late.
      let recipientReady = false;
      if (process.env.PAYSTACK_SECRET_KEY) {
        const rec = await ensureTransferRecipient(staffId, tenantId);
        recipientReady = !!rec.recipientCode;
      }

      // Audit the change — salary redirection is the fraud vector here
      await sql`
        INSERT INTO payroll_audit_log (id, tenant_id, run_id, action, actor, details)
        VALUES (${'audit_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)},
          ${tenantId}, NULL, 'bank_details_updated', ${staffId},
          ${JSON.stringify({ bankName, accountNumberMasked: `••••${accountNumber.slice(-4)}`, accountName, verified: !!verifiedAt, recipientReady })}::jsonb)
      `.catch(() => {});

      // Notify tenant admins — a bank change is the payroll fraud vector
      try {
        const staffRow = await sql`SELECT name FROM staff WHERE id = ${staffId} AND tenant_id = ${tenantId} LIMIT 1`
        const admins = await sql`SELECT id FROM staff WHERE tenant_id = ${tenantId} AND LOWER(role) IN ('tenant_admin', 'admin') AND id <> ${staffId}`
        for (const admin of admins.rows) {
          await sql`
            INSERT INTO notifications (id, tenant_id, user_id, title, message, type, is_read, created_at)
            VALUES (gen_random_uuid()::text, ${tenantId}, ${admin.id},
              'Bank details updated',
              ${`${staffRow.rows[0]?.name || 'A staff member'} updated their salary bank details (${bankName || 'bank'} ••••${accountNumber.slice(-4)})${verifiedAt ? ' — verified' : ' — unverified'}.`},
              'warning', false, NOW())
          `
        }
      } catch (e) {
        console.error('Admin notification for bank change failed:', e)
      }

      return res.status(200).json({
        success: true,
        accountName,
        verified: !!verifiedAt,
        recipientReady,
        gatewayConfigured,
        message: gatewayConfigured
          ? `Account verified as ${accountName}`
          : 'Bank details saved. Note: no payment gateway is configured, so the account could not be verified — the school admin should confirm it manually.',
      });
    } catch (error) {
      console.error('Error saving bank details:', error);
      return res.status(500).json({ error: 'Failed to save bank details' });
    }
  }

  res.setHeader('Allow', 'GET, PUT');
  return res.status(405).json({ error: 'Method not allowed' });
}
