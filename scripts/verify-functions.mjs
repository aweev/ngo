#!/usr/bin/env node
/**
 * Type-checks the Deno Edge Functions in `supabase/functions`.
 *
 * They are excluded from the Next.js `tsconfig.json` (they run on Deno), so
 * without this gate nothing parses them. That gap shipped a real outage: a doc
 * block that was never closed swallowed notification-dispatcher's `import`
 * statements, leaving every helper undefined at runtime.
 *
 * The real `deno check` is authoritative (Deno's lib + the JSR import map), and
 * CI installs Deno so it always takes that path. When Deno is unavailable
 * locally the script falls back to `tsc -p tsconfig.functions.json` plus the
 * minimal `deno-edge-shim.d.ts` declarations, which still catches broken
 * imports, typos and undefined names. Set REQUIRE_DENO=1 (CI does) to turn a
 * missing Deno into a hard failure instead of a silent downgrade.
 *
 * Exit: 0 = type check passed, 1 = failure.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const functionsDir = join(root, 'supabase', 'functions');

function findDeno() {
    if (process.env.DENO_BIN && existsSync(process.env.DENO_BIN)) return process.env.DENO_BIN;
    const candidates = [
        '/opt/deno/bin/deno',
        process.env.HOME ? join(process.env.HOME, '.deno', 'bin', 'deno') : null,
    ].filter(Boolean);
    for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
    }
    const probe = spawnSync('deno', ['--version'], { encoding: 'utf8' });
    if (!probe.error && probe.status === 0) return 'deno';
    return null;
}

/** Every function directory that has an index.ts (skips `_shared`). */
function entrypoints() {
    return readdirSync(functionsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
        .map((entry) => `${entry.name}/index.ts`)
        .filter((rel) => existsSync(join(functionsDir, rel)))
        .sort();
}

const files = entrypoints();
if (files.length === 0) {
    console.error(`No edge function entrypoints found under ${functionsDir}.`);
    process.exit(1);
}

const deno = findDeno();

if (deno) {
    console.log(`deno check on ${files.length} function(s): ${files.join(', ')}`);
    const result = spawnSync(
        deno,
        ['check', '--quiet', '--config', 'deno.json', ...files],
        { cwd: functionsDir, stdio: 'inherit' },
    );
    if (result.error) {
        console.error('Failed to run deno:', result.error.message);
        process.exit(1);
    }
    if (result.status !== 0) {
        console.error('\nFAILED: deno check reported errors (see above).');
        process.exit(result.status ?? 1);
    }
    console.log('\nOK: deno check passed for every edge function.');
    process.exit(0);
}

if (process.env.REQUIRE_DENO === '1') {
    console.error('REQUIRE_DENO=1 but no `deno` binary was found.');
    console.error('Install Deno first (CI uses denoland/setup-deno), or point DENO_BIN at it.');
    process.exit(1);
}

console.log('deno not found — falling back to tsc (tsconfig.functions.json + deno-edge-shim.d.ts).');
const tscBin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
const result = spawnSync(
    existsSync(tscBin) ? tscBin : 'tsc',
    ['-p', 'tsconfig.functions.json'],
    { cwd: root, stdio: 'inherit' },
);
if (result.error) {
    console.error('Failed to run tsc:', result.error.message);
    process.exit(1);
}
if (result.status !== 0) {
    console.error('\nFAILED: the tsc fallback reported errors (see above).');
    process.exit(result.status ?? 1);
}
console.log('\nOK: tsc fallback passed for every edge function (install Deno for the authoritative check).');
process.exit(0);