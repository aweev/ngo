#!/usr/bin/env node
/**
 * Hardcoded-English gate.
 *
 * The i18n parity gate (verify-i18n.mjs) proves every message key exists in
 * every locale. This gate proves the *other* half: that admin/dashboard UI
 * does not bypass next-intl with literal English strings.
 *
 * It scans the member + admin surfaces and flags:
 *   - visible JSX attributes: title=, description=, placeholder=, aria-label=, alt=
 *   - JSX text nodes with 2+ words (e.g. <p>No workers found</p>)
 *   - object literals used as UI labels: label: "...", title: "...", emptyTitle: ...
 *   - toast.*("...") calls with an English literal
 *
 * Escape hatch: add `// i18n-exempt: <reason>` on the line, or list the file in
 * scripts/i18n-hardcoded-allowlist.json while a sweep is still in progress
 * (allowlisted files are reported as PENDING and do not fail the gate).
 *
 * Run:  node scripts/verify-i18n-hardcoded.mjs
 * Exit: 0 = no violations outside the allowlist, 1 = violation(s)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Directories that must be fully translated (member + admin surfaces). */
const SCAN_DIRS = [
    'src/app/[locale]/admin',
    'src/app/[locale]/dashboard',
    'src/components/admin',
    'src/components/manage',
    'src/components/layout/admin',
    'src/components/layout/dashboard',
];

const ALLOWLIST_FILE = join(ROOT, 'scripts', 'i18n-hardcoded-allowlist.json');

/** Values that are never user-visible copy and must not be flagged. */
const NON_COPY = [
    /^[a-z0-9_]+$/,                     // slugs, enum values, ids
    /^#[0-9a-f]{3,8}$/i,                // colors
    /^https?:\/\//i,                    // urls
    /^\/[a-z0-9[\]:/-]*$/i,             // routes
    /^\d+([.,]\d+)?%?$/,                // numbers
    /^[\w.+-]+@[\w.-]+$/,               // emails
    /^[A-Z]{2,4}$/,                     // locale/currency codes
    /^\s*$/,                            // blank
];

const RULES = [
    {
        name: 'jsx-attr',
        re: /\b(title|description|placeholder|aria-label|alt)=["']([^"']{2,})["']/g,
        value: (m) => m[2],
    },
    {
        name: 'jsx-text',
        re: />\s*([A-Z][A-Za-z][^<>{}]{2,}?)\s*</g,
        value: (m) => m[1],
        test: (v) => v.trim().split(/\s+/).length >= 2,
    },
    {
        name: 'obj-label',
        re: /\b(label|title|description|placeholder|emptyTitle|emptyDescription|searchPlaceholder)\s*:\s*["']([^"']{3,})["']/g,
        value: (m) => m[2],
    },
    {
        name: 'toast',
        re: /toast\.(?:error|success|info|warning|message)\(\s*["']([^"']{3,})["']/g,
        value: (m) => m[1],
    },
];

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) walk(full, out);
        else if (/\.tsx?$/.test(entry)) out.push(full);
    }
    return out;
}

const allowlist = existsSync(ALLOWLIST_FILE)
    ? new Set(JSON.parse(readFileSync(ALLOWLIST_FILE, 'utf8')).pending ?? [])
    : new Set();

const files = SCAN_DIRS.flatMap((dir) => {
    const abs = join(ROOT, dir);
    return existsSync(abs) ? walk(abs) : [];
});

const violations = [];
const pending = [];

for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    const isPending = allowlist.has(rel);
    const lines = readFileSync(file, 'utf8').split(/\r?\n/);

    lines.forEach((line, idx) => {
        if (line.includes('i18n-exempt')) return;
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;

        for (const rule of RULES) {
            rule.re.lastIndex = 0;
            let match;
            while ((match = rule.re.exec(line)) !== null) {
                const raw = rule.value(match);
                const value = (raw ?? '').trim();
                if (!value || NON_COPY.some((re) => re.test(value))) continue;
                if (!/[A-Za-z]/.test(value)) continue;
                if (!/^[A-Z]/.test(value)) continue;         // copy starts capitalized
                if (rule.test && !rule.test(value)) continue;

                const entry = { file: rel, line: idx + 1, rule: rule.name, value };
                (isPending ? pending : violations).push(entry);
            }
        }
    });
}

function report(title, entries) {
    for (const e of entries) {
        console.error(`  [${title}] ${e.file}:${e.line} (${e.rule}) -> "${e.value}"`);
    }
}

console.log('');
console.log('Scan complete.');
console.log(`  Files scanned            : ${files.length}`);
console.log(`  Allowlisted (pending)    : ${allowlist.size}`);
console.log(`  Pending violations       : ${pending.length}`);
console.log(`  Blocking violations      : ${violations.length}`);

if (violations.length > 0) {
    console.error('');
    report('FAIL', violations.slice(0, 60));
    if (violations.length > 60) console.error(`  … and ${violations.length - 60} more`);
    console.error('\nHardcoded UI text detected outside the allowlist. Move it into messages/*.json and read it via next-intl.');
    process.exit(1);
}

if (pending.length > 0) {
    console.log('');
    console.log('  Allowlisted files still containing literals (sweep backlog):');
    const byFile = new Map();
    for (const e of pending) byFile.set(e.file, (byFile.get(e.file) ?? 0) + 1);
    for (const [file, count] of [...byFile.entries()].sort()) console.log(`    ${file} (${count})`);
}

console.log('');
console.log('OK: no hardcoded UI strings outside the allowlist.');
