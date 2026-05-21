import { queryOne, queryAll, query } from '../cbt/_lib/db.js';
import crypto from 'crypto';

interface ParentRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  password_hash: string;
  tenant_id: string;
  portal_access_token: string | null;
  token_used_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface Parent {
  id: string;
  email: string;
  name: string;
  phone?: string;
  tenantId: string;
  createdAt: string;
}

export interface ParentWithHash extends Parent {
  passwordHash: string;
  childrenIds: string[];
}

export interface CreateOrLinkParentPayload {
  tenantId: string;
  studentId: string;
  guardianName: string;
  guardianEmail: string;
  guardianPhone?: string;
}

function rowToParent(row: ParentRow): Parent {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone ?? undefined,
    tenantId: row.tenant_id,
    createdAt: row.created_at.toISOString(),
  };
}

function generateId(): string {
  return `parent_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

function generateTempPassword(): string {
  return crypto.randomBytes(8).toString('hex');
}

async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(`${salt}:${derived.toString('hex')}`);
    });
  });
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, stored] = hash.split(':');
    crypto.scrypt(password, salt, 64, (err, derived) => {
      if (err) reject(err);
      else resolve(derived.toString('hex') === stored);
    });
  });
}

export async function createOrLinkParent(payload: CreateOrLinkParentPayload): Promise<Parent> {
  const { tenantId, studentId, guardianName, guardianEmail, guardianPhone } = payload;

  let parentRow = await queryOne<ParentRow>(
    `SELECT * FROM parents WHERE email = $1 AND tenant_id = $2`,
    [guardianEmail, tenantId]
  );

  let parentId: string;

  if (!parentRow) {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);
    const id = generateId();
    const accessToken = crypto.randomBytes(32).toString('hex');

    parentRow = await queryOne<ParentRow>(
      `INSERT INTO parents (id, email, name, phone, password_hash, tenant_id, portal_access_token)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, guardianEmail, guardianName, guardianPhone ?? null, passwordHash, tenantId, accessToken]
    ) as ParentRow;

    if (!parentRow) throw new Error('Failed to create parent record');

    await sendParentInviteEmail({
      email: guardianEmail,
      name: guardianName,
      tempPassword,
      accessToken,
      studentId,
    });
  }

  parentId = parentRow.id;

  const junctionId = `ps_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  await query(
    `INSERT INTO parent_students (id, parent_id, student_id, tenant_id)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (parent_id, student_id) DO NOTHING`,
    [junctionId, parentId, studentId, tenantId]
  );

  return rowToParent(parentRow);
}

export async function fetchParentByEmail(email: string, tenantId: string): Promise<ParentWithHash | null> {
  const row = await queryOne<ParentRow & { student_id: string }>(
    `SELECT p.*, ps.student_id FROM parents p
     LEFT JOIN parent_students ps ON ps.parent_id = p.id
     WHERE p.email = $1 AND p.tenant_id = $2`,
    [email, tenantId]
  );
  if (!row) return null;

  const childRows = await queryAll<{ student_id: string }>(
    `SELECT student_id FROM parent_students WHERE parent_id = $1`,
    [row.id]
  );

  return {
    ...rowToParent(row),
    passwordHash: row.password_hash,
    childrenIds: childRows.map(r => r.student_id),
  };
}

interface SendInvitePayload {
  email: string;
  name: string;
  tempPassword: string;
  accessToken: string;
  studentId: string;
}

async function sendParentInviteEmail(payload: SendInvitePayload): Promise<void> {
  const { email, name, tempPassword, accessToken } = payload;

  const portalUrl = process.env.PARENT_PORTAL_URL || `${process.env.APP_URL || 'https://scholarx-app.vercel.app'}/parent-login`;
  const loginUrl = `${portalUrl}?token=${accessToken}`;

  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not set — skipping parent invite email to', email);
    console.info('Parent portal URL:', loginUrl, '| Temp password:', tempPassword);
    return;
  }

  const body = {
    from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
    to: [email],
    subject: 'Your Parent Portal Access',
    html: `
      <p>Dear ${name},</p>
      <p>A student has been enrolled and linked to your account on ScholarX.</p>
      <p>You can access the parent portal to monitor your child's progress using the link below:</p>
      <p><a href="${loginUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;display:inline-block;">Access Parent Portal</a></p>
      <p>Or visit: <a href="${portalUrl}">${portalUrl}</a></p>
      <p><strong>Your login credentials:</strong><br/>
      Email: ${email}<br/>
      Temporary Password: <code>${tempPassword}</code></p>
      <p>Please change your password after your first login.</p>
      <p>If you have any questions, contact your school administrator.</p>
    `,
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error('Failed to send parent invite email:', err);
  }
}
