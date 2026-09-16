/**
 * Seed the complete Nigerian secondary-school subject catalogue for
 * Kreatix Academy ONLY.
 *
 * - Resolves the tenant by name (tenants.name = 'Kreatix Academy'), never
 *   from request input — tenant identity is authoritative only.
 * - Idempotent: upserts on the unique (tenant_id, code) index and revives
 *   soft-deleted seed rows. Safe to re-run.
 * - Mirrors the shape written by POST /api/tenant/academics/subjects
 *   (createSubject in api/tenant/cbt/_lib/subjects.ts).
 *
 * Usage (on the VPS, from the repo root):
 *   node scripts/seed-kreatix-subjects.mjs
 * or:
 *   DATABASE_URL="postgres://..." node scripts/seed-kreatix-subjects.mjs
 */
import pg from 'pg';
import { readFileSync, existsSync } from 'fs';

// Load .env without process.loadEnvFile (Node 18 lacks it). Values already
// present in the real environment take precedence.
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
  } catch {
    // unreadable/missing .env — fall through to process env
  }
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
const CURRICULUM_VERSION = 'NERDC';
const CREATED_BY = 'system-seed';

const JSS = ['JSS1', 'JSS2', 'JSS3'];
const SS = ['SS1', 'SS2', 'SS3'];
const ALL = [...JSS, ...SS];

// [code, name, levels, type, department, description]
// Levels follow the NERDC structure: JSS1–JSS3 junior, SS1–SS3 senior.
const SUBJECTS = [
  // ---- Cross-level (taught JSS1 through SS3) ----
  ['ENG', 'English Language', ALL, 'Core', 'Languages', 'Compulsory language arts: grammar, comprehension, composition and oral English'],
  ['MAT', 'Mathematics', ALL, 'Core', 'Sciences', 'Compulsory mathematics: arithmetic, algebra, geometry, trigonometry and statistics'],
  ['CIV', 'Civic Education', ALL, 'Core', 'Social Studies', 'Citizenship, democracy, human rights, national values and civic responsibilities'],
  ['CRS', 'Christian Religious Studies', ALL, 'Core', 'Humanities', 'Bible knowledge, Christian ethics and moral instruction'],
  ['IRS', 'Islamic Religious Studies', ALL, 'Core', 'Humanities', 'Quranic knowledge, Islamic jurisprudence and moral instruction'],
  ['FRN', 'French Language', ALL, 'Elective', 'Languages', 'Second official language: grammar, vocabulary, comprehension and conversation'],
  ['AGR', 'Agricultural Science', ALL, 'Core', 'Vocational & Technical', 'Crop production, animal husbandry, soil science and farm management'],
  ['GEO', 'Geography', ALL, 'Elective', 'Social Studies', 'Physical and human geography, map work and environmental studies'],
  ['HIS', 'History', ALL, 'Elective', 'Social Studies', 'Nigerian, West African and world history'],

  // ---- Junior secondary only (NERDC core JSS subjects) ----
  ['BSC', 'Basic Science', JSS, 'Core', 'Sciences', 'Foundation science: living things, matter, energy and the environment'],
  ['BTE', 'Basic Technology', JSS, 'Core', 'Vocational & Technical', 'Introductory technology: tools, materials, drawing and simple machines'],
  ['SST', 'Social Studies', JSS, 'Core', 'Social Studies', 'Man and his environment: family, community, culture and national life'],
  ['BUS', 'Business Studies', JSS, 'Core', 'Business', 'Introduction to commerce, bookkeeping, office practice and entrepreneurship'],
  ['NGL', 'Nigerian Languages', JSS, 'Core', 'Languages', 'Indigenous language studies (Hausa, Igbo or Yoruba)'],
  ['CCA', 'Cultural and Creative Arts', JSS, 'Core', 'Arts', 'Visual arts, music, drama and cultural appreciation'],
  ['PHE', 'Physical and Health Education', JSS, 'Core', 'Vocational & Technical', 'Physical fitness, sports, hygiene and health education'],
  ['HEC', 'Home Economics', JSS, 'Core', 'Vocational & Technical', 'Food and nutrition, clothing, home management and family living'],
  ['ICT', 'Computer Studies / ICT', JSS, 'Core', 'ICT', 'Computer fundamentals, word processing, internet and digital literacy'],

  // ---- Senior secondary: Sciences ----
  ['BIO', 'Biology', SS, 'Core', 'Sciences', 'Living organisms, ecology, genetics and human physiology'],
  ['CHM', 'Chemistry', SS, 'Elective', 'Sciences', 'Atomic structure, chemical reactions, organic and inorganic chemistry'],
  ['PHY', 'Physics', SS, 'Elective', 'Sciences', 'Mechanics, waves, electricity, magnetism and modern physics'],
  ['FMT', 'Further Mathematics', SS, 'Elective', 'Sciences', 'Advanced algebra, calculus, vectors, mechanics and statistics'],
  ['HED', 'Health Education', SS, 'Elective', 'Sciences', 'Human health, disease prevention, first aid and public health'],
  ['PED', 'Physical Education', SS, 'Elective', 'Vocational & Technical', 'Sports science, athletics, games and physical conditioning'],

  // ---- Senior secondary: Languages & Humanities ----
  ['LIT', 'Literature in English', SS, 'Elective', 'Languages', 'Prose, poetry and drama from African and non-African writers'],
  ['GOV', 'Government', SS, 'Elective', 'Social Studies', 'Political systems, constitutions, citizenship and international relations'],
  ['ECO', 'Economics', SS, 'Elective', 'Social Studies', 'Microeconomics, macroeconomics, development and Nigerian economy'],
  ['ARB', 'Arabic Language', SS, 'Elective', 'Languages', 'Arabic grammar, composition, translation and literature'],
  ['YOR', 'Yoruba Language', SS, 'Elective', 'Languages', 'Yoruba grammar, literature, oral tradition and culture'],
  ['IGB', 'Igbo Language', SS, 'Elective', 'Languages', 'Igbo grammar, literature, oral tradition and culture'],
  ['HAU', 'Hausa Language', SS, 'Elective', 'Languages', 'Hausa grammar, literature, oral tradition and culture'],
  ['MUS', 'Music', SS, 'Elective', 'Arts', 'Music theory, Nigerian and Western music, performance and composition'],
  ['VSA', 'Visual Arts', SS, 'Elective', 'Arts', 'Drawing, painting, sculpture, design and art appreciation'],

  // ---- Senior secondary: Business ----
  ['COM', 'Commerce', SS, 'Elective', 'Business', 'Trade, banking, insurance, transport and business organisation'],
  ['ACC', 'Financial Accounting', SS, 'Elective', 'Business', 'Bookkeeping, ledgers, trial balance and financial statements'],
  ['MKT', 'Marketing', SS, 'Elective', 'Business', 'Marketing concepts, consumer behaviour, merchandising and distribution'],
  ['OFP', 'Office Practice', SS, 'Elective', 'Business', 'Office procedures, records management, communication and equipment'],
  ['INS', 'Insurance', SS, 'Elective', 'Business', 'Principles of insurance, policy types and the Nigerian insurance market'],
  ['STM', 'Store Management', SS, 'Elective', 'Business', 'Inventory control, warehousing, purchasing and store records'],
  ['BKP', 'Bookkeeping', SS, 'Elective', 'Business', 'Double-entry bookkeeping, journals and cash records'],
  ['TOU', 'Tourism', SS, 'Elective', 'Business', 'Tourism industry, hospitality, travel services and Nigerian attractions'],

  // ---- Senior secondary: ICT ----
  ['DPR', 'Data Processing', SS, 'Elective', 'ICT', 'Data management, spreadsheets, databases and information systems'],

  // ---- Senior secondary: Technical / Vocational & Trade ----
  ['TDR', 'Technical Drawing', SS, 'Elective', 'Vocational & Technical', 'Engineering drawing, orthographic projection, building and machine drawing'],
  ['FNN', 'Food and Nutrition', SS, 'Elective', 'Vocational & Technical', 'Food science, meal planning, nutrition and food preservation'],
  ['CCR', 'Catering Craft Practice', SS, 'Elective', 'Vocational & Technical', 'Food service, catering operations and culinary skills'],
  ['HMT', 'Home Management', SS, 'Elective', 'Vocational & Technical', 'Home economics: housing, family resources and household management'],
  ['CLT', 'Clothing and Textiles', SS, 'Elective', 'Vocational & Technical', 'Garment construction, fabric selection and textile design'],
  ['DYB', 'Dyeing and Bleaching', SS, 'Elective', 'Vocational & Technical', 'Fabric dyeing techniques, batik, tie-dye and finishing'],
  ['LTG', 'Leather Goods Manufacturing', SS, 'Elective', 'Vocational & Technical', 'Leather processing, footwear and leather craft production'],
  ['WWD', 'Woodwork (Carpentry & Joinery)', SS, 'Elective', 'Vocational & Technical', 'Timber technology, joinery, furniture making and finishing'],
  ['MTW', 'Metalwork', SS, 'Elective', 'Vocational & Technical', 'Metal fabrication, machining, sheet metal work and fitting'],
  ['WLD', 'Welding and Fabrication', SS, 'Elective', 'Vocational & Technical', 'Arc and gas welding, structural fabrication and metal joining'],
  ['AUT', 'Auto Mechanics', SS, 'Elective', 'Vocational & Technical', 'Automotive systems, engine repair, diagnostics and maintenance'],
  ['AEL', 'Auto Electrical Work', SS, 'Elective', 'Vocational & Technical', 'Vehicle electrical systems, wiring, batteries and auto electronics'],
  ['ELI', 'Electrical Installation & Maintenance', SS, 'Elective', 'Vocational & Technical', 'Domestic and industrial wiring, circuits and electrical safety'],
  ['RTE', 'Radio, TV and Electronics', SS, 'Elective', 'Vocational & Technical', 'Electronic circuits, audio-visual equipment servicing and repair'],
  ['ACR', 'Air Conditioning & Refrigeration', SS, 'Elective', 'Vocational & Technical', 'Refrigeration cycles, cooling systems installation and servicing'],
  ['BLD', 'Building Construction', SS, 'Elective', 'Vocational & Technical', 'Building materials, masonry, concrete work and construction methods'],
  ['PLB', 'Plumbing and Pipe Fitting', SS, 'Elective', 'Vocational & Technical', 'Water supply systems, drainage, pipe installation and maintenance'],
  ['PHT', 'Photography', SS, 'Elective', 'Vocational & Technical', 'Camera operation, photo processing and digital imaging'],
  ['PRC', 'Printing Craft Practice', SS, 'Elective', 'Vocational & Technical', 'Printing processes, graphics reproduction and finishing'],
  ['GSM', 'GSM Phone Maintenance & Repairs', SS, 'Elective', 'Vocational & Technical', 'Mobile phone hardware, software troubleshooting and repair'],
  ['MIN', 'Mining', SS, 'Elective', 'Vocational & Technical', 'Mineral resources, extraction methods and the Nigerian mining industry'],
  ['ANH', 'Animal Husbandry', SS, 'Elective', 'Vocational & Technical', 'Livestock production, animal nutrition, breeding and health'],
  ['FSH', 'Fisheries', SS, 'Elective', 'Vocational & Technical', 'Fish farming, aquaculture, harvesting and fish processing'],
];

const { Pool } = pg;
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1')
    ? false
    : { rejectUnauthorized: false },
});

async function resolveTenant(client) {
  // Exact name match first, then fuzzy — abort if ambiguous.
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
    console.log(`Seeding subjects for tenant "${tenant.name}" (${tenant.id}) — ${SUBJECTS.length} subjects`);

    await client.query('BEGIN');
    // Matches migration 020 — guarantees the ON CONFLICT arbiter index exists.
    await client.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_tenant_code_unique ON subjects (tenant_id, code)`
    );
    let written = 0;
    for (const [code, name, levels, type, department, description] of SUBJECTS) {
      const r = await client.query(
        `INSERT INTO subjects
           (tenant_id, code, name, levels, type, department, description, version, created_by)
         VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9)
         ON CONFLICT (tenant_id, code) DO UPDATE SET
           name        = EXCLUDED.name,
           levels      = EXCLUDED.levels,
           type        = EXCLUDED.type,
           department  = EXCLUDED.department,
           description = EXCLUDED.description,
           version     = EXCLUDED.version,
           updated_at  = CURRENT_TIMESTAMP,
           deleted_at  = NULL`,
        [tenant.id, code, name, JSON.stringify(levels), type, department, description, CURRICULUM_VERSION, CREATED_BY]
      );
      written += r.rowCount;
    }
    await client.query('COMMIT');

    const count = await client.query(
      `SELECT COUNT(*)::int AS n FROM subjects WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenant.id]
    );
    console.log(`Done: upserted ${written} rows; tenant now has ${count.rows[0].n} active subjects`);
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
