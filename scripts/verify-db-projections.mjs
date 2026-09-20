#!/usr/bin/env node
/**
 * verify-db-projections.mjs - Verify public views, RLS policies, and functions
 * in the Supabase database.
 *
 * Checks:
 *   - All expected public views exist
 *   - RLS policies allow anon SELECT on public views
 *   - Required functions exist
 *   - Migration 22 public_content_page_translations view exists
 *   - public_organization view exists
 *
 * Usage:
 *   node scripts/verify-db-projections.mjs
 * Exit: 0 = all pass, 1 = any fail
 */

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

let Client;
try {
    ({ default: Client } = await import('pg'));
} catch {
    console.error('Missing dependency "pg". Install it with: pnpm add -D pg');
    process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not set.');
    process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not set.');
    process.exit(1);
}

const client = new Client({
    connectionString: `postgresql://postgres:${serviceRoleKey}@${new URL(supabaseUrl).host}/postgres`,
    ssl: { rejectUnauthorized: false },
});

const EXPECTED_VIEWS = [
    'public_content_pages',
    'public_projects',
    'public_partners',
    'public_events',
    'public_impact_metrics',
    'public_organization',
    'public_financial_summary',
    'public_content_page_translations',
    'public_entity_translations',
];

const EXPECTED_FUNCTIONS = [
    'public_default_org_id',
    'public_impact_stats',
    'public_financial_summary',
];

const results = [];
let allPassed = true;

function check(name, passed, detail = '') {
    const result = { name, passed, detail };
    results.push(result);
    if (!passed) allPassed = false;
    console.log(`${passed ? 'PASS' : 'FAIL'}: ${name}${detail ? ` — ${detail}` : ''}`);
}

async function main() {
    await client.connect();
    console.log('Connected to Supabase.\n');

    // 1. Verify public views exist
    console.log('--- Public Views ---');
    for (const view of EXPECTED_VIEWS) {
        try {
            const { data } = await client.query(
                "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = $1)",
                [view.replace('public_', '')]
            );
            check(`View ${view} exists`, data.rows[0].exists, data.rows[0].exists ? '' : 'missing');
        } catch (err) {
            check(`View ${view} exists`, false, err.message);
        }
    }

    // 2. Verify RLS policies allow anon SELECT on public views
    console.log('\n--- RLS Policies ---');
    for (const view of EXPECTED_VIEWS) {
        const tableName = view.replace('public_', '');
        try {
            const { data } = await client.query(
                `SELECT EXISTS (
                    SELECT 1 FROM information_schema.policy_catalog
                    WHERE schemaname = 'public'
                    AND tablename = $1
                    AND polcmd = 'SELECT'
                    AND roles @> ARRAY['anon']
                )`,
                [tableName]
            );
            check(`RLS allows anon SELECT on ${view}`, data.rows[0].exists, data.rows[0].exists ? '' : 'missing');
        } catch {
            // Alternative check via pg_policy
            try {
                const { data } = await client.query(
                    `SELECT EXISTS (
                        SELECT 1 FROM pg_policy p
                        JOIN pg_class c ON c.oid = p.polrelid
                        JOIN pg_namespace n ON n.oid = c.relnamespace
                        WHERE n.nspname = 'public'
                        AND c.relname = $1
                        AND p.polcmd = 'SELECT'
                        AND 'anon' = ANY(p.roles)
                    )`,
                    [tableName]
                );
                check(`RLS allows anon SELECT on ${view}`, data.rows[0].exists, data.rows[0].exists ? '' : 'missing');
            } catch (err) {
                check(`RLS allows anon SELECT on ${view}`, false, err.message);
            }
        }
    }

    // 3. Verify functions exist
    console.log('\n--- Functions ---');
    for (const func of EXPECTED_FUNCTIONS) {
        const funcName = func.replace('public_', '');
        try {
            const { data } = await client.query(
                "SELECT EXISTS (SELECT 1 FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = $1)",
                [funcName]
            );
            check(`Function ${func} exists`, data.rows[0].exists, data.rows[0].exists ? '' : 'missing');
        } catch (err) {
            check(`Function ${func} exists`, false, err.message);
        }
    }

    // 4. Check migration 22 public_content_page_translations view
    console.log('\n--- Migration 22 Checks ---');
    try {
        const { data } = await client.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'content_page_translations')"
        );
        check('Migration 22: public_content_page_translations view exists', data.rows[0].exists);
    } catch (err) {
        check('Migration 22: public_content_page_translations view exists', false, err.message);
    }

    // 5. Check public_organization view
    console.log('\n--- Organization View ---');
    try {
        const { data } = await client.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.views WHERE table_schema = 'public' AND table_name = 'organization')"
        );
        check('public_organization view exists', data.rows[0].exists, data.rows[0].exists ? '' : 'missing');
    } catch (err) {
        check('public_organization view exists', false, err.message);
    }

    // 6. Check subscription_ref column exists on donations
    console.log('\n--- Donations Schema ---');
    try {
        const { data } = await client.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'subscription_ref')"
        );
        check('donations.subscription_ref column exists', data.rows[0].exists);
    } catch (err) {
        check('donations.subscription_ref column exists', false, err.message);
    }

    try {
        const { data } = await client.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'receipt_url')"
        );
        check('donations.receipt_url column exists', data.rows[0].exists);
    } catch (err) {
        check('donations.receipt_url column exists', false, err.message);
    }

    try {
        const { data } = await client.query(
            "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'donations' AND column_name = 'tax_receipt_url')"
        );
        check('donations.tax_receipt_url column exists', data.rows[0].exists);
    } catch (err) {
        check('donations.tax_receipt_url column exists', false, err.message);
    }

    await client.end();

    // Output results as JSON
    console.log('\n--- Results ---');
    const output = JSON.stringify({ results, allPassed }, null, 2);
    console.log(output);

    process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
});
