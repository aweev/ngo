#!/usr/bin/env node
/**
 * Seed the four staff personas (owner / admin / manager / member) for local
 * development and end-to-end role testing.
 *
 * Creates confirmed auth users (or reuses existing ones by email), links each
 * to the target organization with the matching role, and prints the login
 * table. Idempotent — safe to re-run.
 *
 * Usage:
 *   node scripts/seed-personas.mjs --confirm [--org <org-id>] [--domain awe.local]
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY in .env.local (server-only, never shipped).
 * The --confirm flag is deliberate: this writes real users to the linked project.
 */
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '..');

const PERSONAS = [
    { role: 'owner', user: 'owner' },
    { role: 'admin', user: 'admin' },
    { role: 'manager', user: 'manager' },
    { role: 'member', user: 'member' },
];
const PASSWORD = 'AweLocal123!';

function loadEnv() {
    const env = {};
    try {
        for (const line of readFileSync(join(WORKSPACE, '.env.local'), 'utf8').split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const idx = trimmed.indexOf('=');
            if (idx === -1) continue;
            env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
        }
    } catch {
        console.error('Could not read .env.local — copy .env.example first.');
        process.exit(1);
    }
    return env;
}

const args = process.argv.slice(2);
if (!args.includes('--confirm')) {
    console.error('Refusing to write users without --confirm.');
    console.error('Usage: node scripts/seed-personas.mjs --confirm [--org <org-id>] [--domain awe.local]');
    process.exit(1);
}
const orgFlag = args.indexOf('--org');
const domainFlag = args.indexOf('--domain');
const orgOverride = orgFlag !== -1 ? args[orgFlag + 1] : null;
const domain = domainFlag !== -1 ? args[domainFlag + 1] : 'awe.local';

const env = loadEnv();
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');
    process.exit(1);
}

const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

// Resolve the target organization.
let orgId = orgOverride;
if (!orgId) {
    const { data, error } = await supabase.from('organizations').select('id, name').order('created_at').limit(1);
    if (error || !data?.length) {
        console.error('No organization exists yet. Sign in once and finish /auth/setup first (it bootstraps the workspace).');
        process.exit(1);
    }
    orgId = data[0].id;
    console.log(`Target organization: ${data[0].name} (${orgId})`);
}

async function findUserByEmail(email) {
    let page = 1;
    for (;;) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
        if (error || !data?.users?.length) return null;
        const match = data.users.find((u) => u.email?.toLowerCase() === email);
        if (match) return match;
        if (data.users.length < 200) return null;
        page += 1;
    }
}

const rows = [];
for (const { role, user } of PERSONAS) {
    const email = `${user}@${domain}`;
    let authUser = await findUserByEmail(email);
    if (!authUser) {
        const { data, error } = await supabase.auth.admin.createUser({
            email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { first_name: role[0].toUpperCase() + role.slice(1), last_name: 'Persona' },
        });
        if (error) {
            console.error(`  [FAIL] ${email}: ${error.message}`);
            continue;
        }
        authUser = data.user;
        console.log(`  [created] ${email}`);
    } else {
        await supabase.auth.admin.updateUserById(authUser.id, { password: PASSWORD });
        console.log(`  [reused]  ${email} (password reset)`);
    }

    const { error: memberError } = await supabase.from('organization_members').upsert(
        { organization_id: orgId, user_id: authUser.id, role },
        { onConflict: 'organization_id,user_id' },
    );
    if (memberError) {
        console.error(`  [FAIL] membership for ${email}: ${memberError.message}`);
        continue;
    }
    rows.push({ email, role, password: PASSWORD });
}

console.log('');
console.log('Personas ready — log in at /en/auth/login:');
for (const r of rows) console.log(`  ${r.role.padEnd(7)} ${r.email}  /  ${r.password}`);
console.log('\nExpected landing: owner+admin -> /en/admin, manager+member -> /en/dashboard.');
