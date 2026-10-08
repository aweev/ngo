#!/usr/bin/env node
/**
 * Master seed (Phases 1 + 2 demo dataset).
 *
 * Builds ONE coherent story in the target organization so every surface has
 * something truthful to show: public homepage (hero, metrics, stories),
 * field app (households, beneficiaries, services, referrals), finance
 * (funds, grants, budgets vs actuals, two-step approval, FX, allocations),
 * M&E (metrics, measurements, verification queue), and donor 360
 * (donations, linked grants, deadlines).
 *
 * Idempotent — every row is matched on a natural key first (slug, offline
 * UUID, idempotency key, title+amount). Safe to re-run; it fills gaps only.
 *
 * Usage:
 *   node scripts/seed-master.mjs --confirm [--org <org-id>]
 *
 * Requires in .env.local: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 * ENCRYPTION_KEY should match the app's key (same fingerprint is printed);
 * without it both sides fall back to the documented dev key — local only.
 *
 * All people are fictional. Phones are in a reserved demo range.
 */
import { createHash, randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const WORKSPACE = join(dirname(fileURLToPath(import.meta.url)), '..');
const DEV_FALLBACK_PASSPHRASE = 'ngo-os-insecure-dev-only-do-not-use-in-production';
const POLICY_VERSION = 'field-consent-v1';

class Fatal extends Error {}

async function shutdown(code) {
    process.exitCode = code;
    await new Promise((r) => setTimeout(r, 300));
    process.exit(process.exitCode ?? 0);
}

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
        throw new Fatal('Could not read .env.local — copy .env.example first.');
    }
    return env;
}

function fingerprint(passphrase) {
    return createHash('sha256').update(passphrase, 'utf8').digest('hex').slice(0, 12);
}

// ---------------------------------------------------------------------------
// Field PII crypto — byte-identical contract to src/lib/field-crypto.ts:
// PBKDF2-SHA256 100k -> AES-256-GCM, payload = base64(iv12 || ct || tag).
// ---------------------------------------------------------------------------
async function fieldKey(passphrase, organizationId) {
    const enc = new TextEncoder();
    const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: enc.encode(`field-pii:${organizationId}`), iterations: 100000, hash: 'SHA-256' },
        base,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt'],
    );
}

async function encryptPii(plainText, key) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plainText)));
    const combined = new Uint8Array(iv.length + ct.length);
    combined.set(iv, 0);
    combined.set(ct, iv.length);
    return Buffer.from(combined).toString('base64');
}

function nameHash(name, organizationId) {
    return createHash('sha256')
        .update(`${name.trim().toLowerCase()}:field-pii:${organizationId}`, 'utf8')
        .digest('hex');
}

// ---------------------------------------------------------------------------
// Idempotent helpers (service role bypasses RLS; matching keeps reruns safe)
// ---------------------------------------------------------------------------
async function ensureRow(supabase, table, match, insert) {
    let q = supabase.from(table).select('id');
    for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
    const { data: existing, error: findErr } = await q.maybeSingle();
    if (findErr) throw new Error(`${table} lookup failed: ${findErr.message}`);
    if (existing) return { id: existing.id, created: false };
    const { data, error } = await supabase.from(table).insert(insert).select('id').single();
    if (error) throw new Error(`${table} insert failed: ${error.message}`);
    return { id: data.id, created: true };
}

async function main() {
    const args = process.argv.slice(2);
    if (!args.includes('--confirm')) {
        console.error('Refusing to seed without --confirm.');
        console.error('Usage: node scripts/seed-master.mjs --confirm [--org <org-id>]');
        return 1;
    }
    const orgFlag = args.indexOf('--org');
    const orgOverride = orgFlag !== -1 ? args[orgFlag + 1] : null;

    const env = loadEnv();
    const url = env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) throw new Fatal('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local.');

    const passphrase = env.ENCRYPTION_KEY || DEV_FALLBACK_PASSPHRASE;
    if (!env.ENCRYPTION_KEY) {
        console.warn('[seed] ENCRYPTION_KEY not set — using the dev fallback (same as the app in development).');
        console.warn('[seed] For anything beyond local demo, set a 32+ char ENCRYPTION_KEY first, then re-seed PII.');
    }
    console.log(`[seed] PII key fingerprint: ${fingerprint(passphrase)} (app must use the same key to read seeded names)`);

    const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });
    const stats = { created: 0, reused: 0 };
    const done = (r) => { if (r.created) stats.created += 1; else stats.reused += 1; return r.id; };

    // -- Organization -------------------------------------------------------
    let orgId = orgOverride;
    if (!orgId) {
        const { data, error } = await supabase.from('organizations').select('id, name').order('created_at').limit(1);
        if (error) throw new Fatal(`Could not list organizations: ${error.message}`);
        if (!data?.length) throw new Fatal('No organization exists — run seed:personas first to bootstrap one.');
        orgId = data[0].id;
        console.log(`Target organization: ${data[0].name} (${orgId})`);
    }
    await supabase.from('organizations').update({
        default_currency: 'EUR',
        expense_approval_threshold: 500,
        settings: { public_site: true },
    }).eq('id', orgId);

    const key = await fieldKey(passphrase, orgId);
    const enc = (v) => encryptPii(v, key);

    // Best-effort persona user ids for submitted_by / approved_by trails.
    async function findUserId(email) {
        let page = 1;
        for (;;) {
            const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
            if (error || !data?.users?.length) return null;
            const m = data.users.find((u) => u.email?.toLowerCase() === email);
            if (m) return m.id;
            if (data.users.length < 200) return null;
            page += 1;
        }
    }
    const ownerId = await findUserByEmailSafe('owner@awe.local');
    const managerId = await findUserByEmailSafe('manager@awe.local');
    async function findUserByEmailSafe(email) {
        try { return await findUserId(email); } catch { return null; }
    }

    // -- Funds --------------------------------------------------------------
    const generalFund = done(await ensureRow(supabase, 'funds',
        { organization_id: orgId, name: 'General Fund' },
        { organization_id: orgId, name: 'General Fund', code: 'GEN', fund_type: 'unrestricted', currency: 'EUR', purpose: 'Unrestricted operating support' }));
    const washFund = done(await ensureRow(supabase, 'funds',
        { organization_id: orgId, name: 'EU WASH Fund' },
        { organization_id: orgId, name: 'EU WASH Fund', code: 'WASH-EU', fund_type: 'temporarily_restricted', currency: 'EUR', purpose: 'Restricted to clean-water activities in Kakamega', donor_intent: 'EU WASH programme 2026' }));
    const healthFund = done(await ensureRow(supabase, 'funds',
        { organization_id: orgId, name: 'Health Fund' },
        { organization_id: orgId, name: 'Health Fund', code: 'HEALTH', fund_type: 'temporarily_restricted', currency: 'EUR', purpose: 'Restricted to clinic outreach', donor_intent: 'Healthy Start grant' }));

    // -- Donors --------------------------------------------------------------
    async function ensureDonor(match, row) {
        return done(await ensureRow(supabase, 'donors', { organization_id: orgId, ...match }, { organization_id: orgId, ...row }));
    }
    const europaAid = await ensureDonor({ name: 'Europa Aid Foundation' },
        { name: 'Europa Aid Foundation', type: 'foundation', email: 'grants@europaaid.example.org', country: 'DE', status: 'active', currency: 'EUR' });
    const nairobiWater = await ensureDonor({ name: 'Nairobi Water Ltd' },
        { name: 'Nairobi Water Ltd', type: 'corporate', email: 'csr@nairobiwater.example.org', country: 'KE', status: 'active', currency: 'EUR' });
    const otieno = await ensureDonor({ name: 'A. Otieno' },
        { name: 'A. Otieno', type: 'individual', email: 'donor.otieno@example.org', country: 'KE', status: 'active', currency: 'EUR' });
    const countyGov = await ensureDonor({ name: 'Kakamega County Government' },
        { name: 'Kakamega County Government', type: 'government', email: 'partnerships@kakamega.example.org', country: 'KE', status: 'prospect', currency: 'EUR' });

    // -- Grants (linked to donors for the 360 view) --------------------------
    async function ensureGrant(title, row) {
        return done(await ensureRow(supabase, 'grants', { organization_id: orgId, title }, { organization_id: orgId, title, ...row }));
    }
    const washGrant = await ensureGrant('Clean Water Kakamega 2026', {
        fund_id: washFund, donor_id: europaAid, grantor_name: 'Europa Aid Foundation', grant_reference: 'EU-WASH-2026-014',
        description: 'Borehole rehabilitation and household filters in Kakamega county.',
        amount_committed: 90000, currency: 'EUR', status: 'active',
        start_date: '2026-01-15', end_date: '2027-03-31', indirect_cost_rate: 0.07,
        allowable_costs: { categories: ['Water', 'Supplies', 'Travel', 'Logistics'], max_per_expense: 10000 },
        reporting_requirements: { interim_report: '2026-09-30', final_report: '2027-03-31' },
    });
    const healthGrant = await ensureGrant('Healthy Start Clinics 2026', {
        fund_id: healthFund, donor_id: europaAid, grantor_name: 'Europa Aid Foundation', grant_reference: 'EU-HEALTH-2026-003',
        description: 'Mobile clinic outreach and child nutrition screening.',
        amount_committed: 60000, currency: 'EUR', status: 'active',
        start_date: '2026-02-01', end_date: '2026-12-31',
        allowable_costs: { categories: ['Health', 'Supplies', 'Travel'], max_per_expense: 5000 },
        reporting_requirements: { interim_report: '2026-08-31', final_report: '2027-01-31' },
    });

    // -- Donations ------------------------------------------------------------
    async function ensureDonation(donorId, amount, currency, daysAgo, status = 'completed') {
        // Truncated to the day: identical across reruns, so matching stays stable.
        const day = new Date(Date.now() - daysAgo * 86400000);
        day.setUTCHours(0, 0, 0, 0);
        const donated_at = day.toISOString();
        let q = supabase.from('donations').select('id')
            .eq('organization_id', orgId).eq('donor_id', donorId)
            .eq('amount', amount).eq('currency', currency).eq('donated_at', donated_at);
        const { data: existing } = await q.maybeSingle();
        if (existing) { stats.reused += 1; return existing.id; }
        const { data, error } = await supabase.from('donations').insert({
            organization_id: orgId, donor_id: donorId, amount, currency,
            type: 'one_time', status, payment_method: 'bank_transfer', donated_at,
        }).select('id').single();
        if (error) throw new Error(`donations insert failed: ${error.message}`);
        stats.created += 1;
        return data.id;
    }
    await ensureDonation(europaAid, 30000, 'EUR', 60);
    await ensureDonation(europaAid, 15000, 'EUR', 20);
    await ensureDonation(nairobiWater, 8000, 'EUR', 45);
    await ensureDonation(nairobiWater, 2500, 'USD', 10);
    await ensureDonation(otieno, 250, 'EUR', 5);
    await ensureDonation(otieno, 100, 'EUR', 90, 'completed');

    // -- Projects --------------------------------------------------------------
    async function ensureProject(slug, row) {
        return done(await ensureRow(supabase, 'projects', { organization_id: orgId, slug }, { organization_id: orgId, slug, ...row }));
    }
    const waterProject = await ensureProject('clean-water-kakamega', {
        name: 'Clean Water Kakamega', kind: 'program', category: 'wash', status: 'active',
        description: 'Borehole rehabilitation and household water filters across 12 villages.',
        start_date: '2026-01-15', end_date: '2027-03-31', budget: 120000, currency: 'EUR',
        country: 'KE', location: 'Kakamega County, Kenya', beneficiaries_target: 5000, beneficiaries_reached: 1284,
    });
    const healthProject = await ensureProject('healthy-start-clinics', {
        name: 'Healthy Start Clinics', kind: 'program', category: 'health', status: 'active',
        description: 'Mobile clinics and child nutrition screening in Siaya county.',
        start_date: '2026-02-01', end_date: '2026-12-31', budget: 85000, currency: 'EUR',
        country: 'KE', location: 'Siaya County, Kenya', beneficiaries_target: 3000, beneficiaries_reached: 642,
    });
    const eduProject = await ensureProject('girls-learn-pilot', {
        name: 'Girls Learn Pilot', kind: 'program', category: 'education', status: 'planning',
        description: 'After-school learning hubs for adolescent girls (design phase).',
        budget: 60000, currency: 'EUR', country: 'KE', location: 'Kakamega County, Kenya',
        beneficiaries_target: 800, beneficiaries_reached: 0,
    });

    // -- Budgets + lines --------------------------------------------------------
    async function ensureBudget(name, row) {
        return done(await ensureRow(supabase, 'budgets', { organization_id: orgId, name }, { organization_id: orgId, name, ...row }));
    }
    async function ensureLine(budgetId, category, allocated, fundId = null) {
        const { data: existing } = await supabase.from('budget_lines').select('id')
            .eq('organization_id', orgId).eq('budget_id', budgetId).eq('category', category).maybeSingle();
        if (existing) { stats.reused += 1; return existing.id; }
        const { data, error } = await supabase.from('budget_lines').insert({
            organization_id: orgId, budget_id: budgetId, category, allocated_amount: allocated, currency: 'EUR',
        }).select('id').single();
        if (error) throw new Error(`budget_lines insert failed: ${error.message}`);
        stats.created += 1;
        return data.id;
    }
    const fieldBudget = await ensureBudget('FY2026 Field Operations', {
        fiscal_year: 2026, period_type: 'annual', total_amount: 150000, currency: 'EUR',
        status: 'active', fund_id: washFund, project_id: waterProject,
    });
    const waterLine = await ensureLine(fieldBudget, 'Water', 60000);
    const suppliesLine = await ensureLine(fieldBudget, 'Supplies', 40000);
    const travelLine = await ensureLine(fieldBudget, 'Travel', 25000);
    const staffLine = await ensureLine(fieldBudget, 'Staff', 25000);
    const eduBudget = await ensureBudget('Education Pilot', {
        fiscal_year: 2026, period_type: 'project', total_amount: 60000, currency: 'EUR',
        status: 'draft', project_id: eduProject,
    });
    await ensureLine(eduBudget, 'Learning materials', 35000);
    await ensureLine(eduBudget, 'Facilitators', 25000);
    // USD budget demonstrates honest FX conversion on the reconcile screen.
    const usBudget = await ensureBudget('US Grant Pilot', {
        fiscal_year: 2026, period_type: 'project', total_amount: 10000, currency: 'USD',
        status: 'active', project_id: healthProject,
    });
    const usLine = await ensureLine(usBudget, 'Supplies', 10000);
    await supabase.from('budget_lines').update({ currency: 'USD' }).eq('id', usLine);

    // -- Expenses (every status of the approval lifecycle) -----------------------
    async function ensureExpense(title, amount, extra) {
        const { data: existing } = await supabase.from('expenses').select('id')
            .eq('organization_id', orgId).eq('title', title).eq('amount', amount).maybeSingle();
        if (existing) { stats.reused += 1; return existing.id; }
        const { data, error } = await supabase.from('expenses').insert({
            organization_id: orgId, title, amount, currency: 'EUR', status: 'pending',
            submitted_by: ownerId, ...extra,
        }).select('id').single();
        if (error) throw new Error(`expenses insert failed: ${error.message}`);
        stats.created += 1;
        return data.id;
    }
    // Paid + approved via full trail (spent_amount rolls up through triggers).
    await ensureExpense('Borehole pump sets (12 villages)', 12000, {
        category: 'Water', currency: 'EUR', status: 'paid', budget_id: fieldBudget, budget_line_id: waterLine,
        fund_id: washFund, project_id: waterProject, vendor: 'Rift Pumps Ltd', paid_at: '2026-06-20',
        approved_by: ownerId, approved_at: new Date(Date.now() - 40 * 86400000).toISOString(),
    });
    // Overspent line demo: Travel line is 25k; this + next push it over.
    await ensureExpense('Field vehicle hire Q2', 14000, {
        category: 'Travel', status: 'paid', budget_id: fieldBudget, budget_line_id: travelLine,
        fund_id: washFund, project_id: waterProject, vendor: 'Savannah Hire', paid_at: '2026-05-11',
        approved_by: ownerId, approved_at: new Date(Date.now() - 60 * 86400000).toISOString(),
    });
    await ensureExpense('Emergency vehicle repairs', 12500, {
        category: 'Travel', status: 'approved', budget_id: fieldBudget, budget_line_id: travelLine,
        fund_id: washFund, project_id: waterProject, vendor: 'Savannah Hire',
        approved_by: ownerId, approved_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        receipt_url: null, // deliberately missing: shows in the reconcile missing-receipts list
    });
    // Two-step demo: above the 500 threshold, first approval recorded.
    const twoStepId = await ensureExpense('Clinic refrigeration units', 1200, {
        category: 'Health', status: 'approved_first', budget_id: fieldBudget, budget_line_id: suppliesLine,
        fund_id: healthFund, project_id: healthProject, vendor: 'ColdChain KE',
        approved_by: ownerId,
    });
    const { data: step1 } = await supabase.from('expense_approvals').select('id')
        .eq('organization_id', orgId).eq('expense_id', twoStepId).eq('step', 1).maybeSingle();
    if (!step1) {
        await supabase.from('expense_approvals').insert({
            organization_id: orgId, expense_id: twoStepId, approver_id: ownerId,
            step: 1, decision: 'approved', reason: 'Seed: first of two approvals',
        });
        stats.created += 1;
    } else stats.reused += 1;
    // Ordinary pending + rejected.
    await ensureExpense('Printed hygiene flyers', 300, {
        category: 'Supplies', status: 'pending', budget_id: fieldBudget, budget_line_id: suppliesLine,
        project_id: waterProject, vendor: 'Kakamega Print',
    });
    await ensureExpense('Conference attendance', 900, {
        category: 'Travel', status: 'rejected', budget_id: fieldBudget, budget_line_id: travelLine,
        project_id: waterProject, approved_by: ownerId,
    });
    // USD expense for the FX demo (linked line matches currency per Phase 0 guard).
    await ensureExpense('ORS sachets (USD lot)', 2500, {
        category: 'Supplies', currency: 'USD', status: 'paid', budget_id: usBudget, budget_line_id: usLine,
        project_id: healthProject, vendor: 'MedSupply Inc', paid_at: '2026-07-02',
        approved_by: ownerId, approved_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    });

    // -- Cost allocations ---------------------------------------------------------
    const { data: logistics } = await supabase.from('expenses').select('id, amount')
        .eq('organization_id', orgId).eq('title', 'Borehole pump sets (12 villages)').maybeSingle();
    if (logistics) {
        for (const [grantId, amount, basis] of [[washGrant, 8000, 'direct'], [healthGrant, 4000, 'direct']]) {
            const { data: existing } = await supabase.from('cost_allocations').select('id')
                .eq('organization_id', orgId).eq('expense_id', logistics.id).eq('grant_id', grantId).eq('basis', basis).maybeSingle();
            if (existing) stats.reused += 1;
            else {
                await supabase.from('cost_allocations').insert({
                    organization_id: orgId, expense_id: logistics.id, grant_id: grantId, amount, basis, created_by: ownerId,
                });
                stats.created += 1;
            }
        }
    }

    // -- FX rates -------------------------------------------------------------------
    async function ensureRate(from, to, rate, date) {
        const { data: existing } = await supabase.from('exchange_rates').select('id')
            .eq('organization_id', orgId).eq('from_currency', from).eq('to_currency', to).eq('rate_date', date).maybeSingle();
        if (existing) { stats.reused += 1; return; }
        await supabase.from('exchange_rates').insert({
            organization_id: orgId, from_currency: from, to_currency: to, rate, rate_date: date, source: 'seed-ecb-demo',
        });
        stats.created += 1;
    }
    await ensureRate('EUR', 'USD', 1.08, '2026-07-01');
    await ensureRate('USD', 'EUR', 0.92, '2026-07-01');

    // -- Field: consents, households, beneficiaries ----------------------------------
    async function ensureConsent() {
        const { data, error } = await supabase.from('consent_records').insert({
            organization_id: orgId, subject_type: 'beneficiary', consent_type: 'field_registration',
            policy_version: POLICY_VERSION, status: 'granted', source: 'seed-master',
        }).select('id').single();
        if (error) throw new Error(`consent insert failed: ${error.message}`);
        stats.created += 1;
        return data.id;
    }
    async function ensureHousehold(headName, location, memberCount) {
        const { data: existing } = await supabase.from('households').select('id')
            .eq('organization_id', orgId).eq('offline_uuid', `seed-hh-${headName}`).maybeSingle();
        if (existing) { stats.reused += 1; return existing.id; }
        const consentId = await ensureConsent();
        const { data, error } = await supabase.from('households').insert({
            organization_id: orgId, head_name_encrypted: await enc(headName),
            head_search_hash: nameHash(headName, orgId), location_text: location,
            member_count: memberCount, consent_id: consentId, created_by: managerId,
            offline_uuid: `seed-hh-${headName}`,
        }).select('id').single();
        if (error) throw new Error(`household insert failed: ${error.message}`);
        stats.created += 1;
        return data.id;
    }
    async function ensureBeneficiary(name, householdId, profile, phone) {
        const { data: existing } = await supabase.from('beneficiaries').select('id')
            .eq('organization_id', orgId).eq('offline_uuid', `seed-ben-${name}`).maybeSingle();
        if (existing) { stats.reused += 1; return existing.id; }
        const consentId = await ensureConsent();
        const { data, error } = await supabase.from('beneficiaries').insert({
            organization_id: orgId, household_id: householdId, full_name_encrypted: await enc(name),
            search_hash: nameHash(name, orgId), sex: profile.sex, age_band: profile.age_band,
            disability: profile.disability ?? 'none', phone_encrypted: phone ? await enc(phone) : null,
            location_text: profile.location, consent_id: consentId, created_by: managerId,
            offline_uuid: `seed-ben-${name}`,
        }).select('id').single();
        if (error) throw new Error(`beneficiary insert failed: ${error.message}`);
        stats.created += 1;
        return data.id;
    }

    const hhA = await ensureHousehold('Amina Diallo (demo)', 'Kakamega — Ebusiloli village', 4);
    const hhB = await ensureHousehold('Brian Otieno (demo)', 'Kakamega — Shiru village', 3);
    const hhC = await ensureHousehold('Faith Wanjiru (demo)', 'Siaya — Ugunja town', 2);
    const mk = (sex, age_band, location, disability = 'none') => ({ sex, age_band, location, disability });
    const benIds = {};
    benIds.amina = await ensureBeneficiary('Amina Diallo (demo)', hhA, mk('female', 'age_18_59', 'Kakamega — Ebusiloli village'), '+254700000011');
    benIds.musa = await ensureBeneficiary('Musa Diallo (demo)', hhA, mk('male', 'age_5_11', 'Kakamega — Ebusiloli village'), null);
    benIds.zara = await ensureBeneficiary('Zara Diallo (demo)', hhA, mk('female', 'age_12_17', 'Kakamega — Ebusiloli village'), null);
    benIds.sidi = await ensureBeneficiary('Sidi Diallo (demo)', hhA, mk('male', 'age_60_plus', 'Kakamega — Ebusiloli village', 'mobility'), null);
    benIds.brian = await ensureBeneficiary('Brian Otieno (demo)', hhB, mk('male', 'age_18_59', 'Kakamega — Shiru village'), '+254700000022');
    benIds.luo = await ensureBeneficiary('Luo Otieno (demo)', hhB, mk('female', 'age_5_11', 'Kakamega — Shiru village'), null);
    benIds.faith = await ensureBeneficiary('Faith Wanjiru (demo)', hhC, mk('female', 'age_18_59', 'Siaya — Ugunja town'), '+254700000033');
    benIds.baraka = await ensureBeneficiary('Baraka Wanjiru (demo)', hhC, mk('male', 'under_5', 'Siaya — Ugunja town'), null);

    // -- Services + referrals ----------------------------------------------------------
    async function ensureService(who, type, qty, projectId, daysAgo) {
        const key = `seed-svc-${who}-${type}-${daysAgo}`;
        const { data: existing } = await supabase.from('services').select('id')
            .eq('organization_id', orgId).eq('idempotency_key', key).maybeSingle();
        if (existing) { stats.reused += 1; return; }
        await supabase.from('services').insert({
            organization_id: orgId, beneficiary_id: benIds[who], project_id: projectId,
            service_type: type, quantity: qty,
            delivered_at: new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10),
            delivered_by: managerId, offline_uuid: key, idempotency_key: key,
        });
        stats.created += 1;
    }
    await ensureService('amina', 'Water', 1, waterProject, 12);
    await ensureService('musa', 'Health', 1, healthProject, 9);
    await ensureService('zara', 'Education', 3, eduProject, 6);
    await ensureService('sidi', 'Health', 2, healthProject, 9);
    await ensureService('brian', 'Water', 1, waterProject, 12);
    await ensureService('luo', 'Health', 1, healthProject, 4);
    await ensureService('faith', 'Food', 2, waterProject, 3);
    await ensureService('baraka', 'Health', 1, healthProject, 4);
    await ensureService('amina', 'Food', 1, waterProject, 2);
    await ensureService('zara', 'Food', 1, waterProject, 2);

    async function ensureReferral(who, to, status, daysOut) {
        const key = `seed-ref-${who}-${status}`;
        const { data: existing } = await supabase.from('referrals').select('id')
            .eq('organization_id', orgId).eq('offline_uuid', key).maybeSingle();
        if (existing) { stats.reused += 1; return; }
        await supabase.from('referrals').insert({
            organization_id: orgId, beneficiary_id: benIds[who], referred_to: to,
            reason: 'Seed demo referral', status,
            follow_up_at: daysOut ? new Date(Date.now() + daysOut * 86400000).toISOString().slice(0, 10) : null,
            created_by: managerId, offline_uuid: key,
        });
        stats.created += 1;
    }
    await ensureReferral('sidi', 'Kakamega County physiotherapy unit', 'open', 21);
    await ensureReferral('baraka', 'Ugunja nutrition clinic', 'completed', null);

    // -- M&E -----------------------------------------------------------------------------
    async function ensureMetric(slug, row) {
        return done(await ensureRow(supabase, 'impact_metrics', { organization_id: orgId, slug }, { organization_id: orgId, slug, ...row }));
    }
    const litresMetric = await ensureMetric('clean-water-litres', {
        name: 'Litres of clean water delivered', unit: 'litres', category: 'wash',
        baseline_value: 0, current_value: 128400, target_value: 500000, is_public: true,
    });
    const enrolledMetric = await ensureMetric('children-enrolled', {
        name: 'Children enrolled in learning hubs', unit: 'children', category: 'education',
        baseline_value: 0, current_value: 214, target_value: 800, is_public: true,
    });
    const clinicMetric = await ensureMetric('clinic-visits', {
        name: 'Mobile clinic consultations', unit: 'visits', category: 'health',
        baseline_value: 0, current_value: 642, target_value: 3000, is_public: false,
    });
    async function ensureMeasurement(metricId, value, daysAgo) {
        const measured_at = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
        const { data: existing } = await supabase.from('impact_measurements').select('id')
            .eq('organization_id', orgId).eq('metric_id', metricId).eq('measured_at', measured_at).eq('value', value).maybeSingle();
        if (existing) { stats.reused += 1; return; }
        await supabase.from('impact_measurements').insert({
            organization_id: orgId, metric_id: metricId, value, measured_at, data_source: 'seed-master',
        });
        stats.created += 1;
    }
    await ensureMeasurement(litresMetric, 96400, 60);
    await ensureMeasurement(litresMetric, 128400, 15);
    await ensureMeasurement(enrolledMetric, 214, 15);
    await ensureMeasurement(clinicMetric, 642, 15);

    const { data: existingGoal } = await supabase.from('impact_goals').select('id')
        .eq('organization_id', orgId).eq('name', '2026 water access goal').maybeSingle();
    if (!existingGoal) {
        await supabase.from('impact_goals').insert({
            organization_id: orgId, name: '2026 water access goal', status: 'on_track',
            target_date: '2026-12-31', project_id: waterProject, metrics: [litresMetric],
        });
        stats.created += 1;
    } else stats.reused += 1;

    // Verification queue demo: one sender, one quarantined + one reviewable report.
    const { data: existingSender } = await supabase.from('field_report_senders').select('id')
        .eq('phone_number_e164', '+254711000001').maybeSingle();
    let senderId = existingSender?.id ?? null;
    if (!senderId) {
        const { data, error } = await supabase.from('field_report_senders').insert({
            organization_id: orgId, phone_number_e164: '+254711000001', display_name: 'Demo Field Officer',
            status: 'active', default_project_id: waterProject, approved_by: ownerId,
            approved_at: new Date().toISOString(), notes: 'Seed demo reporter',
        }).select('id').single();
        if (error) throw new Error(`sender insert failed: ${error.message}`);
        senderId = data.id;
        stats.created += 1;
    } else stats.reused += 1;
    async function ensureFieldReport(key, state, qty) {
        const { data: existing } = await supabase.from('field_reports').select('id')
            .eq('organization_id', orgId).eq('idempotency_key', key).maybeSingle();
        if (existing) { stats.reused += 1; return; }
        await supabase.from('field_reports').insert({
            organization_id: orgId, sender_id: senderId, project_id: waterProject, metric_id: litresMetric,
            message_sid: key, idempotency_key: key, project_code: 'WASH-KAK', metric_code: 'LITRES',
            quantity: qty, location: 'Ebusiloli village', note: 'Seed demo report',
            raw_text: `Seed demo: distributed ${qty} litres in Ebusiloli`, from_number: '+254711000001',
            validation_state: state,
        });
        stats.created += 1;
    }
    await ensureFieldReport('seed-fr-quarantined-1', 'quarantined', null);
    await ensureFieldReport('seed-fr-review-1', 'pending_review', 1200);

    // -- People -------------------------------------------------------------------------------
    async function ensureWorker(email, row) {
        return done(await ensureRow(supabase, 'workers', { organization_id: orgId, email }, { organization_id: orgId, email, ...row }));
    }
    await ensureWorker('field.officer@example.org', {
        first_name: 'Demo', last_name: 'Field Officer', department: 'Programs', position: 'Field Officer',
        employment_type: 'full_time', status: 'active', country: 'KE', user_id: managerId,
    });
    await ensureWorker('finance@example.org', {
        first_name: 'Demo', last_name: 'Finance Officer', department: 'Finance', position: 'Finance Officer',
        employment_type: 'full_time', status: 'active', country: 'KE', user_id: ownerId,
    });
    await ensureWorker('driver@example.org', {
        first_name: 'Demo', last_name: 'Driver', department: 'Operations', position: 'Driver',
        employment_type: 'contract', status: 'active', country: 'KE',
    });
    async function ensureVolunteer(email, row) {
        const id = done(await ensureRow(supabase, 'volunteers', { organization_id: orgId, email }, { organization_id: orgId, email, ...row }));
        return id;
    }
    const vol1 = await ensureVolunteer('vol.asha@example.org', {
        first_name: 'Asha', last_name: 'Volunteer (demo)', status: 'active', background_check_status: 'approved',
        skills: ['translation', 'first-aid'], country: 'KE',
    });
    const vol2 = await ensureVolunteer('vol.biko@example.org', {
        first_name: 'Biko', last_name: 'Volunteer (demo)', status: 'active', background_check_status: 'approved',
        skills: ['driving', 'logistics'], country: 'KE',
    });
    await ensureVolunteer('vol.chiku@example.org', {
        first_name: 'Chiku', last_name: 'Volunteer (demo)', status: 'pending', background_check_status: 'pending',
        skills: ['teaching'], country: 'KE',
    });
    await ensureVolunteer('vol.duma@example.org', {
        first_name: 'Duma', last_name: 'Volunteer (demo)', status: 'on_break', background_check_status: 'approved',
        skills: ['photography'], country: 'KE',
    });
    async function ensureHours(volunteerId, activity, hours, status, projectId) {
        const { data: existing } = await supabase.from('volunteer_hours').select('id')
            .eq('organization_id', orgId).eq('volunteer_id', volunteerId).eq('activity', activity).eq('hours', hours).maybeSingle();
        if (existing) { stats.reused += 1; return; }
        await supabase.from('volunteer_hours').insert({
            organization_id: orgId, volunteer_id: volunteerId, project_id: projectId, activity, hours,
            status, approved_by: status === 'approved' ? ownerId : null,
        });
        stats.created += 1;
    }
    await ensureHours(vol1, 'Water point sensitization', 6, 'approved', waterProject);
    await ensureHours(vol1, 'Filter distribution', 4, 'approved', waterProject);
    await ensureHours(vol2, 'Clinic transport', 8, 'approved', healthProject);
    await ensureHours(vol2, 'Weekend drive', 5, 'pending', healthProject);

    async function ensurePartner(name, row) {
        return done(await ensureRow(supabase, 'partners', { organization_id: orgId, name }, { organization_id: orgId, name, ...row }));
    }
    await ensurePartner('Kakamega Water Action', {
        type: 'ngo', email: 'hello@kakwater.example.org', country: 'KE',
        partnership_type: 'implementing', status: 'active',
    });
    await ensurePartner('Siaya Health Network', {
        type: 'ngo', email: 'contact@siayahealth.example.org', country: 'KE',
        partnership_type: 'strategic', status: 'prospect',
    });

    // -- Public content ---------------------------------------------------------------------------
    async function ensurePage(slug, row) {
        return done(await ensureRow(supabase, 'content_pages', { organization_id: orgId, slug }, {
            organization_id: orgId, slug, status: 'published', published_at: new Date().toISOString(), ...row,
        }));
    }
    await ensurePage('homepage-hero', {
        title: 'Clean water, healthy children, learning girls',
        meta_description: 'Community-driven WASH, health, and education programmes in western Kenya.',
        content: {
            headline_primary: 'Dignity grows', headline_accent: 'where water flows',
            subheadline: 'We turn donor funding into boreholes, clinics, and classrooms — with receipts to prove it.',
            primary_cta: 'Donate', primary_cta_link: '/public/get-involved/donate',
            secondary_cta: 'Our story', trust_1: 'Audited annually', trust_2: '92% reaches programmes',
            scroll_text: 'See the impact',
        },
    });
    await ensurePage('homepage-mission', {
        title: 'Our mission',
        content: { category: 'mission', text: 'Seed demo mission: proven community impact with full transparency.' },
    });
    await ensurePage('homepage-get-involved', {
        title: 'Get involved',
        content: { category: 'get-involved', text: 'Volunteer, partner, or fund a borehole.' },
    });
    await ensurePage('testimonial-amani', {
        title: 'Amani, Ebusiloli', meta_description: 'Village elder testimonial',
        content: { category: 'testimonial', quote: 'The borehole gave our children back their mornings.', author: 'Amani (demo)', location: 'Ebusiloli, Kakamega' },
    });
    await ensurePage('testimonial-sister-mary', {
        title: 'Sr. Mary, Ugunja', meta_description: 'Clinic partner testimonial',
        content: { category: 'testimonial', quote: 'Screening days now reach three times the children.', author: 'Sr. Mary (demo)', location: 'Ugunja, Siaya' },
    });
    await ensurePage('story-first-filter', {
        title: 'The first filter in Ebusiloli', meta_description: 'A household story',
        content: { category: 'story', quote: 'Amina (demo) no longer boils water for four children.', author: 'Field team', location: 'Kakamega', image_src: '/icon.svg', name: 'First filter, Ebusiloli' },
    });
    await ensurePage('news-borehole-12', {
        title: 'Twelfth borehole rehabilitated', meta_description: 'Programme update',
        content: { category: 'news', text: 'Seed demo news: the twelfth borehole now serves 400 households.' },
    });
    await ensurePage('team-amara', {
        title: 'Amara (demo), Programme Lead',
        content: { category: 'team_member', name: 'Amara (demo)', role: 'Programme Lead', location: 'Kakamega' },
    });
    await ensurePage('team-joseph', {
        title: 'Joseph (demo), Finance Officer',
        content: { category: 'team_member', name: 'Joseph (demo)', role: 'Finance Officer', location: 'Nairobi' },
    });
    await ensurePage('milestone-2024', {
        title: 'Founded', content: { category: 'milestone', year: 2024, text: 'Seed demo milestone.' },
    });
    await ensurePage('milestone-2026', {
        title: '100,000 litres', content: { category: 'milestone', year: 2026, text: 'Seed demo milestone.' },
    });

    // -- Report definition ----------------------------------------------------------------------------
    done(await ensureRow(supabase, 'report_definitions', { organization_id: orgId, slug: 'donor-expenses' }, {
        organization_id: orgId, name: 'Donor expense report', slug: 'donor-expenses',
        description: 'Seed: approved and paid expenses for donor reporting.',
        entity_type: 'expenses', filters: { status: 'approved' }, grouping: [], metrics: [],
        sort_field: 'created_at', sort_direction: 'desc', created_by: ownerId,
    }));

    // -- Audit marker --------------------------------------------------------------------------------------
    await supabase.from('audit_events').insert({
        organization_id: orgId, action: 'seed.master_completed', entity_type: 'organizations', entity_id: orgId,
    });

    console.log('');
    console.log(`Master seed complete: ${stats.created} created, ${stats.reused} reused.`);
    console.log('Walkthrough:');
    console.log('  Public home ...... live hero, metrics, testimonials, stories');
    console.log('  /field ........... 3 households, 8 beneficiaries, 10 services, 2 referrals, sync queue empty');
    console.log('  /admin/financial . budgets vs actuals, pending + 2nd-approval + rejected expenses');
    console.log('  /admin/financial/reconcile ... overspent Travel line, missing receipt, USD conversion');
    console.log('  /admin/donors/<id>  Europa Aid Foundation: donations + 2 grants + deadlines');
    console.log('  /admin/impact .... metrics + 1 quarantined + 1 reviewable field report');
    console.log('  /admin/reporting . "Donor expense report" ready to run + export CSV');
    return 0;
}

try {
    await shutdown(await main());
} catch (err) {
    console.error(err instanceof Fatal ? err.message : (err?.message ?? err));
    await shutdown(1);
}
