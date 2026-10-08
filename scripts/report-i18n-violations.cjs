#!/usr/bin/env node
/**
 * Reporting companion to scripts/verify-i18n-hardcoded.mjs.
 *
 * The gate caps its console output at 60 entries; this script prints the FULL
 * list, grouped by file, so a sweep can be planned. Same rules, same escape
 * hatches -- read-only, never exits non-zero on violations.
 *
 * Run:  node scripts/report-i18n-violations.cjs [--files-only]
 */
const { readdirSync, readFileSync, statSync, existsSync } = require('node:fs');
const { join, relative, dirname } = require('node:path');

const ROOT = join(__dirname, '..');
const filesOnly = process.argv.includes('--files-only');

const SCAN_DIRS = [
  'src/app/[locale]/admin',
  'src/app/[locale]/dashboard',
  'src/components/admin',
  'src/components/manage',
  'src/components/layout/admin',
  'src/components/layout/dashboard',
];

const NON_COPY = [
  /^[a-z0-9_]+$/,
  /^#[0-9a-f]{3,8}$/i,
  /^https?:\/\//i,
  /^\/[a-z0-9[\]:/-]*$/i,
  /^\d+([.,]\d+)?%?$/,
  /^[\w.+-]+@[\w.-]+$/,
  /^[A-Z]{2,4}$/,
  /^\s*$/,
];

const RULES = [
  { name: 'jsx-attr', re: /\b(title|description|placeholder|aria-label|alt)=["']([^"']{2,})["']/g, value: (m) => m[2] },
  { name: 'jsx-text', re: />\s*([A-Z][A-Za-z][^<>{}]{2,}?)\s*</g, value: (m) => m[1], test: (v) => v.trim().split(/\s+/).length >= 2 },
  { name: 'obj-label', re: /\b(label|title|description|placeholder|emptyTitle|emptyDescription|searchPlaceholder)\s*:\s*["']([^"']{3,})["']/g, value: (m) => m[2] },
  { name: 'toast', re: /toast\.(?:error|success|info|warning|message)\(\s*["']([^"']{3,})["']/g, value: (m) => m[1] },
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

const files = SCAN_DIRS.flatMap((dir) => {
  const abs = join(ROOT, dir);
  return existsSync(abs) ? walk(abs) : [];
});

const byFile = new Map();

for (const file of files) {
  const rel = relative(ROOT, file).split('\\').join('/');
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (line.includes('i18n-exempt')) return;
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) return;
    for (const rule of RULES) {
      rule.re.lastIndex = 0;
      let match;
      while ((match = rule.re.exec(line)) !== null) {
        const value = (rule.value(match) ?? '').trim();
        if (!value || NON_COPY.some((re) => re.test(value))) continue;
        if (!/[A-Za-z]/.test(value)) continue;
        if (!/^[A-Z]/.test(value)) continue;
        if (rule.test && !rule.test(value)) continue;
        if (!byFile.has(rel)) byFile.set(rel, []);
        byFile.get(rel).push({ line: idx + 1, rule: rule.name, value });
      }
    }
  });
}

const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
const total = sorted.reduce((n, [, v]) => n + v.length, 0);

console.log(`FILES WITH VIOLATIONS: ${sorted.length}`);
console.log(`TOTAL VIOLATIONS: ${total}`);
console.log('');
for (const [file, entries] of sorted) {
  console.log(`${String(entries.length).padStart(4)}  ${file}`);
  if (!filesOnly) for (const e of entries) console.log(`        ${e.line} (${e.rule}) -> "${e.value}"`);
}
