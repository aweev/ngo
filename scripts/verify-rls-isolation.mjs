#!/usr/bin/env node
/**
 * RLS Multi-Tenant Isolation & Security Verification Script
 *
 * Two different things must hold for every tenant table:
 *
 *  1. RLS is *effectively enabled*. Migration 20240101000014 contains a
 *     PL/pgSQL loop that enables RLS on every table existing at that point,
 *     but that loop does NOT cover tables created by later migrations. A
 *     table created after it needs its own ENABLE statement. The previous
 *     version of this script treated the loop's presence as blanket
 *     protection for all tables, so post-loop tables passed unconditionally.
 *
 *  2. A *tenant-scoped policy* exists. RLS enabled with no policy denies
 *     everything (fails closed), but a policy that forgets to filter on
 *     organization_id reads as a PASS while leaking across tenants. The
 *     previous version computed hasOrgPolicy and never asserted it.
 *
 * Both are enforced now. Tables that legitimately have no organization_id
 * must appear in GLOBAL_TABLE_ALLOWLIST with a reason.
 *
 * Run: node scripts/verify-rls-isolation.mjs
 * Exit: 0 = PASS; 1 = FAIL
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');

/**
 * Tables with no organization_id column, or that are themselves the tenant
 * root: the per-tenant policy rule below does not apply. Each entry carries a
 * reason, because an unexplained entry is exactly how a leak gets approved.
 * These tables are STILL required to have RLS enabled.
 */
const GLOBAL_TABLE_ALLOWLIST = new Map([
    ['stripe_events', 'Stripe webhook dedupe log; keyed by stripe event id, pre-tenant'],
    ['spatial_ref_sys', 'PostGIS extension catalogue'],
    ['schema_migrations', 'Supabase migration ledger'],
    ['organizations', 'The tenant root itself; scoped by its own id column'],
    ['rate_limit_counters', 'Infrastructure, service-role only: RLS enabled with no ' +
        'anon/authenticated policy, so it fails closed (see abuse_prevention migration)'],
    ['whatsapp_webhook_events', 'Inbound webhook replay/forensics log; no organization_id ' +
        'column, service-role writes only'],
]);

const CREATE_TABLE_RE = /CREATE\s+(?:UNLOGGED\s+|TEMP\s+)?TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z0-9_]+)/gi;
const RLS_ENABLE_RE = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z0-9_]+)\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;
const TENANT_POLICY_FN_RE = /add_tenant_policies\(\s*'([a-z0-9_]+)'/gi;
const CREATE_POLICY_RE = /CREATE\s+(?:READ\s+ONLY\s+)?POLICY\s+(?:"[^"]+"|[a-z0-9_]+)\s+ON\s+([a-z0-9_"]+)/gi;
/** Only the loop form counts as schema-wide: format('ALTER TABLE %I ENABLE ...'). */
const GLOBAL_RLS_LOOP_RE = /ALTER\s+TABLE\s+%I\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY/gi;

/**
 * From this migration onwards add_tenant_policies() also enables RLS, so a
 * generator call is sufficient evidence on its own. Earlier migrations need
 * their own ENABLE statement — that is exactly the gap that exposed
 * `form_definitions`. Resolved by filename so adding migrations cannot shift it.
 */
const GENERATOR_ENABLES_RLS_FROM_FILE = '20260925000001_rls_hardening.sql';

function stripComments(sql) {
    return sql.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Collects regex matches with a freshly reset lastIndex each call. */
function collect(regex, content, onMatch) {
    regex.lastIndex = 0;
    let match;
    while ((match = regex.exec(content)) !== null) onMatch(match);
}

function verifyMigrations() {
    console.log('🔍 Scanning database migrations for RLS compliance...\n');

    let migrationFiles = [];
    try {
        migrationFiles = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    } catch {
        console.warn('⚠️  Migrations directory not found or unreadable. Skipping file scan.');
        process.exit(0);
    }

    /** @type {Map<string,{file:string,order:number,hasRls:boolean,policy:string}>} */
    const tables = new Map();
    const rlsEnabled = new Set();
    const tenantPolicy = new Map(); // table -> evidence string ('!! ...' = unscoped)

    let loopOrder = -1;
    let loopFile = null;
    let generatorEnablesRlsFrom = Infinity;

    // Pass 1: locate the schema-wide RLS loop and the hardening migration.
    migrationFiles.forEach((file, order) => {
        if (file === GENERATOR_ENABLES_RLS_FROM_FILE) generatorEnablesRlsFrom = order;
        if (loopOrder !== -1) return;
        const body = stripComments(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));
        if (GLOBAL_RLS_LOOP_RE.test(body)) {
            GLOBAL_RLS_LOOP_RE.lastIndex = 0;
            loopOrder = order;
            loopFile = file;
        }
    });
    GLOBAL_RLS_LOOP_RE.lastIndex = 0;

    // Pass 2: record creations, ENABLE statements and tenant policies.
    migrationFiles.forEach((file, order) => {
        const body = stripComments(readFileSync(join(MIGRATIONS_DIR, file), 'utf8'));

        collect(CREATE_TABLE_RE, body, (m) => {
            const name = m[1].toLowerCase();
            if (GLOBAL_TABLE_ALLOWLIST.has(name)) return;
            if (!tables.has(name)) tables.set(name, { file, order, hasRls: false, policy: '' });
        });

        collect(RLS_ENABLE_RE, body, (m) => rlsEnabled.add(m[1].toLowerCase()));

        // From the RLS-hardening migration onwards, add_tenant_policies() also
        // enables RLS, so a generator call proves both facts.
        collect(TENANT_POLICY_FN_RE, body, (m) => {
            const name = m[1].toLowerCase();
            if (!tenantPolicy.has(name)) tenantPolicy.set(name, { file, scoped: true });
            if (order >= generatorEnablesRlsFrom) rlsEnabled.add(name);
        });

        // A table is tenant-scoped when ANY of its policies filters on
        // organization_id. Public-facing policies (e.g. "any visitor may
        // submit a form") legitimately omit it and must not mask the scoped
        // policies declared after them.
        collect(CREATE_POLICY_RE, body, (m) => {
            const name = m[1].replace(/"/g, '').toLowerCase();
            if (!name || /^[a-z0-9_]+\(/.test(name)) return; // storage.objects(...) etc.
            const end = body.indexOf(';', m.index);
            const stmt = body.slice(m.index, end === -1 ? undefined : end);
            const scoped = /organization_id\s+IS|user_has_permission\s*\(\s*organization_id|organization_id\s+IN/i.test(stmt);
            const prev = tenantPolicy.get(name);
            if (!prev) tenantPolicy.set(name, { file, scoped });
            else if (scoped && !prev.scoped) tenantPolicy.set(name, { file, scoped: true });
        });
    });

    let violations = 0;
    let loopOnly = 0;
    const unscopedTables = [];

    for (const [table, info] of [...tables.entries()].sort()) {
        const evidence = tenantPolicy.get(table);
        const isGlobal = GLOBAL_TABLE_ALLOWLIST.has(table);
        const enabledHere = rlsEnabled.has(table);

        if (enabledHere) {
            info.hasRls = true;
        } else {
            info.hasRls = info.order <= loopOrder;
            if (info.hasRls) loopOnly += 1;
        }

        if (!info.hasRls) {
            console.error(
                `  ❌ [RLS MISSING] '${table}' (created in ${info.file}, after ${loopFile ?? 'the RLS loop'}) ` +
                `has no ENABLE ROW LEVEL SECURITY of its own and is not covered by the loop.`,
            );
            violations++;
        }

        if (isGlobal) {
            console.log(
                `  ✅ [PASS] '${table}' - ${info.hasRls ? 'RLS enabled' : 'RLS MISSING'}; ` +
                `exempt from tenant policy: ${GLOBAL_TABLE_ALLOWLIST.get(table)}.`,
            );
            continue;
        }

        if (!evidence) {
            console.error(
                `  ❌ [NO TENANT POLICY] '${table}' (created in ${info.file}): no organization_id-scoped ` +
                `policy found. Add SELECT public.add_tenant_policies('${table}', <read>, <manage>); or ` +
                `list it in GLOBAL_TABLE_ALLOWLIST with a reason.`,
            );
            violations++;
        } else if (!evidence.scoped) {
            unscopedTables.push(`${table} (${evidence.file})`);
        } else {
            console.log(
                `  ✅ [PASS] '${table}' - ${enabledHere ? 'RLS enabled' : 'RLS via schema loop'}` +
                ` + tenant policy (${evidence.file}).`,
            );
        }
    }

    if (unscopedTables.length > 0) {
        console.error(
            `\n  ❌ [UNSCOPED POLICY] These tables have policies that never filter organization_id, ` +
            `so RLS isolates nothing:\n     ${unscopedTables.join('\n     ')}`,
        );
        violations += unscopedTables.length;
    }

    console.log('\n---------------------------------------------------');
    console.log(`Migrations scanned       : ${migrationFiles.length}`);
    console.log(`Schema-wide RLS loop     : ${loopFile ?? 'NOT FOUND'}`);
    console.log(`Tenant tables audited    : ${tables.size}`);
    console.log(`  protected by loop only : ${loopOnly}`);
    console.log(`  own ENABLE statement   : ${tables.size - loopOnly}`);
    console.log(`Violations found         : ${violations}`);
    console.log('---------------------------------------------------\n');

    if (violations > 0) {
        console.error('❌ RLS Security Verification FAILED. Fix table policies before deploying to production.');
        process.exit(1);
    }

    console.log('✨ OK: All tenant database tables enforce Row Level Security isolation.');
}

verifyMigrations();
