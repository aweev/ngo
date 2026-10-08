/**
 * Unit tests for src/lib/stripe-invoices.ts (P0-4 recurring billing).
 * Uses an in-memory query-builder mock — no DB, no network.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type Stripe from 'stripe';
import { handleInvoiceEvent, isInvoiceEvent } from './stripe-invoices';

type Row = Record<string, unknown>;

/** Chainable mock matching the query-builder surface used by the handler. */
interface MockChain {
    select: (_cols: string) => MockChain;
    insert: (p: Row) => MockChain;
    update: (p: Row) => MockChain;
    eq: (col: string, v: unknown) => MockChain;
    is: (col: string, v: unknown) => MockChain;
    maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
    single: () => Promise<{ data: unknown; error: unknown }>;
    then: (resolve: (v: unknown) => void) => void;
}

/** Minimal Supabase query builder: chains then resolves per-table state. */
function makeMockSupabase(state: { donations: Row[]; donors: Row[]; rpcOrgId?: string | null }) {
    const calls: string[] = [];
    const tableRows = (t: string): Row[] => (state as Record<string, Row[] | null | undefined>)[t] ?? [];
    // SQL NULL semantics: a missing key counts as NULL for `.is(col, null)`.
    const matchRow = (r: Row, filters: Array<[string, string, unknown]>): boolean =>
        filters.every(([kind, c, v]) => (kind === 'is' && v === null ? r[c] == null : r[c] === v));

    function builder(table: string) {
        const op = { type: 'select', filters: [] as Array<[string, string, unknown]>, payload: null as Row | null };
        const b: MockChain = {
            // select() after insert()/update() only narrows columns — it must
            // not clobber the pending operation type.
            select: () => { if (op.type !== 'insert' && op.type !== 'update') op.type = 'select'; return b; },
            insert: (p: Row) => { op.type = 'insert'; op.payload = p; return b; },
            update: (p: Row) => { op.type = 'update'; op.payload = p; return b; },
            eq: (col: string, v: unknown) => { op.filters.push(['eq', col, v]); return b; },
            is: (col: string, v: unknown) => { op.filters.push(['is', col, v]); return b; },
            maybeSingle: async () => {
                calls.push(`${table}:${op.type}`);
                const rows = tableRows(table);
                const match = rows.find((r) => matchRow(r, op.filters));
                return { data: match ?? null, error: null };
            },
            single: async () => {
                calls.push(`${table}:${op.type}`);
                if (op.type === 'insert') {
                    const row = { id: 'don-new-1', ...op.payload };
                    tableRows(table).push(row);
                    return { data: row, error: null };
                }
                const match = tableRows(table).find((r) => matchRow(r, op.filters));
                return match ? { data: match, error: null } : { data: null, error: { message: 'no rows' } };
            },
            then: (resolve: (v: unknown) => void) => {
                calls.push(`${table}:${op.type}`);
                const rows = tableRows(table);
                if (op.type === 'update') {
                    for (const r of rows) {
                        if (matchRow(r, op.filters)) Object.assign(r, op.payload);
                    }
                    resolve({ data: null, error: null });
                } else {
                    resolve({ data: rows.find((r) => matchRow(r, op.filters)) ?? null, error: null });
                }
            },
        };
        return b;
    }

    return {
        calls,
        from: (t: string) => builder(t),
        rpc: async (fn: string) => {
            calls.push(`rpc:${fn}`);
            return { data: state.rpcOrgId ?? null, error: null };
        },
    };
}

const baseInvoice = {
    id: 'in_test_001',
    subscription: 'sub_test_001',
    customer: 'cus_test_001',
    customer_email: 'donor@example.com',
    amount_paid: 2500,
    currency: 'eur',
};

function invoiceEvent(overrides: Row = {}): Stripe.Event {
    return {
        id: 'evt_test_1',
        type: 'invoice.paid',
        data: { object: { ...baseInvoice, ...overrides } },
    } as unknown as Stripe.Event;
}

const PAID = 'completed' as const;
const FAILED = 'failed' as const;

beforeEach(() => {
    vi.restoreAllMocks();
});

describe('isInvoiceEvent', () => {
    it('accepts invoice.paid and invoice.payment_failed', () => {
        expect(isInvoiceEvent('invoice.paid')).toBe(true);
        expect(isInvoiceEvent('invoice.payment_failed')).toBe(true);
    });
    it('rejects other events', () => {
        expect(isInvoiceEvent('checkout.session.completed')).toBe(false);
        expect(isInvoiceEvent('charge.refunded')).toBe(false);
    });
});

describe('handleInvoiceEvent', () => {
    it('creates a donation for a new invoice.paid (happy path)', async () => {
        const state = { donations: [], donors: [], rpcOrgId: 'org-1' };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent(), PAID);
        expect(out).toEqual({ kind: 'created', donationId: 'don-new-1' });
        expect(state.donations[0]).toMatchObject({
            amount: 25,
            currency: 'EUR',
            type: 'recurring',
            status: 'completed',
            stripe_invoice_id: 'in_test_001',
            subscription_ref: 'sub_test_001',
            email: 'donor@example.com',
        });
    });

    it('is idempotent: duplicate invoice id returns duplicate, no insert', async () => {
        const state = { donations: [{ id: 'don-1', stripe_invoice_id: 'in_test_001' }], donors: [] };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent(), PAID);
        expect(out).toEqual({ kind: 'duplicate' });
        expect(state.donations).toHaveLength(1);
    });

    it('attributes the org via subscription_ref from a prior donation', async () => {
        const state = {
            donations: [{ id: 'don-prior', subscription_ref: 'sub_test_001', organization_id: 'org-monthly' }],
            donors: [],
        };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent(), PAID);
        expect(out.kind).toBe('created');
        expect((state.donations[1] as Row).organization_id).toBe('org-monthly');
        expect(db.calls.some((c) => c.startsWith('rpc:'))).toBe(false);
    });

    it('returns unmatched when amount is zero', async () => {
        const state = { donations: [], donors: [], rpcOrgId: 'org-1' };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent({ amount_paid: 0 }), PAID);
        expect(out).toEqual({ kind: 'unmatched' });
        expect(state.donations).toHaveLength(0);
    });

    it('returns unmatched when no org can be resolved', async () => {
        const state = { donations: [], donors: [], rpcOrgId: null };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent({ subscription: null }), PAID);
        expect(out).toEqual({ kind: 'unmatched' });
    });

    it('failed invoices carry status failed when insertable', async () => {
        const state = { donations: [], donors: [], rpcOrgId: 'org-1' };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent({ amount_paid: 999 }), FAILED);
        expect(out.kind).toBe('created');
        expect((state.donations[0] as Row).status).toBe('failed');
    });

    it('links donor by email: existing donor reused', async () => {
        const state = {
            donations: [],
            donors: [{ id: 'donor-7', organization_id: 'org-1', email: 'donor@example.com' }],
            rpcOrgId: 'org-1',
        };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent(), PAID);
        expect(out.kind).toBe('created');
        expect((state.donations[0] as Row).donor_id).toBe('donor-7');
        expect(state.donors).toHaveLength(1); // no new donor row
    });

    it('links donor by email: creates donor when none exists', async () => {
        const state = { donations: [], donors: [], rpcOrgId: 'org-1' };
        const db = makeMockSupabase(state);
        const out = await handleInvoiceEvent(db as unknown as SupabaseClient, invoiceEvent(), PAID);
        expect(out.kind).toBe('created');
        expect(state.donors).toHaveLength(1);
        expect(state.donors[0]).toMatchObject({ email: 'donor@example.com', organization_id: 'org-1' });
        expect((state.donations[0] as Row).donor_id).toBe((state.donors[0] as Row).id);
    });
});

