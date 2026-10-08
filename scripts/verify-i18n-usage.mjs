#!/usr/bin/env node
/**
 * i18n usage gate.
 *
 * The other two i18n gates prove their halves of the contract:
 *   - verify-i18n.mjs          every locale defines the same key set as en.json
 *   - verify-i18n-hardcoded.mjs no UI copy is bypassing next-intl
 *
 * This gate proves the third: every key the code actually asks for EXISTS in
 * en.json. A missing key renders as a raw id at runtime (and next-intl throws
 * in development), so drift must fail CI.
 *
 * It resolves the namespace per translation function:
 *   const t = useTranslations("Admin.Forms.builder");   -> t("name_label")
 *   const t = await getTranslations("Auth.Login");      -> t("title")
 * then looks `namespace.key` up in messages/en.json.
 *
 * Dynamic keys (template literals / computed) are counted as skipped, not
 * failures — they are a deliberate pattern for enum-driven copy.
 *
 * Run:  node scripts/verify-i18n-usage.mjs
 * Exit: 0 = every referenced key exists, 1 = missing key(s)
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Surfaces that must resolve their copy through next-intl. */
const SCAN_DIRS = [
    'src/app',
    'src/components',
    'src/lib',
];

const messages = JSON.parse(readFileSync(join(ROOT, 'messages', 'en.json'), 'utf8'));

/** Walks a dot path ("Admin.Forms.builder.title") through the message tree. */
function hasPath(path) {
    let node = messages;
    for (const part of path.split('.')) {
        if (node === null || typeof node !== 'object') return false;
        node = node[part];
    }
    return node !== undefined;
}

function walk(dir, out = []) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const stat = statSync(full);
        if (stat.isDirectory()) walk(full, out);
        else if (/\.(tsx?|mts)$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
    }
    return out;
}

/**
 * Finds `const <name> = (await )?use?[gG]etTranslations("NS")` bindings.
 * `useTranslations()` with no namespace is ignored (keys are absolute there).
 */
function findBindings(source) {
    const bindings = new Map(); // varName -> namespace
    const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:use|get)Translations\s*\(\s*["']([^"']+)["']\s*(?:,[^)]*)?\)/g;
    let m;
    while ((m = re.exec(source)) !== null) bindings.set(m[1], m[2]);
    return bindings;
}

const files = SCAN_DIRS.flatMap((dir) => {
    const abs = join(ROOT, dir);
    return existsSync(abs) ? walk(abs) : [];
});

const missing = [];
const exempt = [];
let checked = 0;
let skipped = 0;

for (const file of files) {
    const rel = relative(ROOT, file).split('\\').join('/');
    const source = readFileSync(file, 'utf8');
    const bindings = findBindings(source);
    if (bindings.size === 0) continue;

    const lines = source.split(/\r?\n/);

    for (const [varName, namespace] of bindings) {
        // Matches t("key"), t.rich("key"), t.markup("key"), t.raw("key").
        const callRe = new RegExp(`\\b${varName}(?:\\.(?:rich|markup|raw|has))?\\s*\\(\\s*(["'\`])([^"'\`]*)\\1`, 'g');
        let m;
        while ((m = callRe.exec(source)) !== null) {
            const key = m[2];
            const line = source.slice(0, m.index).split('\n').length;
            const lineText = lines[line - 1] ?? '';
            if (lineText.includes('i18n-exempt')) {
                exempt.push({ rel, line, key });
                continue;
            }
            if (key === '' || key.includes('${')) {
                skipped += 1;
                continue;
            }
            checked += 1;
            const path = key.includes('.') && hasPath(`${namespace}.${key}`) === false && hasPath(key)
                ? key
                : `${namespace}.${key}`;
            if (!hasPath(path)) missing.push({ rel, line, path });
        }
    }
}

console.log('');
console.log('Scan complete.');
console.log(`  Files scanned            : ${files.length}`);
console.log(`  Translation calls checked: ${checked}`);
console.log(`  Dynamic keys (skipped)   : ${skipped}`);
console.log(`  Missing keys             : ${missing.length}`);

if (missing.length > 0) {
    console.error('');
    for (const entry of missing.slice(0, 80)) {
        console.error(`  [MISSING] ${entry.rel}:${entry.line} -> "${entry.path}"`);
    }
    if (missing.length > 80) console.error(`  … and ${missing.length - 80} more`);
    console.error('\ni18n usage verification FAILED. Add the missing keys to messages/en.json (and every locale).');
    process.exit(1);
}

console.log(`\nOK: every referenced translation key exists in all locales.`);
