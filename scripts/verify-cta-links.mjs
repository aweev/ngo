#!/usr/bin/env node
/**
 * Programs Production Plan — item 1: "All links resolve under the correct
 * localized `public` routes."
 *
 * Static guarantee: every internal link target (Link href / href: / router.push /
 * router.replace / redirect) that points at a public route family —
 * /get-involved, /contact, /stories, /news, /programs, /campaigns — must carry
 * the `/public` route prefix, and /public/programs/<category> links must use
 * one of the four valid slugs (economic-empowerment, education, health,
 * social-integration — see src/lib/program-themes.ts).
 *
 * Exclusions:
 *  - src/proxy.ts (middleware matcher strings are regex fragments, not links)
 *  - non-code assets (.md / .json / generated API types) are not scanned
 *
 * Events: /[locale]/public/events (list) and /[locale]/public/events/[slug]
 * (detail) exist — '/events' is an enforced public route family.
 *
 * Run:  node scripts/verify-cta-links.mjs
 * Exit: 0 = all scanned CTA targets resolve; 1 = violation found
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SCAN_ROOTS = ['src/app', 'src/components', 'src/lib'];
const SKIP_FILES = new Set([
    'src/proxy.ts', // middleware matcher regex — not a link
]);

const PUBLIC_PREFIX = '/public';

// Internal route families that only exist under /[locale]/public/*.
const PUBLIC_ROUTE_FAMILIES = [
    '/get-involved',
    '/contact',
    '/stories',
    '/news',
    '/programs',
    '/campaigns',
    '/events',
];

// The only valid /public/programs/[category] slugs (src/lib/program-themes.ts).
const VALID_CATEGORY_SLUGS = new Set([
    'economic-empowerment',
    'education',
    'health',
    'social-integration',
]);

// Matches Link href={...} / href="..." / href: "..." / router.push(...) /
// router.replace(...) / redirect(...) string- and template-literal targets.
const LINK_TARGET_RE = /(?:href\s*=\s*\{?\s*|href\s*:\s*|push\s*\(\s*|replace\s*\(\s*|redirect\s*\(\s*)(['"`])([^'"`\n]*)\1/g;

function walk(dir, files = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) {
            walk(full, files);
        } else if (/\.(tsx?)$/.test(entry)) {
            files.push(full);
        }
    }
    return files;
}

function rel(file) {
    return relative(WORKSPACE, file).replaceAll('\\', '/');
}

function checkTarget(rawTarget) {
    // Only absolute in-app paths are interesting.
    if (!rawTarget.startsWith('/')) return null;

    // Cut off query/hash; for template literals, stop at the first interpolation.
    const cutpoints = [rawTarget.indexOf('?'), rawTarget.indexOf('#'), rawTarget.indexOf('${')]
        .filter((i) => i !== -1);
    const cut = cutpoints.length > 0 ? Math.min(...cutpoints) : Infinity;
    const path = Number.isFinite(cut) ? rawTarget.slice(0, cut) : rawTarget;

    // 1) Public route families must carry the /public prefix.
    const hitsFamily = PUBLIC_ROUTE_FAMILIES.some(
        (f) => path === f || path.startsWith(`${f}/`)
    );
    if (hitsFamily && !path.startsWith(PUBLIC_PREFIX)) {
        return `unprefixed public route: "${rawTarget}"`;
    }

    // 2) Program category links must use a valid slug.
    if (path.startsWith('/public/programs/')) {
        const slug = path.slice('/public/programs/'.length);
        if (slug && !VALID_CATEGORY_SLUGS.has(slug)) {
            return `invalid program category slug "${slug}"`;
        }
    }

    return null;
}

const files = SCAN_ROOTS.flatMap((root) => walk(join(WORKSPACE, root)));

let failures = 0;
let checked = 0;

for (const file of files.sort()) {
    if (SKIP_FILES.has(rel(file))) continue;
    const source = readFileSync(file, 'utf8');

    LINK_TARGET_RE.lastIndex = 0;
    let m;
    while ((m = LINK_TARGET_RE.exec(source)) !== null) {
        checked += 1;
        const problem = checkTarget(m[2]);
        if (problem) {
            const line = source.slice(0, m.index).split('\n').length;
            failures += 1;
            console.error(`  [VIOLATION]  ${rel(file)}:${line} — ${problem}`);
        }
    }
}

console.log('');
console.log('Scan complete.');
console.log(`  Link targets examined : ${checked}`);
console.log(`  CTA route resolution  : ${failures === 0 ? 'PASS' : `FAIL (${failures} violation(s))`}`);

if (failures > 0) {
    console.error('\nCTA link verification FAILED. Fix the violations above (all public routes live under /public).');
    process.exit(1);
}

console.log('\nOK: every scanned CTA target resolves to a real /public route with a valid category slug.');