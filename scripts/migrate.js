#!/usr/bin/env node
// =============================================================================
// scripts/migrate.js
// Runs all SQL migration files from supabase/migrations/ in filename order
// against the database pointed to by DATABASE_URL.
//
// Usage:
//   DATABASE_URL=postgres://... node scripts/migrate.js
//
// Prerequisites:
//   npm install pg          (or: npm install --save-dev pg)
//
// The script is idempotent-friendly: migrations that use "if not exists" or
// "or replace" will not error on re-runs.  For strict once-only semantics
// consider adding a migrations tracking table (see note at the bottom).
// =============================================================================

'use strict';

const path = require('path');
const fs   = require('fs');

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'supabase', 'migrations');
const DATABASE_URL   = process.env.DATABASE_URL;

// ---------------------------------------------------------------------------
// Guard: DATABASE_URL must be set
// ---------------------------------------------------------------------------
if (!DATABASE_URL) {
  console.error('');
  console.error('  ✖  DATABASE_URL environment variable is not set.');
  console.error('');
  console.error('  Set it before running this script, e.g.:');
  console.error('');
  console.error('    # Supabase local dev');
  console.error('    DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \\');
  console.error('      node scripts/migrate.js');
  console.error('');
  console.error('    # Remote / production');
  console.error('    DATABASE_URL="$(supabase db url --project-ref <ref>)" \\');
  console.error('      node scripts/migrate.js');
  console.error('');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Guard: pg package must be installed
// ---------------------------------------------------------------------------
let pg;
try {
  pg = require('pg');
} catch {
  console.error('');
  console.error('  ✖  The "pg" package is not installed.');
  console.error('');
  console.error('  Install it with one of:');
  console.error('    npm install pg');
  console.error('    yarn add pg');
  console.error('    pnpm add pg');
  console.error('');
  console.error('  Then re-run:  node scripts/migrate.js');
  console.error('');
  process.exit(1);
}

const { Client } = pg;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns migration filenames from the migrations directory, sorted
 * lexicographically (which preserves the numeric prefix ordering).
 * Only files ending in .sql are included.
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort(); // lexicographic order = numeric prefix order for zero-padded names
}

/**
 * Ensures the migrations tracking table exists so we can skip already-applied
 * files on subsequent runs.
 */
async function ensureTrackingTable(client) {
  await client.query(`
    create schema if not exists _syncwatch_migrations;

    create table if not exists _syncwatch_migrations.applied (
      filename   text        primary key,
      applied_at timestamptz not null default now()
    );
  `);
}

/**
 * Returns the set of already-applied migration filenames.
 */
async function getAppliedMigrations(client) {
  const result = await client.query(
    'select filename from _syncwatch_migrations.applied order by filename'
  );
  return new Set(result.rows.map((r) => r.filename));
}

/**
 * Marks a migration as applied.
 */
async function markApplied(client, filename) {
  await client.query(
    'insert into _syncwatch_migrations.applied (filename) values ($1) on conflict do nothing',
    [filename]
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const client = new Client({ connectionString: DATABASE_URL });

  console.log('\n🔗  Connecting to database…');
  await client.connect();
  console.log('    Connected.\n');

  try {
    await ensureTrackingTable(client);

    const files   = getMigrationFiles();
    const applied = await getAppliedMigrations(client);

    if (files.length === 0) {
      console.log('ℹ️   No migration files found in', MIGRATIONS_DIR);
      return;
    }

    const pending = files.filter((f) => !applied.has(f));

    if (pending.length === 0) {
      console.log('✔   All migrations are already applied. Nothing to do.\n');
      return;
    }

    console.log(`📂  Found ${files.length} migration file(s), ${pending.length} pending:\n`);

    for (const filename of pending) {
      const filepath = path.join(MIGRATIONS_DIR, filename);
      const sql      = fs.readFileSync(filepath, 'utf8');

      process.stdout.write(`  ➜  Applying ${filename} … `);

      // Wrap each migration in a transaction so a partial failure is rolled back
      await client.query('begin');
      try {
        await client.query(sql);
        await markApplied(client, filename);
        await client.query('commit');
        console.log('✔');
      } catch (err) {
        await client.query('rollback');
        console.log('✖  FAILED\n');
        console.error(`     Error in ${filename}:`);
        console.error(`     ${err.message}\n`);
        throw err; // abort remaining migrations
      }
    }

    console.log(`\n✅  ${pending.length} migration(s) applied successfully.\n`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error('\n✖  Migration failed:', err.message);
  process.exit(1);
});

// =============================================================================
// Developer notes
// =============================================================================
//
//  Tracking table
//  ──────────────
//  Applied migrations are recorded in `_syncwatch_migrations.applied`.  This
//  lets you run the script repeatedly without re-applying already-applied SQL.
//
//  Supabase local dev quick-start
//  ───────────────────────────────
//  1. supabase start
//  2. DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres \
//       node scripts/migrate.js
//  3. (optional) node scripts/migrate.js  # re-run is a no-op
//
//  Seeding (dev only)
//  ──────────────────
//  To also load seed data, pipe it via psql:
//    psql "$DATABASE_URL" -f supabase/seed.sql
//  or add a `--seed` flag here and extend the script.
//
//  Production
//  ──────────
//  Prefer `supabase db push` for managed Supabase projects.  Use this script
//  for self-hosted Postgres deployments or CI pipelines without the Supabase
//  CLI.
// =============================================================================
