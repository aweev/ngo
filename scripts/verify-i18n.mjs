#!/usr/bin/env node
/**
 * i18n parity gate — every messages/*.json must define the same key set as
 * messages/en.json (the source of truth). Missing keys render as raw IDs at
 * runtime, and next-intl throws in dev, so drift must fail CI.
 *
 * Run:  node scripts/verify-i18n.mjs
 * Exit: 0 = all locales match, 1 = key mismatch
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MESSAGES_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');

function flatten(obj, prefix = '') {
    return Object.entries(obj).flatMap(([k, v]) =>
        v !== null && typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [`${prefix}${k}`],
    );
}

const files = readdirSync(MESSAGES_DIR).filter((f) => f.endsWith('.json')).sort();
if (!files.includes('en.json')) {
    console.error('en.json (source of truth) not found in messages/.');
    process.exit(1);
}

const baseKeys = new Set(flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, 'en.json'), 'utf8'))));
let failures = 0;

for (const f of files) {
    if (f === 'en.json') {
        console.log(`  [base] ${f} (${baseKeys.size} keys)`);
        continue;
    }
    const keys = new Set(flatten(JSON.parse(readFileSync(join(MESSAGES_DIR, f), 'utf8'))));
    const missing = [...baseKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !baseKeys.has(k));
    if (missing.length === 0 && extra.length === 0) {
        console.log(`  [OK]   ${f} (${keys.size} keys)`);
        continue;
    }
    failures += missing.length + extra.length;
    console.error(`  [MISMATCH] ${f}: ${missing.length} missing, ${extra.length} extra`);
    for (const k of missing.slice(0, 10)) console.error(`    missing: ${k}`);
    if (missing.length > 10) console.error(`    … and ${missing.length - 10} more`);
    for (const k of extra.slice(0, 10)) console.error(`    extra:   ${k}`);
    if (extra.length > 10) console.error(`    … and ${extra.length - 10} more`);
}

console.log('');
console.log('Scan complete.');
console.log(`  Locales examined : ${files.length}`);
console.log(`  i18n parity      : ${failures === 0 ? 'PASS' : `FAIL (${failures} key mismatch(es))`}`);

if (failures > 0) {
    console.error('\ni18n verification FAILED. Add the missing keys (or remove the extras) so every locale matches en.json.');
    process.exit(1);
}

console.log(`\nOK: all ${files.length - 1} non-English locales match en.json key-for-key.`);
