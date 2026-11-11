#!/usr/bin/env node
/**
 * Runs the scheduled-runtime suite against a real database.
 *
 * The suite covers `supabase/migrations/20261103000002_fix_schedule_cron_runtime.sql`:
 * the pg_cron installer's job contract and the webhook-delivery claim RPC. Both
 * depend on Supabase-owned objects (API roles, pg_net, cron, vault), so this
 * runner lays down `supabase/tests/schedule-runtime-shims.sql` first — a no-op on
 * a real stack, a stand-in on bare PostgreSQL — then applies the migration file,
 * then runs the assertions.
 *
 * Everything happens inside ONE transaction that always rolls back, so no
 * object, cron job or row survives and the run is safe against a live database.
 *
 * Connection string resolution order (first hit wins):
 *   1. first non-flag CLI argument
 *   2. DATABASE_URL
 *   3. supabase/.temp/pooler-url  (written by `supabase link` — never contains a
 *      password, so that path only works for projects without one set)
 *
 * Usage:
 *   node scripts/run-runtime-tests.mjs "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
 *   DATABASE_URL=... pnpm test:runtime
 *
 * Exit: 0 = every assertion passed, 1 = assertion/connection failure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const shimsFile = join(root, 'supabase', 'tests', 'schedule-runtime-shims.sql');
const migrationFile = join(root, 'supabase', 'migrations', '20261103000002_fix_schedule_cron_runtime.sql');
const testsFile = join(root, 'supabase', 'tests', 'schedule-runtime-tests.sql');

for (const file of [shimsFile, migrationFile, testsFile]) {
    if (!existsSync(file)) {
        console.error(`Missing required file: ${file}`);
        process.exit(1);
    }
}

function resolveUrl() {
    const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
    if (arg) return arg;
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
    const pooler = join(root, 'supabase', '.temp', 'pooler-url');
    if (existsSync(pooler)) return readFileSync(pooler, 'utf8').trim();
    return null;
}

const url = resolveUrl();
if (!url) {
    console.error('No connection string. Pass one as an argument or set DATABASE_URL.');
    process.exit(1);
}
if (!/:\/\/[^@/]*:[^@/]*@/.test(url)) {
    console.error('That connection string carries no password.');
    console.error('supabase/.temp/pooler-url never includes one — supply DATABASE_URL, e.g.');
    console.error('  postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres');
    process.exit(1);
}

let Client;
try {
    ({ Client } = await import('pg'));
} catch {
    console.error('Missing dependency "pg". Install it with: pnpm add -D pg');
    process.exit(1);
}
if (typeof Client !== 'function') {
    console.error('The "pg" module did not export a Client constructor.');
    process.exit(1);
}

const client = new Client({
    connectionString: url,
    // Local stacks (supabase start / plain Postgres) serve no TLS.
    ssl: /@(localhost|127\.0\.0\.1):/.test(url) ? undefined : { rejectUnauthorized: false },
});

// RAISE NOTICE is how the SQL reports which branch it took (e.g. the installer
// assertions being skipped on a database without a writable Vault).
client.on('notice', (msg) => {
    if (msg && msg.message) console.log(`  ${msg.severity ?? 'NOTICE'}: ${msg.message}`);
});

try {
    await client.connect();
    console.log('Connected. Running scheduled-runtime tests (rolled back afterwards)...');

    await client.query('begin');
    console.log('  applying Supabase stand-in shims...');
    await client.query(readFileSync(shimsFile, 'utf8'));
    console.log('  applying 20261103000002_fix_schedule_cron_runtime.sql...');
    await client.query(readFileSync(migrationFile, 'utf8'));
    console.log('  running assertions...');
    await client.query(readFileSync(testsFile, 'utf8'));
    await client.query('rollback');
    await client.end();

    console.log('\nOK: all scheduled-runtime assertions passed.');
    process.exit(0);
} catch (err) {
    console.error('\nScheduled-runtime test FAILED:', err instanceof Error ? err.message : err);
    try {
        await client.query('rollback');
    } catch {
        // connection already gone — nothing to roll back
    }
    try {
        await client.end();
    } catch {
        // ignore
    }
    process.exit(1);
}