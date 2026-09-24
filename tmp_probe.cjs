// Probe all newly-routed endpoints. Run inside container: node /tmp/probe.cjs
const jwt = require('jsonwebtoken');
const BASE = 'http://localhost:3000';

const secret = process.env.JWT_SECRET;
const tenantId = process.env.TENANT_ID || 'demo-school';

function tok(payload) {
  return jwt.sign(payload, secret, { expiresIn: '1h' });
}
const adminTok = tok({ userId: 'probe-admin', role: 'tenant_admin', tenantId });
const staffTok = tok({ userId: 'probe-staff', staffId: 'probe-staff', role: 'staff', tenantId });
const superTok = tok({ userId: 'probe-super', role: 'super_admin', tenantId });
const studentTok = tok({ userId: 'probe-stu', studentId: 'probe-stu', role: 'student', tenantId });

async function probe(method, path, token, body) {
  try {
    const res = await fetch(BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const txt = await res.text();
    let snippet = txt.slice(0, 90).replace(/\n/g, ' ');
    return `${method.padEnd(4)} ${path.padEnd(64)} -> ${res.status} ${snippet}`;
  } catch (e) {
    return `${method.padEnd(4)} ${path.padEnd(64)} -> ERR ${e.message}`;
  }
}

(async () => {
  const out = [];
  // Super-admin clean paths
  for (const p of ['/api/admin/stats', '/api/admin/provisioning-queue', '/api/admin/activity-feed',
    '/api/admin/incidents', '/api/admin/audit-log', '/api/admin/tenants', '/api/admin/plans',
    '/api/admin/tenant-admins']) {
    out.push(await probe('GET', p, superTok));
  }
  // Tenant alerts
  for (const p of ['/api/tenant/alerts', '/api/tenant/alerts?status=active',
    '/api/tenant/alerts/statistics/summary', '/api/tenant/alerts/channels', '/api/tenant/alerts/maintenance']) {
    out.push(await probe('GET', p, adminTok));
  }
  // Communications nested
  for (const p of ['/api/tenant/communications', '/api/tenant/communications/logs', '/api/tenant/communications/templates']) {
    out.push(await probe('GET', p, adminTok));
  }
  // CBT questions actions (shadowed before)
  for (const p of ['/api/tenant/cbt/questions/stats', '/api/tenant/cbt/questions/export?sample=true', '/api/tenant/cbt/questions/tags']) {
    out.push(await probe('GET', p, adminTok));
  }
  // CBT exams + offline-sync
  out.push(await probe('GET', '/api/tenant/cbt/exams?limit=5', adminTok));
  out.push(await probe('GET', '/api/tenant/cbt/offline-sync?type=statistics', adminTok));
  // CBT security log-event (student)
  out.push(await probe('POST', '/api/tenant/cbt/security/log-event', studentTok,
    { examId: 'probe-exam', eventType: 'copy_attempt', details: { probe: true } }));
  out.push(await probe('GET', '/api/tenant/cbt/security/probe-exam', studentTok)); // should 403 for student
  // Finance nested
  out.push(await probe('GET', '/api/tenant/finance/payments', adminTok));
  out.push(await probe('GET', '/api/tenant/finance/payments/nonexistent', adminTok));
  out.push(await probe('POST', '/api/tenant/finance/payments/nonexistent/confirm', adminTok));
  out.push(await probe('GET', '/api/tenant/finance/fee-structures', adminTok));
  out.push(await probe('GET', '/api/tenant/finance/fee-structures/nonexistent/history', adminTok));
  out.push(await probe('GET', '/api/tenant/finance/fee-structures/nonexistent/class-overrides', adminTok));
  out.push(await probe('POST', '/api/tenant/finance/fee-structures/nonexistent/class-overrides/preview', adminTok, { overrides: [] }));
  out.push(await probe('GET', '/api/tenant/finance/fee-assignments/nonexistent/ledger', adminTok));
  out.push(await probe('GET', '/api/tenant/finance/fee-assignments/nonexistent/exemptions', adminTok));
  out.push(await probe('GET', '/api/tenant/finance/reconciliation/unmatched', adminTok));
  out.push(await probe('GET', '/api/tenant/finance/reports/summary', adminTok));
  // Student messages read
  out.push(await probe('POST', '/api/student/messages/some-id/read', studentTok));
  // Role negatives
  out.push(await probe('GET', '/api/tenant/alerts', studentTok)); // should be 401/403
  out.push(await probe('GET', '/api/admin/tenants', adminTok)); // tenant_admin on super-admin route

  console.log(out.join('\n'));
})();
