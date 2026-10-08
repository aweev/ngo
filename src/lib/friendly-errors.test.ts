import { describe, expect, it } from 'vitest';
import { toFriendlyError } from '@/lib/friendly-errors';

describe('toFriendlyError', () => {
    it('translates permission failures into ownership + next step', () => {
        const err = toFriendlyError(new Error('permission denied for table donations'), 'donations.load');
        expect(err.message).toMatch(/permission/i);
        expect(err.owner).toBeTruthy();
        expect(err.nextStep).toBeTruthy();
        expect(err.code).toBe('donations.load');
    });

    it('treats unique violations as already-saved', () => {
        const err = toFriendlyError('duplicate key value violates unique constraint "uq_notifications_idem"');
        expect(err.message).toMatch(/already saved/i);
    });

    it('falls back to a safe generic message', () => {
        const err = toFriendlyError('??? totally unknown ???');
        expect(err.message).toBeTruthy();
        expect(err.owner).toBe('Support team');
    });
});
