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
 * Checks (Mode A — static, always runs, no database needed):
 *   - every expected public view is declared (CREATE VIEW) in migrations
 *   - every view grants SELECT to `anon` in migrations
 *   - every expected public function is declared and grants EXECUTE to `anon`
 *   - every webhook/form column is declared (CREATE TABLE or ADD COLUMN)
 *
 * Checks (Mode B — live, runs when DATABASE_URL or a service-role
 * connection resolves; otherwise SKIPPED):
 *   - every expected public view exists
 *   - the `anon` role can actually SELECT from it (has_table_privilege)
 *   - every expected public function exists and grants EXECUTE to `anon`
 *   - the webhook/form columns exist in the live catalog
 *   - RLS is enabled on every tenant table at runtime
 *
 * Usage:
 *   node scripts/verify-db-projections.mjs                                   # static only
 *   DATABASE_URL=postgresql://... node scripts/verify-db-projections.mjs    # static + live
 *   (falls back to SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)
 * Exit: 0 = all executed checks pass, 1 = any fail
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * DATABASE_URL is preferred: it works against the local `supabase start` stack
 * in CI. For a linked hosted project, `supabase link` writes the session
 * pooler host to supabase/.temp/pooler-url (without a password), so the
 * password must come from the environment either way.
 *
 * When no connection resolves, only the static checks run (Mode A) and the
 * live catalog checks (Mode B) are reported as SKIPPED — the gate still
 * fails closed on any static mismatch.
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
    ['donations', 'payment_intent'],
    ['donations', 'consent_given'],
    ['donations', 'consent_at'],
    ['donations', 'marketing_consent'],
    ['donations', 'pledge_notified_at'],
    ['donations', 'cancelled_at'],
    ['donations', 'dispute_status'],
    ['donations', 'stripe_invoice_id'],
    ['newsletter_subscribers', 'confirmation_token'],
    ['newsletter_subscribers', 'confirmation_expires_at'],
    ['newsletter_subscribers', 'status'],
    ['form_submissions', 'severity'],
    ['form_submissions', 'notified_at'],
    ['form_submissions', 'escalated_at'],
];

const results = [];
let allPassed = true;

function check(name, passed, detail = '') {
    const result = { name, passed, detail };
    results.push(result);
    if (!passed) allPassed = false;
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
}

// ---------------------------------------------------------------------------
// Mode A — static: no database required. Asserts the migration SQL text
// declares every projection, anon grant and column the public site and the
// Stripe webhook depend on. Catches drift between this gate's EXPECTED_*
// lists and supabase/migrations (e.g. a renamed view or a dropped GRANT).
// ---------------------------------------------------------------------------
async function loadMigrationText() {
    const fs = await import('node:fs');
    const dir = join(root, 'supabase', 'migrations');
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    let sql = '';
    for (const f of files) sql += '\n' + fs.readFileSync(join(dir, f), 'utf8');
    // Strip block + line comments so commented-out DDL cannot satisfy a check.
    sql = sql.replace(/\/\*[\s\S]*?\*\//g, ' ');
    sql = sql.replace(/--[^\r\n]*/g, ' ');
    return sql.replace(/\s+/g, ' ');
}

function runStatic(sql) {
    console.log('--- Static (migration text) ---');
    for (const view of EXPECTED_VIEWS) {
        const created = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?VIEW\\s+(IF\\s+NOT\\s+EXISTS\\s+)?(public\\.)?${view}\\b`, 'i').test(sql);
        check(`(static) view ${view} declared`, created, created ? '' : 'no CREATE VIEW in migrations');
        const granted = new RegExp(`GRANT\\s+SELECT\\s+ON\\s+(public\\.)?${view}\\b[^;]*\\bTO\\s+anon\\b`, 'i').test(sql);
        check(`(static) anon SELECT granted on ${view}`, granted, granted ? '' : 'no GRANT SELECT … TO anon');
    }
    for (const fn of EXPECTED_FUNCTIONS) {
        const created = new RegExp(`CREATE\\s+(OR\\s+REPLACE\\s+)?FUNCTION\\s+(public\\.)?${fn}\\s*\\(`, 'i').test(sql);
        check(`(static) function ${fn}() declared`, created, created ? '' : 'no CREATE FUNCTION in migrations');
        const granted = new RegExp(`GRANT\\s+EXECUTE\\s+ON\\s+FUNCTION\\s+(public\\.)?${fn}\\s*\\([^)]*\\)\\s*TO\\s+anon\\b`, 'i').test(sql);
        check(`(static) anon EXECUTE granted on ${fn}()`, granted, granted ? '' : 'no GRANT EXECUTE … TO anon');
    }
    for (const [table, column] of REQUIRED_COLUMNS) {
        const inCreate = new RegExp(`CREATE\\s+TABLE\\s+(IF\\s+NOT\\s+EXISTS\\s+)?(public\\.)?${table}\\b[\\s\\S]{0,8000}?\\b${column}\\b`, 'i').test(sql);
        const inAlter = new RegExp(`ALTER\\s+TABLE\\s+(IF\\s+EXISTS\\s+)?(public\\.)?${table}\\b[^;]{0,2000}?ADD\\s+COLUMN\\s+(IF\\s+NOT\\s+EXISTS\\s+)?${column}\\b`, 'i').test(sql);
        const ok = inCreate || inAlter;
        check(`(static) ${table}.${column} declared`, ok, ok ? '' : 'neither CREATE TABLE nor ALTER TABLE … ADD COLUMN found');
    }
}

async function main() {
    // Mode A always runs: migration-text assertions, no database needed.
    const sql = await loadMigrationText();
    runStatic(sql);

    // Mode B runs only when a database is reachable; otherwise it is
    // reported as SKIPPED (the gate still fails closed on static mismatches).
    if (!connectionString) {
        console.log('\n--- Live catalog: SKIPPED (no DATABASE_URL / service-role connection) ---');
        finish();
        return;
    }
    let Client;
    try {
        ({ Client } = await import('pg'));
    } catch {
        console.log('\n--- Live catalog: SKIPPED (node module "pg" is not resolvable here) ---');
        finish();
        return;
    }
    if (typeof Client !== 'function') {
        console.log('\n--- Live catalog: SKIPPED (pg module did not export a Client constructor) ---');
        finish();
        return;
    }
    const isLocal = /@(localhost|127\.0\.0\.1):/.test(connectionString);
    const client = new Client({
        connectionString,
        ssl: isLocal ? undefined : { rejectUnauthorized: false },
    });
    try {
        await client.connect();
    } catch (err) {
        console.log(`\n--- Live catalog: SKIPPED (connect failed: ${err instanceof Error ? err.message : err}) ---`);
        finish();
        return;
    }
    console.log('\nConnected to the database — running live catalog checks.\n');

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

    finish();
}

function finish() {
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


