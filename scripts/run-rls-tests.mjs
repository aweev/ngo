#!/usr/bin/env node
/**
 * Runs `supabase/tests/rls-isolation-tests.sql` against a real database.
 *
 * The test file seeds two organizations, impersonates each role by setting
 * `request.jwt.claim.sub` exactly as Supabase auth does, and asserts the RLS +
 * permission behaviour. This runner wraps the whole file in ONE transaction
 * and always rolls back, so pointing it at a live database leaves no rows and
 * no schema behind.
 *
 * Connection string resolution order (first hit wins):
 *   1. first non-flag CLI argument
 *   2. DATABASE_URL
 *   3. supabase/.temp/pooler-url  (written by `supabase link` — never contains
 *      a password, so this path only works for projects without one set)
 *
 * Usage:
 *   node scripts/run-rls-tests.mjs "postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres"
 *   DATABASE_URL=... pnpm test:rls
 *
 * Exit: 0 = every assertion passed, 1 = assertion/connection failure.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const testFile = join(root, 'supabase', 'tests', 'rls-isolation-tests.sql');

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
    ({ default: Client } = await import('pg'));
} catch {
    console.error('Missing dependency "pg". Install it with: pnpm add -D pg');
    process.exit(1);
}

// The file opens with BEGIN and closes with ROLLBACK; this runner owns the
// transaction instead so the isolation guarantee does not depend on file
// ordering, and a failing assertion can never commit partial state.
const body = readFileSync(testFile, 'utf8')
    .replace(/^\s*BEGIN\s*;\s*$/im, '')
    .replace(/^\s*ROLLBACK\s*;\s*$/im, '');

const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

try {
    await client.connect();
    console.log('Connected. Running RLS isolation tests (rolled back afterwards)…');
    await client.query('begin');
    await client.query(body);
    await client.query('rollback');
    await client.end();
    console.log('\nOK: all RLS isolation assertions passed.');
    process.exit(0);
} catch (err) {
    console.error('\nRLS isolation test FAILED:', err instanceof Error ? err.message : err);
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