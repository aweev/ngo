import { beforeEach, describe, expect, it, vi } from 'vitest';

// Server Actions run inside a Next.js request; the pieces that need it are
// mocked so the authorization contract can be asserted in isolation.
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/auth/guards', () => ({ authorizePermission: vi.fn() }));

import { authorizePermission } from '@/lib/auth/guards';
import {
    getTranslationCompletenessReport,
    publishPageLocale,
    reviewTranslation,
    submitForTranslation,
} from '@/actions/content-workflow';

interface RecordedCall {
    table: string;
    method: string;
    args: unknown[];
}

interface QueryResult {
    data?: unknown;
    error?: { message: string } | null;
}

/**
 * Minimal PostgREST-shaped stub: every method records the call and returns the
 * same awaitable proxy, so `await supabase.from(t).update(x).eq(a, b)` and
 * `await supabase.from(t).select().eq().single()` both work. Results are
 * consumed FIFO per table.
 */
function createSupabaseStub(queues: Record<string, QueryResult[]> = {}) {
    const calls: RecordedCall[] = [];
    const client = {
        from(table: string) {
            const queue = (queues[table] ??= []);
            const proxy: unknown = new Proxy(
                {},
                {
                    get(_target, prop: string) {
                        if (prop === 'then') {
                            return (resolve: (value: QueryResult) => void) => {
                                resolve(queue.shift() ?? { data: null, error: null });
                            };
                        }
                        return (...args: unknown[]) => {
                            calls.push({ table, method: prop, args });
                            return proxy;
                        };
                    },
                },
            );
            return proxy as Record<string, (...args: unknown[]) => unknown>;
        },
    };
    return { client, calls };
}

const ORG = '11111111-1111-1111-1111-111111111111';
const USER = '22222222-2222-2222-2222-222222222222';

function grantPermission(permission: string, stub: ReturnType<typeof createSupabaseStub>) {
    expect(permission).toBeTruthy();
    vi.mocked(authorizePermission).mockResolvedValue({
        ok: true,
        code: 'ok',
        error: null,
        supabase: stub.client,
        userId: USER,
        organizationId: ORG,
        role: 'manager',
        context: { supabase: stub.client, userId: USER, organizationId: ORG },
    } as never);
}

function denyPermission(error = 'You do not have permission to perform this action.') {
    vi.mocked(authorizePermission).mockResolvedValue({
        ok: false,
        code: 'forbidden',
        error,
    } as never);
}

/** True when every recorded filter for `column` equals `value`. */
function scopedByOrg(calls: RecordedCall[], column = 'organization_id', value = ORG) {
    const filters = calls.filter((c) => c.method === 'eq' && c.args[0] === column);
    return filters.length > 0 && filters.every((c) => c.args[1] === value);
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('content workflow authorization', () => {
    it('requires content.manage to submit a page for translation', async () => {
        const stub = createSupabaseStub();
        grantPermission('content.manage', stub);

        await submitForTranslation('page-1');

        expect(authorizePermission).toHaveBeenCalledWith('content.manage');
    });

    it('refuses to translate when the guard denies, before touching the database', async () => {
        denyPermission('Your role "member" does not include "content.manage".');

        const result = await submitForTranslation('page-1');

        expect(result.success).toBe(false);
        expect(result.error).toContain('content.manage');
    });

    it('requires content.review to record a review decision', async () => {
        const stub = createSupabaseStub({
            content_page_translations: [{ data: null, error: null }, { data: [], error: null }],
        });
        grantPermission('content.review', stub);

        const result = await reviewTranslation('page-1', 'de', 'approved');

        expect(authorizePermission).toHaveBeenCalledWith('content.review');
        expect(result.success).toBe(true);
        expect(result.newState).toBe('approved');
    });

    it('stops the review write when the caller only holds content.manage', async () => {
        denyPermission('Your role "manager" does not include "content.review".');

        const result = await reviewTranslation('page-1', 'de', 'approved');

        expect(result.success).toBe(false);
        expect(result.error).toContain('content.review');
    });

    it('requires content.publish to publish a locale', async () => {
        const stub = createSupabaseStub({
            content_page_translations: [
                { data: { status: 'approved' }, error: null },
                { data: null, error: null },
            ],
        });
        grantPermission('content.publish', stub);

        const result = await publishPageLocale('page-1', 'de');

        expect(authorizePermission).toHaveBeenCalledWith('content.publish');
        expect(result.success).toBe(true);
        expect(result.newState).toBe('published');
        // The publish write is org-scoped, not just id-scoped.
        expect(scopedByOrg(stub.calls)).toBe(true);
        // Wave 3: a successful publish records a transactional-outbox event
        // for the cron-runner to drain (never a direct side effect here).
        const enqueue = stub.calls.find((c) => c.table === 'outbox_events' && c.method === 'insert');
        expect(enqueue, 'publish must enqueue an outbox event').toBeDefined();
        expect(result.warning).toBeUndefined();
    });

    it('never publishes an unapproved locale', async () => {
        const stub = createSupabaseStub({
            content_page_translations: [{ data: { status: 'machine_translated' }, error: null }],
        });
        grantPermission('content.publish', stub);

        const result = await publishPageLocale('page-1', 'de');

        expect(result.success).toBe(false);
        expect(stub.calls.some((c) => c.method === 'update')).toBe(false);
    });

    it('refuses to publish when the guard denies', async () => {
        denyPermission('Your role "manager" does not include "content.publish".');

        const result = await publishPageLocale('page-1', 'de');

        expect(result.success).toBe(false);
        expect(result.error).toContain('content.publish');
    });
});

describe('translation completeness report authorization', () => {
    it('requires content.read', async () => {
        const stub = createSupabaseStub({
            content_pages: [{ data: [], error: null }],
            content_page_translations: [{ data: [], error: null }],
        });
        grantPermission('content.read', stub);

        await getTranslationCompletenessReport();

        expect(authorizePermission).toHaveBeenCalledWith('content.read');
    });

    it('returns no data when the guard denies', async () => {
        denyPermission('You need to sign in to continue.');

        const report = await getTranslationCompletenessReport();

        expect(report).toEqual({ totalPages: 0, overallCompleteness: 0, pages: [] });
    });

    it('refuses a report for another organization instead of trusting the argument', async () => {
        const stub = createSupabaseStub();
        grantPermission('content.read', stub);

        const report = await getTranslationCompletenessReport('99999999-9999-9999-9999-999999999999');

        expect(report).toEqual({ totalPages: 0, overallCompleteness: 0, pages: [] });
        expect(stub.calls).toHaveLength(0);
    });

    it('counts published locales for the caller organization only', async () => {
        const stub = createSupabaseStub({
            content_pages: [{ data: [{ id: 'p1', title: 'About', workflow_state: 'draft' }], error: null }],
            content_page_translations: [{ data: [{ page_id: 'p1', locale: 'en', status: 'published' }], error: null }],
        });
        grantPermission('content.read', stub);

        const report = await getTranslationCompletenessReport(ORG);

        expect(report.totalPages).toBe(1);
        expect(report.overallCompleteness).toBe(20); // 1 of 5 supported locales
        expect(scopedByOrg(stub.calls)).toBe(true);
    });
});
