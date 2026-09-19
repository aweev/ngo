import type { ContentBlockType } from '@/types/domain/content';

/**
 * Block types available in the CMS block editor. Lives in lib (not the
 * 'use server' action module) because server-action files may only
 * export async functions.
 */
export const BLOCK_TYPES: readonly ContentBlockType[] = [
    'hero',
    'text',
    'image',
    'gallery',
    'cta',
    'embed',
    'custom',
];
