import { describe, expect, it } from 'vitest';
import { isObject, isString, isValidLocale } from '@/lib/type-guards';
import { cn } from '@/lib/utils';

describe('type guards', () => {
    it('isObject accepts plain objects only', () => {
        expect(isObject({})).toBe(true);
        expect(isObject({ a: 1 })).toBe(true);
        expect(isObject([])).toBe(false);
        expect(isObject(null)).toBe(false);
        expect(isObject('x')).toBe(false);
    });

    it('isString narrows strings only', () => {
        expect(isString('x')).toBe(true);
        expect(isString('')).toBe(true);
        expect(isString(1)).toBe(false);
    });

    it('isValidLocale only accepts members of the allow-list', () => {
        const locales = ['en', 'de'] as const;
        expect(isValidLocale('de', locales)).toBe(true);
        expect(isValidLocale('fr', locales)).toBe(false);
        expect(isValidLocale(42, locales)).toBe(false);
    });
});

describe('cn', () => {
    it('joins classes and lets later utilities win', () => {
        expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('ignores falsy class values', () => {
        expect(cn('a', false, undefined, null, 'c')).toBe('a c');
    });
});