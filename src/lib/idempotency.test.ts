import { describe, expect, it } from 'vitest';
import { buildIdempotencyKey, dedupeInflight, isIdempotencyConflict, payloadDigest } from '@/lib/idempotency';

describe('idempotency helpers', () => {
    it('builds readable keys and skips empties', () => {
        expect(buildIdempotencyKey('donation', 'sess_1', 'completed')).toBe('donation:sess_1:completed');
        expect(buildIdempotencyKey('import', null, 'row-3', undefined, '')).toBe('import:row-3');
    });

    it('digests identical payloads identically', async () => {
        const a = await payloadDigest({ x: 1 });
        const b = await payloadDigest({ x: 1 });
        const c = await payloadDigest({ x: 2 });
        expect(a).toBe(b);
        expect(a).not.toBe(c);
        expect(a).toHaveLength(64);
    });

    it('recognises Postgres unique violations as duplicates', () => {
        expect(isIdempotencyConflict({ code: '23505' })).toBe(true);
        expect(isIdempotencyConflict({ code: '42501' })).toBe(false);
        expect(isIdempotencyConflict(null)).toBe(false);
    });

    it('collapses concurrent duplicates onto one execution', async () => {
        let runs = 0;
        const task = () =>
            dedupeInflight('k1', async () => {
                runs += 1;
                await new Promise((r) => setTimeout(r, 10));
                return runs;
            });
        const [first, second] = await Promise.all([task(), task()]);
        expect(runs).toBe(1);
        expect(first.duplicate).toBe(false);
        expect(second.duplicate).toBe(true);
    });
});
