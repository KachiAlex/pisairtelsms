/**
 * Seed a teaching roster for Kreatix Academy ONLY — one teacher (or more)
 * covering every subject in the seeded Nigerian secondary catalogue.
 *
 * - Resolves the tenant by name (tenants.name = 'Kreatix Academy').
 * - Idempotent: keyed on (tenant_id, email); re-running updates the row
 *   instead of duplicating it.
 * - subjects column stores a JSON array of subject NAMES — the app joins
 *   staff to subjects by name (questions_bank/exams reference names, and
 *   teacher-allocation reads staff.subjects).
 * - password_hash / user_id left NULL: these are staff records for
 *   allocation; login accounts are activated separately by the school admin.
 *
 * Usage (on the VPS, from the repo root):
 *   node scripts/seed-kreatix-staff.mjs
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';

function loadEnvFileManually(file) {
  try {
    for (const line of readFileSync(file, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m && process.env[m[1]] === undefined) {
        let value = m[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
        if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
        process.env[m[1]] = value;
      }
    }
  } catch { /* unreadable/missing .env */ }
}

if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
  if (existsSync('.env.local')) loadEnvFileManually('.env.local');
  else if (existsSync('.env')) loadEnvFileManually('.env');
}

const DATABASE_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL or POSTGRES_URL environment variable is not set');
  process.exit(1);
}

const SCHOOL_NAME = 'Kreatix Academy';
const EMAIL_DOMAIN = 'kreatixacademy.ng';
const HIRE_DATE = '2026-01-05'; // start of second term

// [name, gender, qualification, subjects[]]
// Subjects must exactly match seeded subject names.
const TEACHERS = [
  ['Adaeze Nwosu', 'female', 'B.A English, PGDE', ['English Language', 'Literature in English']],
  ['Tunde Adebisi', 'male', 'B.A French, NCE', ['French Language', 'Arabic Language']],
  ['Ngozi Eze', 'female', 'B.A Linguistics', ['Nigerian Languages', 'Yoruba Language', 'Igbo Language', 'Hausa Language']],
  ['Emeka Okafor', 'male', 'B.Sc Mathematics, PGDE', ['Mathematics', 'Further Mathematics']],
  ['Funke Adeyemi', 'female', 'B.Sc Mathematics Education', ['Mathematics', 'Basic Science']],
  ['Chinedu Obi', 'male', 'B.Sc Biology, M.Ed', ['Biology', 'Health Education']],
  ['Amina Bello', 'female', 'B.Sc Chemistry', ['Chemistry']],
  ['Olufemi Balogun', 'male', 'B.Sc Physics, PGDE', ['Physics', 'Basic Technology', 'Technical Drawing']],
  ['Halima Suleiman', 'female', 'B.Sc Sociology, PGDE', ['Social Studies', 'Civic Education']],
  ['Ikenna Mbah', 'male', 'B.Sc Political Science', ['Government', 'History']],
  ['Yetunde Alabi', 'female', 'B.Sc Geography, PGDE', ['Geography', 'Economics']],
  ['Pastor Samuel Adeleke', 'male', 'B.A Religious Studies', ['Christian Religious Studies']],
  ['Mallam Ibrahim Yusuf', 'male', 'B.A Islamic Studies', ['Islamic Religious Studies']],
  ['Bukola Oyekan', 'female', 'B.Sc Business Administration, PGDE', ['Business Studies', 'Commerce']],
  ['Chukwuemeka Anyanwu', 'male', 'B.Sc Accounting, ICAN (ATS)', ['Financial Accounting', 'Bookkeeping']],
  ['Fatima Abubakar', 'female', 'B.Sc Marketing', ['Marketing', 'Insurance', 'Store Management', 'Office Practice', 'Tourism']],
  ['Damilola Fashola', 'male', 'B.Sc Computer Science', ['Computer Studies', 'Data Processing']],
  ['Grace Udo', 'female', 'B.Sc Agricultural Science', ['Agricultural Science', 'Animal Husbandry', 'Fisheries', 'Mining']],
  ['Blessing Okonkwo', 'female', 'B.Sc Home Economics', ['Home Economics', 'Food and Nutrition', 'Home Management', 'Catering Craft Practice', 'Clothing and Textiles', 'Dyeing and Bleaching']],
  ['Engr. Musa Danjuma', 'male', 'B.Eng Civil Engineering', ['Woodwork (Carpentry & Joinery)', 'Metalwork', 'Welding and Fabrication', 'Building Construction', 'Plumbing and Pipe Fitting']],
  ['Engr. Chiamaka Nnamdi', 'female', 'B.Eng Electrical Engineering', ['Auto Mechanics', 'Auto Electrical Work', 'Electrical Installation & Maintenance', 'Radio, TV and Electronics', 'Air Conditioning & Refrigeration', 'GSM Phone Maintenance & Repairs']],
  ['Segun Adebayo', 'male', 'ND Printing Tech, Dip. Photography', ['Photography', 'Printing Craft Practice', 'Leather Goods Manufacturing']],
  ['Coach Peter Etim', 'male', 'B.Sc Human Kinetics', ['Physical and Health Education', 'Physical Education']],
  ['Temitope Ajayi', 'female', 'B.A Fine Arts', ['Cultural and Creative Arts', 'Music', 'Visual Arts']],
];

const { Pool } = pg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: /sslmode=require|sslmode=verify/i.test(DATABASE_URL)
    ? { rejectUnauthorized: false }
    : false,
});

function teacherEmail(name) {
  const clean = name.replace(/^(Pastor|Mallam|Engr\.|Coach)\s+/i, '');
  const parts = clean.toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/);
  return `${parts[0]}.${parts[parts.length - 1]}@${EMAIL_DOMAIN}`;
}

async function resolveTenant(client) {
  const exact = await client.query(
    `SELECT id, name FROM tenants WHERE LOWER(TRIM(name)) = LOWER($1)`,
    [SCHOOL_NAME]
  );
  if (exact.rows.length === 1) return exact.rows[0];
  if (exact.rows.length > 1) {
    throw new Error(`Ambiguous: ${exact.rows.length} tenants named "${SCHOOL_NAME}" — refusing to seed`);
  }
  const fuzzy = await client.query(
    `SELECT id, name FROM tenants WHERE name ILIKE $1 ORDER BY name`,
    ['%kreatix%academy%']
  );
  if (fuzzy.rows.length === 1) {
    console.log(`Resolved tenant by fuzzy match: "${fuzzy.rows[0].name}" (${fuzzy.rows[0].id})`);
    return fuzzy.rows[0];
  }
  if (fuzzy.rows.length > 1) {
    throw new Error(`Ambiguous: multiple tenants match "Kreatix Academy": ${fuzzy.rows.map(r => r.name).join(', ')}`);
  }
  throw new Error(`Tenant "${SCHOOL_NAME}" not found in tenants table`);
}

async function seed() {
  const client = await pool.connect();
  try {
    const tenant = await resolveTenant(client);
    console.log(`Seeding ${TEACHERS.length} teachers for "${tenant.name}" (${tenant.id})`);

    // Validate every assigned subject exists in the tenant catalogue.
    const subjRes = await client.query(
      `SELECT name FROM subjects WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenant.id]
    );
    const validNames = new Set(subjRes.rows.map(r => r.name));
    const missing = [];
    for (const [name, , , subjects] of TEACHERS) {
      for (const s of subjects) if (!validNames.has(s)) missing.push(`${name}: "${s}"`);
    }
    if (missing.length) {
      throw new Error(`Subject names not found in tenant catalogue — run seed-kreatix-subjects.mjs first:\n  ${missing.join('\n  ')}`);
    }

    // Next available STF number for this tenant.
    const maxRes = await client.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(staff_id FROM 4) AS INTEGER)), 0) AS max_n
       FROM staff WHERE tenant_id = $1 AND staff_id ~ '^STF[0-9]+$'`,
      [tenant.id]
    );
    let nextN = maxRes.rows[0].max_n + 1;

    await client.query('BEGIN');
    let written = 0;
    for (const [name, gender, qualification, subjects] of TEACHERS) {
      const email = teacherEmail(name);
      const staffId = `STF${String(nextN++).padStart(6, '0')}`;
      const id = `staff_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      const r = await client.query(
        `INSERT INTO staff
           (id, staff_id, tenant_id, name, role, department, status, email, hire_date,
            qualification, gender, subjects, contract_hours, allocation_periods, risk_flag)
         SELECT $1, $2, $3, $4, 'Teacher', 'Teaching', 'active', $5, $6, $7, $8, $9, 40, 0, 'Normal'
         WHERE NOT EXISTS (
           SELECT 1 FROM staff WHERE tenant_id = $3 AND email = $5
         )
         ON CONFLICT DO NOTHING`,
        [id, staffId, tenant.id, name, email, HIRE_DATE, qualification, gender, JSON.stringify(subjects)]
      );

      if (r.rowCount === 0) {
        // Row exists — refresh allocation fields in place.
        await client.query(
          `UPDATE staff SET subjects = $4, qualification = $5, gender = $6,
                 risk_flag = 'Normal', updated_at = NOW()
           WHERE tenant_id = $1 AND email = $2 AND role = 'Teacher'`,
          [tenant.id, email, name, JSON.stringify(subjects), qualification, gender]
        );
      }
      written += Math.max(r.rowCount, 1);
    }
    await client.query('COMMIT');

    const count = await client.query(
      `SELECT COUNT(*)::int AS n FROM staff WHERE tenant_id = $1 AND role = 'Teacher' AND status = 'active'`,
      [tenant.id]
    );
    console.log(`Done: processed ${written} teachers; tenant now has ${count.rows[0].n} active teachers`);

    // Coverage report — subjects with no teacher assigned.
    const coverage = await client.query(
      `SELECT s.name
       FROM subjects s
       WHERE s.tenant_id = $1 AND s.deleted_at IS NULL
         AND NOT EXISTS (
           SELECT 1 FROM staff st
           WHERE st.tenant_id = $1 AND st.role = 'Teacher' AND st.status = 'active'
             AND st.subjects::jsonb ? s.name
         )
       ORDER BY s.name`,
      [tenant.id]
    );
    if (coverage.rows.length) {
      console.log(`Uncovered subjects (${coverage.rows.length}):`);
      coverage.rows.forEach(r => console.log(`  - ${r.name}`));
    } else {
      console.log('Coverage: every active subject has at least one teacher assigned');
    }
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* ignore */ }
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
