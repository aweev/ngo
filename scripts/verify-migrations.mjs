#!/usr/bin/env node
/**
 * verify-migrations.mjs - static verification for supabase/migrations
 *
 * Linux/macOS-safe port of verify-migrations.ps1 (CI runs on Ubuntu).
 * Usage: node scripts/verify-migrations.mjs      Exit: 0 = pass, 1 = fail
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations');
const archiveDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'archive');

let files = [];
try {
  files = readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
} catch { /* read failed below */ }
if (files.length === 0) { console.error('NO MIGRATION FILES'); process.exit(1); }
console.log('MIGRATION FILES: ' + files.length);

const issues = [];

// 1. Filename sequence integrity
const nums = [];
for (const name of files) {
  const m = name.match(/^202401010000(\d\d)_/);
  const tm = name.match(/^20\d{12}_/);
  if (m) nums.push(parseInt(m[1], 10));
  else if (!tm) issues.push('BADNAME ' + name);
}
const maxN = nums.length ? Math.max(...nums) : 0;
for (let n = 1; n <= maxN; n++) if (!nums.includes(n)) issues.push('GAP migration ' + n);
if (new Set(nums).size !== nums.length) issues.push('DUPLICATE migration numbers');

function stripComments(raw) {
  return raw.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/--[^\r\n]*/g, ' ');
}
function blankBodies(clean) {
  let last = 0, out = '';
  const re = /\$\$[\s\S]*?\$\$/g;
  let m;
  while ((m = re.exec(clean)) !== null) {
    out += clean.slice(last, m.index) + 'x'.repeat(m[0].length);
    last = m.index + m[0].length;
  }
  return out + clean.slice(last);
}

const createdTables = {}, createdViews = {}, createdFuncs = {};
const allTables = [], allViews = [], allFuncs = [];
const createEvents = [];
let totalPolicies = 0, totalTriggers = 0, totalIndexes = 0;

for (const name of files) {
  const pre = issues.length;
  let no = '??';
  const nm = name.match(/^202401010000(\d\d)_/);
  if (nm) no = nm[1];
  else if (name.length >= 8) no = name.slice(0, 8);

  const raw = readFileSync(join(migrationsDir, name), 'utf8');
  const clean = stripComments(raw);
  const nobody = blankBodies(clean);

  const sq = (clean.match(/'/g) || []).length;
  const dq = (clean.match(/"/g) || []).length;
  const dd = (clean.match(/\$\$/g) || []).length;
  if (sq % 2 === 1) issues.push(`${no} odd-single-quotes ${sq}`);
  if (dq % 2 === 1) issues.push(`${no} odd-double-quotes ${dq}`);
  if (dd % 2 === 1) issues.push(`${no} odd-dollar-dollar ${dd}`);
  const ph = (raw.match(/\b(TODO|FIXME|HACK|PLACEHOLDER|XXX)\b/gi) || []).length;
  if (ph > 0) issues.push(`${no} placeholders ${ph}`);
  const b = (clean.match(/^BEGIN\s*;/gim) || []).length;
  const cm = (clean.match(/^COMMIT\s*;/gim) || []).length;
  if (b !== cm) issues.push(`${no} txn begin=${b} commit=${cm}`);
  if (!raw.endsWith('\n')) issues.push(`${no} missing-trailing-eol`);
  let run = 0, maxRun = 0;
  for (const ch of clean) {
    if (ch === "'") { run++; if (run > maxRun) maxRun = run; } else run = 0;
  }
  if (maxRun > 4) issues.push(`${no} max-quote-run ${maxRun}`);

  const tablesHere = {}, viewsHere = {}, funcsHere = {};

  for (const m of nobody.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    const r = m[1].toLowerCase();
    tablesHere[r] = true; allTables.push(r);
    createEvents.push({ key: 'T:' + r, kind: 'C' });
  }
  for (const m of nobody.matchAll(/\bCREATE\s+(?:OR\s+REPLACE\s+)?(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    const r = m[1].toLowerCase();
    viewsHere[r] = true; allViews.push(r);
    createEvents.push({ key: 'V:' + r, kind: 'C' });
  }
  for (const m of nobody.matchAll(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    const r = m[1].toLowerCase();
    funcsHere[r] = true; allFuncs.push(r);
    createEvents.push({ key: 'F:' + r, kind: 'C' });
  }
  for (const m of nobody.matchAll(/\bDROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    createEvents.push({ key: 'T:' + m[1].toLowerCase(), kind: 'D' });
  }
  for (const m of nobody.matchAll(/\bDROP\s+(?:MATERIALIZED\s+)?VIEW\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    createEvents.push({ key: 'V:' + m[1].toLowerCase(), kind: 'D' });
  }
  for (const m of nobody.matchAll(/\bDROP\s+FUNCTION\s+(?:IF\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    createEvents.push({ key: 'F:' + m[1].toLowerCase(), kind: 'D' });
  }

  totalPolicies += (nobody.match(/\bCREATE\s+POLICY\b/gi) || []).length;
  totalTriggers += (nobody.match(/\bCREATE\s+TRIGGER\b/gi) || []).length;
  totalIndexes += (nobody.match(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\b/gi) || []).length;

  const okTable = (r, pos) => {
    if (createdTables[r] || tablesHere[r]) return true;
    issues.push(`${no} references missing table "${r}" (idx=${pos})`);
    return false;
  };

  for (const m of nobody.matchAll(/\bALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?(?:ONLY\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) okTable(m[1].toLowerCase(), m.index);
  for (const m of nobody.matchAll(/\bCREATE\s+(?:UNIQUE\s+)?INDEX\s+(?:IF\s+NOT\s+EXISTS\s+)?[^\s(]+\s+ON\s+(?:ONLY\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) okTable(m[1].toLowerCase(), m.index);
  for (const m of nobody.matchAll(/\bREFERENCES\s+(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) okTable(m[1].toLowerCase(), m.index);
  for (const m of nobody.matchAll(/\bCREATE\s+POLICY\s+[^\s]+\s+ON\s+(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) okTable(m[1].toLowerCase(), m.index);
  for (const m of nobody.matchAll(/\bENABLE\s+(?:ROW\s+LEVEL\s+SECURITY|REPLICA)\s+ON\s+(?:TABLE\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) okTable(m[1].toLowerCase(), m.index);

  for (const k of Object.keys(tablesHere)) createdTables[k] = true;
  for (const k of Object.keys(viewsHere)) createdViews[k] = true;
  for (const k of Object.keys(funcsHere)) createdFuncs[k] = true;

  const newIssues = issues.length - pre;
  console.log(`${name} quotes[s=${sq % 2 === 0} d=${dq % 2 === 0} dd=${dd % 2 === 0}] ph=${ph} txn=${b}/${cm} run=${maxRun} newissues=${newIssues}`);
}

// Cross-file duplicate detection
const dupTables = allTables.filter((t, i) => allTables.indexOf(t) !== i);
if (dupTables.length) issues.push('DUP-TABLES ' + [...new Set(dupTables)].join(','));
const dupViews = allViews.filter((v, i) => allViews.indexOf(v) !== i);
if (dupViews.length) issues.push('DUP-VIEWS ' + [...new Set(dupViews)].join(','));
const dupFuncs = allFuncs.filter((f, i) => allFuncs.indexOf(f) !== i);
if (dupFuncs.length) console.log('DUP-FUNCS info: ' + [...new Set(dupFuncs)].join(' '));

// Recreate-without-drop
const grouped = {};
for (const ev of createEvents) {
  (grouped[ev.key] = grouped[ev.key] || []).push(ev.kind);
}
for (const [key, kinds] of Object.entries(grouped)) {
  if (key.startsWith('F:')) continue;
  const creates = kinds.filter((k) => k === 'C').length;
  const drops = kinds.filter((k) => k === 'D').length;
  if (creates > 1 && drops < creates - 1) issues.push('RECREATE-NO-DROP ' + key);
}

console.log(
  `INVENTORY tables=${allTables.length}/${Object.keys(createdTables).length} ` +
  `views=${allViews.length}/${Object.keys(createdViews).length} ` +
  `funcs=${allFuncs.length}/${Object.keys(createdFuncs).length} ` +
  `policies=${totalPolicies} triggers=${totalTriggers} indexes=${totalIndexes}`
);

// Legacy archive parity
let legacyTables = {}, legacyFuncs = {};
let legacyFiles = [];
try {
  legacyFiles = readdirSync(archiveDir).filter((f) => /^(schema.*|fix.*)\.sql$/i.test(f));
} catch { /* no archive dir */ }
for (const lf of legacyFiles) {
  const clean = stripComments(readFileSync(join(archiveDir, lf), 'utf8'));
  for (const m of clean.matchAll(/\bCREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    legacyTables[m[1].toLowerCase()] = true;
  }
  for (const m of clean.matchAll(/\bCREATE\s+(?:OR\s+REPLACE\s+)?FUNCTION\s+(?:public\.)?([a-z_][a-z0-9_]*)(?![\w.])/gi)) {
    legacyFuncs[m[1].toLowerCase()] = true;
  }
}
const missingTables = Object.keys(legacyTables).filter((k) => !createdTables[k]);
if (missingTables.length) issues.push('LEGACY-TABLE-NOT-MIGRATED ' + missingTables.join(','));
const missingFuncs = Object.keys(legacyFuncs).filter((k) => !createdFuncs[k]);
if (missingFuncs.length) issues.push('LEGACY-FUNC-NOT-MIGRATED ' + missingFuncs.join(','));
console.log(`LEGACY files=${legacyFiles.length} tables=${Object.keys(legacyTables).length} funcs=${Object.keys(legacyFuncs).length} not-migrated tables=${missingTables.length} funcs=${missingFuncs.length}`);

console.log('ISSUES: ' + issues.length);
for (const i of issues) console.log(' ! ' + i);
if (issues.length === 0) {
  console.log('VERDICT: STATIC VERIFICATION PASSED');
  process.exit(0);
}
console.log('VERDICT: STATIC VERIFICATION FAILED');
process.exit(1);
