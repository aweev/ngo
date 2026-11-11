import { beforeEach, describe, expect, it, vi } from 'vitest';

// Server Action: the request-scoped pieces are mocked so the permission-gating
// contract can be asserted in isolation, without a Next.js request or a live
// Supabase project.
vi.mock('@/lib/auth/guards', () => ({ authorizeOrganization: vi.fn() }));

import { authorizeOrganization } from '@/lib/auth/guards';
import { PERMISSIONS, type Permission } from '@/lib/auth/permissions';
import { getBriefing } from '@/actions/briefing';

interface RecordedCall {
    table: string;
    method: string;
    args: unknown[];
}

interface QueryResult {
    data?: unknown;
    error?: unknown;
    /** `head: true` count queries resolve with a count, not rows. */
    count?: number | null;
}

/**
 * Minimal PostgREST-shaped stub:
 * every method records the call and returns the same awaitable proxy, so
 * `await supabase.from(t).select(...).eq(a, b)` resolves from a FIFO queue.
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
                                resolve(queue.shift() ?? { data: null, error: null, count: 0 });
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

function login(
    stub: ReturnType<typeof createSupabaseStub>,
    effective: Permission[],
    role = 'manager',
    name = 'Ada',
) {
    vi.mocked(authorizeOrganization).mockResolvedValue({
        ok: true,
        code: 'ok',
        error: null,
        supabase: stub.client,
        userId: USER,
        organizationId: ORG,
        role,
        organizationName: 'AWE',
        hasOrganization: true,
        effective: new Set<Permission>(effective),
        customRoleIds: [],
        context: {
            supabase: stub.client,
            userId: USER,
            organizationId: ORG,
            role,
            name,
            hasOrganization: true,
        },
    } as never);
}

function deny(error = 'You need to sign in to continue.') {
    vi.mocked(authorizeOrganization).mockResolvedValue({
        ok: false,
        code: 'unauthenticated',
        error,
    } as never);
}

function tablesQueried(calls: RecordedCall[]): Set<string> {
    return new Set(calls.map((call) => call.table));
}

/** Recorded `eq(column, value)` filters matching both column and value. */
function filters(calls: RecordedCall[], column: string, value: unknown): RecordedCall[] {
    return calls.filter((call) => call.method === 'eq' && call.args[0] === column && call.args[1] === value);
}

const FULL_ACCESS: Permission[] = [
    PERMISSIONS.automations.read,
    PERMISSIONS.workflows.read,
    PERMISSIONS.members.manage,
    PERMISSIONS.finance.approve,
    PERMISSIONS.impact.manage,
];

const ANY_ORG_QUEUE = {
    automation_executions: [{ count: 1, error: null }],
    automation_rules: [{ count: 1, error: null }],
    workflow_instances: [{ count: 1, error: null }],
    role_requests: [{ count: 1, error: null }],
    expenses: [{ count: 1, error: null }],
    field_reports: [{ count: 1, error: null }],
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('getBriefing permission gating', () => {
    it('returns nothing for an unauthenticated caller', async () => {
        deny();

        const result = await getBriefing();

        expect(result.data).toBeNull();
        expect(result.error).toContain('sign in');
    });

    it('gives a plain member only their own unread notifications', async () => {
        const stub = createSupabaseStub({ notifications: [{ count: 3, error: null }] });
        login(stub, []);

        const result = await getBriefing();

        expect(result.data?.items).toEqual([
            { id: 'unread_notifications', count: 3, href: '/dashboard/settings', tone: 'info' },
        ]);
        // Without any module permission, no other table is touched at all.
        expect(tablesQueried(stub.calls)).toEqual(new Set(['notifications']));
    });

    it('adds only the queues the caller can action (finance reviewer)', async () => {
        const stub = createSupabaseStub({
            notifications: [{ count: 0, error: null }],
            expenses: [{ count: 2, error: null }],
        });
        login(stub, [PERMISSIONS.finance.approve]);

        const result = await getBriefing();

        expect(tablesQueried(stub.calls)).toEqual(new Set(['notifications', 'expenses']));
        expect(result.data?.items).toEqual([
            { id: 'expenses_approval', count: 2, href: '/admin/financial', tone: 'warning' },
        ]);
    });

    it('gives an owner-level caller every queue, with failures and approvals first', async () => {
        const stub = createSupabaseStub({
            notifications: [{ count: 1, error: null }],
            automation_executions: [{ count: 2, error: null }],
            automation_rules: [{ count: 3, error: null }],
            workflow_instances: [{ count: 4, error: null }],
            role_requests: [{ count: 5, error: null }],
            expenses: [{ count: 6, error: null }],
            field_reports: [{ count: 7, error: null }],
        });
        login(stub, FULL_ACCESS, 'owner', 'Grace');

        const result = await getBriefing();

        expect(result.data?.items.map((item) => item.id)).toEqual([
            'unread_notifications',
            'failed_automations',
            'pending_workflows',
            'pending_access_requests',
            'expenses_approval',
            'field_reports_review',
            'paused_automations',
        ]);
        expect(result.data?.items.find((item) => item.id === 'failed_automations')?.count).toBe(2);
        expect(result.data?.items.find((item) => item.id === 'field_reports_review')?.count).toBe(7);
    });

    it('scopes every count: org-wide queues by organization, the personal one by recipient', async () => {
        const stub = createSupabaseStub({ notifications: [{ count: 1, error: null }], ...ANY_ORG_QUEUE });
        login(stub, FULL_ACCESS);

        await getBriefing();

        // Six org-wide queues, each filtered by the caller's organization...
        expect(filters(stub.calls, 'organization_id', ORG)).toHaveLength(6);
        // ...and the personal queue filtered by the caller, never by org.
        expect(filters(stub.calls, 'recipient_id', USER)).toHaveLength(1);
        expect(filters(stub.calls, 'organization_id', USER)).toHaveLength(0);
    });

    it('counts only DISABLED rules for the paused-automations prompt', async () => {
        const stub = createSupabaseStub({
            notifications: [{ count: 0, error: null }],
            automation_executions: [{ count: 0, error: null }],
            automation_rules: [{ count: 1, error: null }],
        });
        login(stub, [PERMISSIONS.automations.read]);

        const result = await getBriefing();

        expect(filters(stub.calls, 'is_enabled', false)).toHaveLength(1);
        expect(result.data?.items).toEqual([
            { id: 'paused_automations', count: 1, href: '/admin/automations', tone: 'info' },
        ]);
    });
});
