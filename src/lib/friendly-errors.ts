/**
 * Plain-language errors (audit Wave 4: humane design).
 *
 * Every failure shown to staff names: what happened in plain words, who owns
 * it, and the next step. Technical codes stay in the logs / audit trail —
 * never as the primary message.
 */

export interface FriendlyError {
    /** Short human sentence, no jargon. */
    message: string;
    /** Team or role that owns the fix (e.g. "Finance officer"). */
    owner: string;
    /** Concrete next step the user can take now. */
    nextStep: string;
    /** Stable code for logs, support tickets, and audit events. */
    code: string;
}

const KNOWN: Array<{ match: RegExp; friendly: Omit<FriendlyError, 'code'> }> = [
    {
        match: /row-level security|rls|permission denied|not authorized|does not include/i,
        friendly: {
            message: 'You do not have permission for this. Nothing was changed.',
            owner: 'Workspace admin',
            nextStep: 'Ask a workspace admin to grant the needed role, then try again.',
        },
    },
    {
        match: /unique|duplicate|already exists|23505/i,
        friendly: {
            message: 'This was already saved. Nothing was duplicated.',
            owner: 'You',
            nextStep: 'Refresh the list — your earlier entry is there.',
        },
    },
    {
        match: /network|fetch failed|timeout|abort/i,
        friendly: {
            message: 'The connection dropped before we could confirm. Nothing is lost yet.',
            owner: 'You',
            nextStep: 'Check your connection and retry. If it persists, contact support.',
        },
    },
    {
        match: /stripe|payment|webhook/i,
        friendly: {
            message: 'The payment provider did not confirm yet. The donation stays pending.',
            owner: 'Finance officer',
            nextStep: 'Wait a minute and refresh. Finance can reconcile in Stripe if needed.',
        },
    },
    {
        match: /validation|invalid|schema|zod/i,
        friendly: {
            message: 'Some details need fixing before we can save.',
            owner: 'You',
            nextStep: 'Review the highlighted fields and try again.',
        },
    },
];

export function toFriendlyError(raw: unknown, code = 'unexpected'): FriendlyError {
    const text = raw instanceof Error ? `${raw.message}\n${raw.cause ?? ''}` : String(raw ?? '');
    for (const { match, friendly } of KNOWN) {
        if (match.test(text)) return { ...friendly, code };
    }
    return {
        message: 'Something went wrong on our side. Nothing was changed.',
        owner: 'Support team',
        nextStep: 'Try again. If it keeps happening, contact support with this code.',
        code,
    };
}
