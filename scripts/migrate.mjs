#!/usr/bin/env node
// Database migration runner with app_migrations tracking.
//
// Scans all *_migrations directories for numbered .sql files and applies
// pending ones in order, recording each in public.app_migrations.
//
// On first run (fresh tracking table), all files present are baselined as
// already applied — existing databases were migrated manually before this
// runner existed. Use --apply-all to force-run every file instead (only safe
// if the files are idempotent).
//
// Usage:
//   node scripts/migrate.mjs             # baseline if first run, else apply pending
//   node scripts/migrate.mjs --status    # show applied/pending, no changes
//
// Env: DATABASE_URL (required)

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import pg from 'pg'

const ROOT = process.cwd()
const MIGRATION_DIRS = [
  'api/tenant/cbt/_migrations',
  'api/tenant/finance/_migrations',
  'api/tenant/_migrations',
  'api/_migrations',
]

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('migrate: DATABASE_URL is not set — skipping migrations')
  process.exit(0)
}

function discoverMigrations() {
  const files = []
  for (const dir of MIGRATION_DIRS) {
    const abs = join(ROOT, dir)
    if (!existsSync(abs)) continue
    for (const name of readdirSync(abs)) {
      // numbered migration files only (skips *.test.ts, *-verification.sql)
      if (!/^\d+_.*\.sql$/i.test(name)) continue
      files.push({ key: `${dir}/${name}`, path: join(abs, name) })
    }
  }
  // Each directory is an independent chronological sequence; keep dir order,
  // sort filenames within it (zero-padded numbering makes lexical == numeric)
  return files.sort((a, b) => a.key.localeCompare(b.key))
}

async function main() {
  const statusOnly = process.argv.includes('--status')
  const applyAll = process.argv.includes('--apply-all')
  const pool = new pg.Pool({ connectionString: DATABASE_URL, max: 1 })
  const client = await pool.connect()

  try {
    const tableExists = await client.query(
      `SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = 'app_migrations'`
    )
    const firstRun = tableExists.rowCount === 0

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.app_migrations (
        name text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )`)

    const { rows } = await client.query('SELECT name FROM public.app_migrations')
    const applied = new Set(rows.map((r) => r.name))
    const migrations = discoverMigrations()
    const pending = migrations.filter((m) => !applied.has(m.key))

    if (statusOnly) {
      console.log(`migrations: ${applied.size} applied, ${pending.length} pending`)
      for (const m of pending) console.log(`  pending: ${m.key}`)
      return
    }

    if (firstRun && !applyAll) {
      // Baseline: record every discovered file as applied without running it.
      // Existing databases predate this runner and were migrated manually.
      const values = migrations.map((_, i) => `($${i + 1})`).join(',')
      await client.query(
        `INSERT INTO public.app_migrations (name) VALUES ${values}
         ON CONFLICT (name) DO NOTHING`,
        migrations.map((m) => m.key)
      )
      console.log(`migrate: baselined ${migrations.length} existing migration(s)`)
      return
    }

    if (pending.length === 0) {
      console.log(`migrate: up to date (${applied.size} applied)`)
      return
    }

    for (const m of pending) {
      const body = readFileSync(m.path, 'utf8')
      console.log(`migrate: applying ${m.key}`)
      try {
        await client.query('BEGIN')
        await client.query(body)
        await client.query(
          'INSERT INTO public.app_migrations (name) VALUES ($1)',
          [m.key]
        )
        await client.query('COMMIT')
      } catch (err) {
        await client.query('ROLLBACK')
        console.error(`migrate: FAILED ${m.key}: ${err.message}`)
        process.exitCode = 1
        return
      }
    }
    console.log(`migrate: applied ${pending.length} migration(s)`)
  } finally {
    client.release()
    await pool.end()
  }
}

main().catch((err) => {
  console.error(`migrate: ${err.message}`)
  process.exit(1)
})
