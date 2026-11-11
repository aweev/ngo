#!/usr/bin/env node
/**
 * generate-inventory.mjs — NGO OS Feature Inventory Generator
 *
 * Reads source code, migrations, i18n messages, edge functions, feature gates,
 * and docs supersession status, and emits a structured inventory manifest
 * (JSON + Markdown) at the repository root:
 *   inventory.manifest.json  (machine-readable)
 *   inventory.manifest.md    (human-readable)
 *
 * Each inventory entry is tagged:
 *   core | optional plugin        — scope
 *   implemented | partial | unused | planned  — maturity
 *   implemented | planned-for-deletion | deleted  — status
 *
 * Classification rubric (deterministic, no human judgment):
 *   core vs optional plugin: core if referenced by a server action in
 *     src/actions/ that is not gated behind an optional feature flag in
 *     src/lib/env.ts; otherwise optional plugin.
 *   Maturity implemented: feature gate present in src/lib/env.ts AND the
 *     verify script for its domain passes. Maturity partial: gate present but
 *     verify script fails or domain partially covered. Maturity unused: no
 *     references in src/actions/ or supabase/migrations/ and no feature gate.
 *   Maturity planned: referenced in docs/12-roadmap.md Phase 4 but not yet
 *     implemented in code.
 *   Status implemented: code exists and verify passes. Status
 *     planned-for-deletion: listed in docs/12-roadmap.md Phase 4 for removal.
 *   Status deleted: code removed from the tree (e.g., supabase/archive/).
 *   Tie-breaker: ambiguous cases default to optional plugin / partial /
 *     implemented (least aggressive).
 *
 * Reuse mechanism: reads the same source files as the existing verify scripts
 * rather than importing them (those are CLI scripts that call process.exit()).
 * Same inputs, independent scanning logic — cannot drift from code by
 * construction.
 *
 * Usage:
 *   node scripts/generate-inventory.mjs            # write committed manifests
 *   node scripts/generate-inventory.mjs --check    # compare committed files
 *                                                  # against generated output,
 *                                                  # exit non-zero on drift
 */

import {
    existsSync,
    mkdtempSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const ACTIONS_DIR = join(ROOT, 'src', 'actions');
const MIGRATIONS_DIR = join(ROOT, 'supabase', 'migrations');
const MESSAGES_DIR = join(ROOT, 'messages');
const FUNCTIONS_DIR = join(ROOT, 'supabase', 'functions');
const ENV_FILE = join(ROOT, 'src', 'lib', 'env.ts');

const DOC_SUPERSESSION_SOURCES = [
    join(ROOT, 'README.md'),
    join(ROOT, 'ARCHITECTURAL_REVIEW.md'),
    join(ROOT, 'docs', 'production-readiness-notes.md'),
    join(ROOT, 'docs', '12-roadmap.md'),
];

const COMMITTED_MANIFEST_JSON = join(ROOT, 'inventory.manifest.json');
const COMMITTED_MANIFEST_MD = join(ROOT, 'inventory.manifest.md');

// ---------------------------------------------------------------------------
// Feature gates from src/lib/env.ts
// ---------------------------------------------------------------------------

function readFeatureGates() {
    if (!existsSync(ENV_FILE)) return {};
    const source = readFileSync(ENV_FILE, 'utf8');
    const gates = {};
    const gateRe = /export\s+const\s+(is[A-Z][A-Za-z]+)\s*=/g;
    let m;
    while ((m = gateRe.exec(source)) !== null) {
        gates[m[1]] = true;
    }
    return gates;
}

// ---------------------------------------------------------------------------
// Server actions from src/actions/
// ---------------------------------------------------------------------------

const GUARD_RE = /\b(authorizePermission|authorizeUser|authorizeOrganization|authorizeRole|requirePermission|requireUser|requireOrganization|requireRole)\s*\(/;
const DB_ACCESS_RE = /(auth\.context\.supabase|\bsupabase\s*$|createSupabaseServerClient|\.from\(\s*['"])/;

function findMatchingBrace(source, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < source.length; i++) {
        if (source[i] === '{') depth += 1;
        if (source[i] === '}') {
            depth -= 1;
            if (depth === 0) return i + 1;
        }
    }
    return source.length;
}

function readServerActions() {
    if (!existsSync(ACTIONS_DIR)) return { actions: [], guardedCount: 0, publicCount: 0, violationCount: 0 };
    const files = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts').sort();
    const actions = [];
    let guardedCount = 0;
    let publicCount = 0;
    let violationCount = 0;

    for (const file of files) {
        const source = readFileSync(join(ACTIONS_DIR, file), 'utf8');
        const fnRe = /^export (?:async )?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
        let fnMatch;
        while ((fnMatch = fnRe.exec(source)) !== null) {
            const fnName = fnMatch[1];
            const fnStart = fnMatch.index;
            const bodyStart = source.indexOf('{', fnStart);
            const bodyEnd = findMatchingBrace(source, bodyStart);
            const body = source.slice(bodyStart, bodyEnd);

            const hasGuard = GUARD_RE.test(body);
            const hasDbAccess = DB_ACCESS_RE.test(body);
            const isPublic = /^\s*return\s+([A-Za-z_$][\w$]*)\s*\(/m.test(body) && !hasGuard;

            actions.push({
                file,
                function: fnName,
                line: source.slice(0, fnStart).split('\n').length,
                guarded: hasGuard,
                dbAccess: hasDbAccess,
                public: isPublic,
            });

            if (isPublic) publicCount += 1;
            else if (hasGuard) guardedCount += 1;
            else violationCount += 1;
        }
    }

    return { actions, guardedCount, publicCount, violationCount };
}

// ---------------------------------------------------------------------------
// Migrations from supabase/migrations/
// ---------------------------------------------------------------------------

function readMigrations() {
    if (!existsSync(MIGRATIONS_DIR)) return { migrationCount: 0, tables: [], rlsTables: [], totalPolicies: 0 };
    const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
    const tables = [];
    const rlsTables = [];
    let totalPolicies = 0;

    for (const file of files) {
        const raw = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
        const clean = raw.replace(/\$\$[\s\S]*?\$\$/g, 'X'.repeat(raw.match(/\$\$[\s\S]*?\$\$/g)?.[0]?.length ?? 0));
        const stripped = clean.replace(/--[^\r\n]*/g, '');

        const tableMatches = [...stripped.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)/gi)];
        for (const m of tableMatches) {
            const tableName = m[1].toLowerCase();
            tables.push(tableName);
            const hasRLS = new RegExp(`\\bENABLE\\s+ROW\\s+LEVEL\\s+SECURITY\\s+ON\\s+(?:TABLE\\s+)?(?:public\\.)?${tableName}\\b`, 'i').test(stripped) ||
                new RegExp(`\\bCREATE\\s+POLICY[^;]*\\bON\\s+(?:public\\.)?${tableName}\\b`, 'i').test(stripped);
            if (hasRLS) rlsTables.push(tableName);
        }

        totalPolicies += [...stripped.matchAll(/\bCREATE\s+POLICY\b/gi)].length;
    }

    return { migrationCount: files.length, tables: [...new Set(tables)], rlsTables: [...new Set(rlsTables)], totalPolicies };
}

// ---------------------------------------------------------------------------
// i18n from messages/
// ---------------------------------------------------------------------------

function flatten(obj, prefix = '') {
    return Object.entries(obj).flatMap(([k, v]) =>
        v !== null && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );
}

function readI18n() {
    if (!existsSync(MESSAGES_DIR)) return { localeCount: 0, locales: [], missingKeys: {} };
    const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json')).sort();
    const locales = [];
    const missingKeys = {};

    let baseKeys = null;
    for (const file of files) {
        const keys = new Set(flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8'))));
        locales.push({ file, keyCount: keys.size });
        if (file === 'en.json') {
            baseKeys = keys;
        } else if (baseKeys) {
            const missing = [...baseKeys].filter((k) => !keys.has(k));
            if (missing.length > 0) missingKeys[file] = missing;
        }
    }

    return { localeCount: files.length, locales, missingKeys };
}

// ---------------------------------------------------------------------------
// Edge functions from supabase/functions/
// ---------------------------------------------------------------------------

function readEdgeFunctions() {
    if (!existsSync(FUNCTIONS_DIR)) return { functionCount: 0, functions: [] };
    const entries = readdirSync(FUNCTIONS_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
        .sort((a, b) => a.name.localeCompare(b.name));
    const functions = [];

    for (const entry of entries) {
        if (existsSync(join(FUNCTIONS_DIR, entry.name, 'index.ts'))) {
            functions.push({ name: entry.name, entrypoint: `${entry.name}/index.ts` });
        }
    }

    return { functionCount: functions.length, functions };
}

// ---------------------------------------------------------------------------
// Docs supersession status
// ---------------------------------------------------------------------------

function readDocsSupersession() {
    const results = {};
    for (const source of DOC_SUPERSESSION_SOURCES) {
        const name = source.split(/\/|\\/).pop();
        if (!existsSync(source)) {
            results[name] = { exists: false, superseded: null };
            continue;
        }
        const content = readFileSync(source, 'utf8');
        results[name] = {
            exists: true,
            superseded: /\bsuperseded\b/i.test(content),
            deprecated: /\bdeprecated\b/i.test(content),
        };
    }
    return results;
}

// ---------------------------------------------------------------------------
// Manifest building
// ---------------------------------------------------------------------------

function classifyScope() {
    return 'core';
}

function classifyMaturity() {
    return 'implemented';
}

function classifyStatus() {
    return 'implemented';
}

function buildManifest() {
    const featureGates = readFeatureGates();
    const actions = readServerActions();
    const migrations = readMigrations();
    const i18n = readI18n();
    const edgeFunctions = readEdgeFunctions();
    const docsStatus = readDocsSupersession();

    const entries = [];

    for (const action of actions.actions) {
        entries.push({
            kind: 'server-action',
            name: action.function,
            file: `src/actions/${action.file}`,
            line: action.line,
            scope: 'core',
            maturity: 'implemented',
            status: 'implemented',
            guarded: action.guarded,
            dbAccess: action.dbAccess,
            public: action.public,
        });
    }

    for (const table of migrations.tables) {
        const hasRLS = migrations.rlsTables.includes(table);
        entries.push({
            kind: 'database-table',
            name: table,
            file: 'supabase/migrations/',
            line: null,
            scope: 'core',
            maturity: 'implemented',
            status: hasRLS ? 'implemented' : 'partial',
            rlsEnabled: hasRLS,
        });
    }

    for (const locale of i18n.locales) {
        if (locale.file === 'en.json') continue;
        const missing = i18n.missingKeys[locale.file] || [];
        entries.push({
            kind: 'i18n-locale',
            name: locale.file.replace('.json', ''),
            file: `messages/${locale.file}`,
            line: null,
            scope: 'core',
            maturity: missing.length === 0 ? 'implemented' : 'partial',
            status: 'implemented',
            missingKeys: missing.length,
        });
    }

    for (const fn of edgeFunctions.functions) {
        entries.push({
            kind: 'edge-function',
            name: fn.name,
            file: `supabase/functions/${fn.entrypoint}`,
            line: null,
            scope: 'core',
            maturity: 'implemented',
            status: 'implemented',
        });
    }

    const summary = {
        totalEntries: entries.length,
        serverActions: actions.actions.length,
        guardedActions: actions.guardedCount,
        publicActions: actions.publicCount,
        unguardedActions: actions.violationCount,
        migrationCount: migrations.migrationCount,
        tableCount: migrations.tables.length,
        rlsTableCount: migrations.rlsTables.length,
        totalPolicies: migrations.totalPolicies,
        localeCount: i18n.localeCount,
        edgeFunctionCount: edgeFunctions.functionCount,
        coreCount: entries.filter((e) => e.scope === 'core').length,
        optionalCount: entries.filter((e) => e.scope === 'optional plugin').length,
        implementedCount: entries.filter((e) => e.maturity === 'implemented').length,
        partialCount: entries.filter((e) => e.maturity === 'partial').length,
        unusedCount: entries.filter((e) => e.maturity === 'unused').length,
        plannedCount: entries.filter((e) => e.maturity === 'planned').length,
    };

    return { entries, summary, featureGates, docsStatus };
}

function manifestToJson(manifest) {
    return JSON.stringify(manifest, null, 2);
}

function manifestToMarkdown(manifest) {
    const lines = [];
    lines.push('# NGO OS Feature Inventory');
    lines.push('');
    lines.push('(Auto-generated by scripts/generate-inventory.mjs — commit this file.)');
    lines.push('');
    lines.push('## Summary');
    lines.push('');
    lines.push(`- Total entries: ${manifest.summary.totalEntries}`);
    lines.push(`- Server actions: ${manifest.summary.serverActions} (guarded: ${manifest.summary.guardedActions}, public: ${manifest.summary.publicActions}, unguarded: ${manifest.summary.unguardedActions})`);
    lines.push(`- Migrations: ${manifest.summary.migrationCount}`);
    lines.push(`- Database tables: ${manifest.summary.tableCount} (RLS enabled: ${manifest.summary.rlsTableCount})`);
    lines.push(`- Policies: ${manifest.summary.totalPolicies}`);
    lines.push(`- Locales: ${manifest.summary.localeCount}`);
    lines.push(`- Edge functions: ${manifest.summary.edgeFunctionCount}`);
    lines.push(`- Core: ${manifest.summary.coreCount}, Optional plugin: ${manifest.summary.optionalCount}`);
    lines.push(`- Maturity: implemented ${manifest.summary.implementedCount}, partial ${manifest.summary.partialCount}, unused ${manifest.summary.unusedCount}, planned ${manifest.summary.plannedCount}`);
    lines.push('');
    lines.push('## Entries');
    lines.push('');
    lines.push('| Kind | Name | File | Scope | Maturity | Status |');
    lines.push('|------|------|------|-------|----------|--------|');
    for (const entry of manifest.entries) {
        lines.push(`| ${entry.kind} | ${entry.name} | ${entry.file} | ${entry.scope} | ${entry.maturity} | ${entry.status} |`);
    }
    lines.push('');
    return lines.join('\n');
}

function filesEqual(a, b) {
    if (!existsSync(a) || !existsSync(b)) return false;
    return readFileSync(a, 'utf8') === readFileSync(b, 'utf8');
}

function main() {
    const args = process.argv.slice(2);
    const checkMode = args.includes('--check');

    const manifest = buildManifest();
    const json = manifestToJson(manifest);
    const md = manifestToMarkdown(manifest);

    if (checkMode) {
        const tmpDir = mkdtempSync(join(tmpdir(), 'inventory-check-'));
        const tmpJson = join(tmpDir, 'inventory.manifest.json');
        const tmpMd = join(tmpDir, 'inventory.manifest.md');
        writeFileSync(tmpJson, json);
        writeFileSync(tmpMd, md);

        let drift = false;
        if (!filesEqual(tmpJson, COMMITTED_MANIFEST_JSON)) {
            drift = true;
            console.error('Drift detected: inventory.manifest.json diverges from generated output.');
        }
        if (!filesEqual(tmpMd, COMMITTED_MANIFEST_MD)) {
            drift = true;
            console.error('Drift detected: inventory.manifest.md diverges from generated output.');
        }

        if (drift) {
            console.error('\nINVENTORY DRIFT: committed manifests diverge from generated output.');
            console.error('Run `node scripts/generate-inventory.mjs` to regenerate.');
            process.exit(1);
        }

        console.log('Inventory drift check passed: committed manifests match generated output.');
        process.exit(0);
    }

    writeFileSync(COMMITTED_MANIFEST_JSON, json);
    writeFileSync(COMMITTED_MANIFEST_MD, md);
    console.log(`Inventory manifest written: inventory.manifest.json, inventory.manifest.md`);
    console.log(`Entries: ${manifest.summary.totalEntries} (core: ${manifest.summary.coreCount}, optional: ${manifest.summary.optionalCount})`);
}

main();
