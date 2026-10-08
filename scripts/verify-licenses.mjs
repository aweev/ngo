#!/usr/bin/env node
/**
 * License policy gate (audit Wave 0, item 5).
 *
 * `pnpm licenses list --prod --json` groups every *production* dependency by
 * the SPDX expression it declares. This gate fails when a dependency carries a
 * license the project cannot ship under:
 *
 *   - network/strong copyleft: AGPL, GPL (LGPL is allowed and reviewed)
 *   - source-available: SSPL, BUSL/BSL
 *   - non-commercial: CC-BY-NC*
 *   - unresolved: UNLICENSED, UNKNOWN, "SEE LICENSE IN ..."
 *
 * SPDX expressions are evaluated properly: `A OR B` passes when at least one
 * branch is allowed, `A AND B` requires every branch to be allowed.
 *
 * Documented exceptions go in scripts/license-allowlist.json
 * (`{ "allow": ["<exact license expression>"] }`) — same pattern as the i18n
 * allowlist, so exceptions are explicit and reviewable.
 *
 * Run:  node scripts/verify-licenses.mjs
 * Exit: 0 = policy satisfied, 1 = violation
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_FILE = join(ROOT, 'scripts', 'license-allowlist.json');

/** Licenses that must never reach a production bundle. */
const DENIED = [
    /^a?gpl/i,                  // GPL / AGPL (LGPL starts with "L" and is allowed)
    /^sspl/i,                   // Server Side Public License
    /^(bsl|busl)/i,             // Business Source License
    /^cc-by-nc/i,               // non-commercial Creative Commons
    /^unlicensed$/i,
    /^unknown$/i,
    /^see license in/i,
];

function normalise(token) {
    return token.trim().replace(/^\(+/, '').replace(/\)+$/, '').trim();
}

function tokenAllowed(token) {
    const value = normalise(token);
    return value.length > 0 && !DENIED.some((pattern) => pattern.test(value));
}

function expressionAllowed(expression) {
    return expression
        .split(/\s+OR\s+/i)
        .some((branch) => branch.split(/\s+AND\s+/i).every((token) => tokenAllowed(token)));
}

const allowlist = existsSync(ALLOWLIST_FILE)
    ? new Set(JSON.parse(readFileSync(ALLOWLIST_FILE, 'utf8')).allow ?? [])
    : new Set();

/**
 * Runs `pnpm licenses list --prod --json` and returns the child-process
 * result. Windows resolves pnpm through a `.cmd` shim, which Node refuses to
 * spawn without a shell; on Windows the whole command is therefore passed as
 * one string (no args array) so no unescaped-argument warning is produced.
 */
function readLicenseReport() {
    const variants = process.platform === 'win32'
        ? [{ command: 'pnpm licenses list --prod --json', args: [], shell: true }]
        : [{ command: 'pnpm', args: ['licenses', 'list', '--prod', '--json'], shell: false }];

    for (const variant of variants) {
        const result = spawnSync(variant.command, variant.args, {
            cwd: ROOT,
            encoding: 'utf8',
            shell: variant.shell,
            maxBuffer: 64 * 1024 * 1024,
        });
        if (!result.error && (result.stdout ?? '').includes('{')) return result;
    }

    return null;
}

const result = readLicenseReport();
if (!result) {
    console.error('FAIL: could not run `pnpm licenses list`. Is pnpm on PATH?');
    process.exit(1);
}

const stdout = result.stdout ?? '';
const start = stdout.indexOf('{');
if (start === -1) {
    console.error('FAIL: `pnpm licenses list --prod --json` produced no JSON.');
    console.error(stdout.slice(0, 500));
    process.exit(1);
}

let grouped;
try {
    grouped = JSON.parse(stdout.slice(start));
} catch (err) {
    console.error('FAIL: could not parse the pnpm license report.', err.message);
    process.exit(1);
}

const violations = [];
let packagesChecked = 0;

for (const [expression, entries] of Object.entries(grouped)) {
    if (allowlist.has(expression)) continue;
    if (expressionAllowed(expression)) continue;

    for (const entry of entries ?? []) {
        packagesChecked += 1;
        const versions = Array.isArray(entry.versions) ? entry.versions.join(', ') : '';
        violations.push(`${entry.name}${versions ? `@${versions}` : ''} — ${expression}`);
    }
}

// Packages under allowed licenses are counted too, for an honest total.
for (const [expression, entries] of Object.entries(grouped)) {
    if (allowlist.has(expression) || expressionAllowed(expression)) {
        for (const entry of entries ?? []) {
            if (entry?.name) packagesChecked += 1;
        }
    }
}

console.log('Scan complete.');
console.log(`  License expressions : ${Object.keys(grouped).length}`);
console.log(`  Packages checked    : ${packagesChecked}`);
console.log(`  Policy violations   : ${violations.length}`);

for (const violation of violations.slice(0, 40)) {
    console.log(`  ✖ ${violation}`);
}
if (violations.length > 40) {
    console.log(`  … and ${violations.length - 40} more`);
}

if (violations.length > 0) {
    console.error('\nFAIL: production dependencies with a disallowed license.');
    console.error('Resolve or replace them, or add a reviewed exception to');
    console.error('scripts/license-allowlist.json.\n');
    process.exit(1);
}

console.log('\nOK: every production dependency carries an allowed license.');
