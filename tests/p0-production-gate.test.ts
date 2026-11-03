import { describe, expect, it } from 'vitest';
import {
    ENTITY_TYPES,
    canPublishEntityLocale,
    isEntityType,
    validateEntityFields,
} from '@/lib/content/entity-translations';
import { canPublishLocale } from '@/lib/content/translations';
import { productionReadinessGaps } from '@/lib/env';

describe('P0: editorial entity translations', () => {
    it('covers news, stories, and volunteer roles', () => {
        for (const t of ['news_article', 'impact_story', 'volunteer_role'] as const) {
            expect(ENTITY_TYPES).toContain(t);
            expect(isEntityType(t)).toBe(true);
        }
    });

    it('validates per-entity fields and enforces the display gate', () => {
        expect(validateEntityFields('news_article', { title: 'Hello', excerpt: 'x' }).ok).toBe(true);
        expect(validateEntityFields('news_article', { title: '' }).ok).toBe(true); // schema allows empty; publish gate blocks
        expect(canPublishEntityLocale('news_article', { title: '' }, 'approved').ok).toBe(false);
        expect(canPublishEntityLocale('news_article', { title: 'Hello' }, 'approved').ok).toBe(true);
        expect(canPublishEntityLocale('impact_story', { title: 'S' }, 'draft').ok).toBe(false);
        expect(validateEntityFields('volunteer_role', { title: 'Mentor', location: 'Berlin' }).ok).toBe(true);
    });
});

describe('P0: CMS locale publish gate', () => {
    it('requires approval + title', () => {
        expect(canPublishLocale({ title: 'Hi' }, 'approved').ok).toBe(true);
        expect(canPublishLocale({ title: 'Hi' }, 'machine_translated').ok).toBe(false);
        expect(canPublishLocale({ title: '' }, 'approved').ok).toBe(false);
    });
});

describe('P0: production readiness gate', () => {
    it('is silent outside production', () => {
        expect(productionReadinessGaps()).toEqual([]);
    });
});
