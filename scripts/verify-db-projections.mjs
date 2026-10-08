#!/usr/bin/env node
/**
 * verify-db-projections.mjs - Prove the public site's data boundary is real.
 *
 * The public website never reads base tables. It reads narrow `public_*` views
 * and SECURITY DEFINER aggregate functions that expose only safe columns for
 * the designated public organization. If one disappears, is renamed, or loses
 * its `anon` grant, the public site silently renders empty - so this must run
 * against a live database (CI: the `rls` job, after `supabase db reset`).
 *
 * Checks:
 *   - every expected public view exists
 *   - the `anon` role can actually SELECT from it (has_table_privilege)
 *   - every expected public function exists and grants EXECUTE to `anon`
 *   - the donation payment/receipt columns the Stripe webhook writes exist
 *
 * Usage:
 *   DATABASE_URL=postgresql://... node scripts/verify-db-projections.mjs
 *   (falls back to SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)
 * Exit: 0 = all pass, 1 = any fail
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let Client;
try {
    ({ default: Client } = await import('pg'));
} catch {
    console.error('Missing dependency "pg". Install it with: pnpm add -D pg');
    process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DATABASE_URL is preferred: it works against the local `supabase start` stack
 * in CI. For a linked hosted project, `supabase link` writes the session
 * pooler host to supabase/.temp/pooler-url (without a password), so the
 * password must come from the environment either way.
 */
function resolveConnectionString() {
    if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!key) return null;

    const poolerFile = join(root, 'supabase', '.temp', 'pooler-url');
    if (existsSync(poolerFile)) {
        const base = readFileSync(poolerFile, 'utf8').trim();
        if (base && !/:[^:@/]+@/.test(base)) {
            // No password embedded - inject the service-role key as one.
            return base.replace(/^postgres(ql)?:\/\/([^@/]+)@/, (_m, p1, user) =>
                `postgres${p1 ?? ''}://${user}:${encodeURIComponent(key)}@`);
        }
    }
    return null;
}

const connectionString = resolveConnectionString();
if (!connectionString) {
    console.error('No database connection. Set DATABASE_URL, or both');
    console.error('SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL.');
    process.exit(1);
}

const isLocal = /@(localhost|127\.0\.0\.1):/.test(connectionString);

const client = new Client({
    connectionString,
    ssl: isLocal ? undefined : { rejectUnauthorized: false },
});

/** Views the public site reads. Must match `CREATE VIEW` in supabase/migrations. */
const EXPECTED_VIEWS = [
    'public_campaigns',
    'public_content_blocks',
    'public_content_page_translations',
    'public_content_pages',
    'public_entity_translations',
    'public_events',
    'public_impact_metrics',
    'public_impact_stories',
    'public_news_articles',
    'public_organization',
    'public_partners',
    'public_projects',
    'public_volunteer_roles',
];

/** Aggregate/lookup RPCs exposed to anonymous visitors. */
const EXPECTED_FUNCTIONS = [
    'public_default_org_id',
    'public_impact_stats',
    'public_financial_summary',
    'public_org_brand_theme',
    'public_org_brand_experience',
];

/** Columns the Stripe webhook patches onto donations. */
const REQUIRED_COLUMNS = [
    ['donations', 'subscription_ref'],
    ['donations', 'receipt_url'],
    ['donations', 'tax_receipt_url'],
    ['donations', 'payment_ref'],
];

const results = [];
let allPassed = true;

function check(name, passed, detail = '') {
    const result = { name, passed, detail };
    results.push(result);
    if (!passed) allPassed = false;
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
    await client.connect();
    console.log('Connected to the database.\n');

    // 1. Every public projection the site reads must exist.
    console.log('--- Public Views ---');
    for (const view of EXPECTED_VIEWS) {
        try {
            const { rows } = await client.query(
                "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = $1) AS ok",
                [view],
            );
            check(`View ${view} exists`, rows[0].ok, rows[0].ok ? '' : 'missing');
        } catch (err) {
            check(`View ${view} exists`, false, err.message);
        }
    }

    // 2. Anonymous visitors must actually be able to read them. Views answer to
    // table privileges (RLS governs the underlying tables), so ask Postgres
    // directly rather than pattern-matching pg_policy.
    console.log('\n--- Anon Read Access ---');
    for (const view of EXPECTED_VIEWS) {
        try {
            const { rows } = await client.query(
                "SELECT has_table_privilege('anon', 'public.' || $1, 'SELECT') AS ok",
                [view],
            );
            check(`anon can SELECT ${view}`, rows[0].ok, rows[0].ok ? '' : 'GRANT missing');
        } catch (err) {
            check(`anon can SELECT ${view}`, false, err.message);
        }
    }

    // 3. Aggregate RPCs must exist and be executable by anon.
    console.log('\n--- Public Functions ---');
    for (const fn of EXPECTED_FUNCTIONS) {
        try {
            const { rows } = await client.query(
                `SELECT EXISTS (
                    SELECT 1 FROM information_schema.routines
                    WHERE routine_schema = 'public' AND routine_name = $1
                 ) AS present,
                 has_function_privilege('anon', 'public.' || $1 || '()', 'EXECUTE') AS executable`,
                [fn],
            );
            check(`Function ${fn}() exists`, rows[0].present, rows[0].present ? '' : 'missing');
            check(`anon can EXECUTE ${fn}()`, rows[0].executable, rows[0].executable ? '' : 'GRANT missing');
        } catch (err) {
            check(`Function ${fn}()`, false, err.message);
        }
    }

    // 4. The public site is served for exactly one designated organization.
    console.log('\n--- Public Organization ---');
    try {
        const { rows } = await client.query(
            "SELECT public.public_default_org_id() IS NOT NULL AS resolved",
        );
        check('public_default_org_id() resolves an organization', rows[0].resolved,
            rows[0].resolved ? '' : 'no org is flagged public_site and none is active');
    } catch (err) {
        check('public_default_org_id() resolves an organization', false, err.message);
    }

    // 5. The Stripe webhook patches these columns; if one is gone, donations
    // silently never reach 'completed'.
    console.log('\n--- Donation Payment Schema ---');
    for (const [table, column] of REQUIRED_COLUMNS) {
        try {
            const { rows } = await client.query(
                'SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2 AND column_name = $3) AS ok',
                ['public', table, column],
            );
            check(`${table}.${column} exists`, rows[0].ok, rows[0].ok ? '' : 'missing');
        } catch (err) {
            check(`${table}.${column} exists`, false, err.message);
        }
    }

    // 6. Every tenant table must have RLS on at runtime, not just in the SQL
    // text. This is the check the static gate cannot make.
    console.log('\n--- Runtime RLS ---');
    try {
        const { rows } = await client.query(`
            SELECT string_agg(c.relname, ', ' ORDER BY c.relname) AS unrls
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind = 'r'
              AND c.relrowsecurity = false
              AND c.relname NOT IN ('stripe_events','spatial_ref_sys','schema_migrations')`);
        check('RLS enabled on every tenant table (live catalog)', !rows[0].unrls,
            rows[0].unrls ? `RLS off: ${rows[0].unrls}` : '');
    } catch (err) {
        check('RLS enabled on every tenant table (live catalog)', false, err.message);
    }

    await client.end();

    console.log('\n--- Results ---');
    console.log(JSON.stringify({ results, allPassed }, null, 2));

    if (!allPassed) {
        console.error('\nDB projection verification FAILED.');
        process.exit(1);
    }
    console.log('\nOK: public projections, anon grants and RLS are all present.');
}

main().catch((err) => {
    console.error('Fatal error:', err instanceof Error ? err.message : err);
    process.exit(1);
});


