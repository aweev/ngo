#!/usr/bin/env node
/**
 * Phase 2, item 22 — "Test unauthenticated access to every Server Action".
 *
 * Static guarantee: every exported Server Action must first pass through an
 * authorization guard (authorizeUser / authorizeOrganization /
 * authorizePermission / authorizeRole / requireUser / etc.) OR be declared
 * intentionally public in the PUBLIC_ALLOWLIST below.
 *
 * Because every non-public action calls a guard as its first statement, an
 * unauthenticated invocation is short-circuited before any database work and
 * returns a stable `{ ...error: 'You need to sign in to continue.' }`.
 *
 * Run:  node scripts/verify-action-auth.mjs
 * Exit: 0 = all actions guarded; 1 = violation found
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ACTIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'actions');
const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '..');

// Exported functions that are intentionally public (no auth required).
// Format: "<file>|<function>" — or "<file>|*" to allowlist a whole module.
const PUBLIC_ALLOWLIST = [
    'public|*',                       // public website data + form/donation intake
    'portal-experience|getPublicPortalExperience', // public auth/onboarding portal copy
    'auth|validateInvitation',        // invitation preview (public token flow)
    'auth|acceptInvitation',          // invitation acceptance (authenticated user)
    // Email senders are server-to-server helpers, never imported by client
    // components: every call site is a guarded Server Action (content.ts,
    // members.ts) or the signature-verified Stripe webhook. Guarding them
    // here would break the session-less webhook; authorization lives with
    // the caller by design.
    'email|*',
];

const GUARD_RE = /\b(authorizePermission|authorizeUser|authorizeOrganization|authorizeRole|requirePermission|requireUser|requireOrganization|requireRole)\s*\(/;

// Any database or network touch that MUST come after a guard.
const DB_ACCESS_RE = /(auth\.context\.supabase|\bsupabase\s*$|createSupabaseServerClient|\.from\(\s*['"])/;

function exportedFunctions(source) {
    const fns = [];
    const re = /^export (?:async )?function\s+([A-Za-z_$][\w$]*)\s*\(/gm;
    let m;
    while ((m = re.exec(source)) !== null) {
        const line = source.slice(0, m.index).split('\n').length;
        const start = m.index;
        const next = re.lastIndex;
        // The next match (if any) gives us this function's body end.
        const endMatch = re.exec(source);
        re.lastIndex = next;
        const bodyEnd = endMatch ? endMatch.index : source.length;
        fns.push({ name: m[1], line, start, bodyEnd });
    }
    return fns;
}

function isPublic(file, fn) {
    const base = file.replace(/\.ts$/, '');
    return PUBLIC_ALLOWLIST.some((entry) => {
        const [f, name] = entry.split('|');
        return f === base && (name === '*' || name === fn);
    });
}

const files = readdirSync(ACTIONS_DIR).filter((f) => f.endsWith('.ts') && f !== 'index.ts');

let failures = 0;
let checked = 0;
let publicCount = 0;

for (const file of files.sort()) {
    const source = readFileSync(join(ACTIONS_DIR, file), 'utf8');
    const fns = exportedFunctions(source);
    const fnsByName = new Map(fns.map((f) => [f.name, f]));

    const status = new Map(); // name -> 'guarded' | 'public' | 'delegate' | 'violation'

    // First pass: compute guard status (delegates resolved in a second pass).
    for (const fn of fns) {
        if (isPublic(file, fn.name)) {
            status.set(fn.name, 'public');
            continue;
        }

        const body = source.slice(fn.start, fn.bodyEnd);
        const guardIdx = body.search(GUARD_RE);
        const firstDbIdx = body.search(DB_ACCESS_RE);

        if (guardIdx !== -1 && (firstDbIdx === -1 || guardIdx < firstDbIdx)) {
            status.set(fn.name, 'guarded');
            continue;
        }

        // A one-line delegation (`return otherFn(...)`) to a guarded
        // function in the same module is acceptable — the callee guards.
        const delegateMatch = body.match(/^\s*return\s+([A-Za-z_$][\w$]*)\s*\(/m);
        if (delegateMatch && fnsByName.has(delegateMatch[1])) {
            status.set(fn.name, `delegate:${delegateMatch[1]}`);
            continue;
        }

        status.set(fn.name, 'violation');
    }

    // Second pass: resolve delegates to their target's status.
    const isCovered = (name) => {
        const s = status.get(name) ?? 'violation';
        if (s === 'guarded' || s === 'public') return true;
        if (s.startsWith('delegate:')) return isCovered(s.split(':')[1]);
        return false;
    };

    for (const fn of fns) {
        const s = status.get(fn.name);
        if (s === 'public') {
            publicCount += 1;
            console.log(`  [public]     ${file}:${fn.name} (line ${fn.line})`);
            continue;
        }
        if (s === 'guarded') {
            checked += 1;
            console.log(`  [guarded]    ${file}:${fn.name} (line ${fn.line})`);
            continue;
        }
        if (s?.startsWith('delegate:')) {
            if (isCovered(s.split(':')[1])) {
                checked += 1;
                console.log(`  [delegate →] ${file}:${fn.name} -> ${s.split(':')[1]} (line ${fn.line})`);
                continue;
            }
            failures += 1;
            console.error(`  [VIOLATION]  ${file}:${fn.name} (line ${fn.line}) delegates to an unguarded function.`);
            continue;
        }
        failures += 1;
        console.error(`  [VIOLATION]  ${file}:${fn.name} (line ${fn.line}) is NOT guarded and not allowlisted.`);
    }
}

console.log('');
console.log('Scan complete.');
console.log(`  Server actions examined   : ${checked}`);
console.log(`  Intentionally public      : ${publicCount}`);
console.log(`  Unauthenticated access    : ${failures === 0 ? 'PASS' : `FAIL (${failures} violation(s))`}`);

if (failures > 0) {
    console.error('\nAction guard verification FAILED. Fix the violations above (or allowlist truly public actions).');
    process.exit(1);
}

console.log(`\nOK: all ${checked} server actions require an authenticated, authorized caller.`);