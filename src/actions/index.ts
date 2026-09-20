/**
 * Server Actions barrel.
 *
 * Re-exports every action module so consumers can import from '@/actions'.
 * Each underlying module is a 'use server' module and applies its own
 * authorization guards.
 */
export * from './auth';
export * from './organization';
export * from './automations';
export * from './campaigns';
export * from './content';
export * from './content-blocks';
export * from './donations';
export * from './media';
export * from './donors';
export * from './entity-translations';
export * from './events';
export * from './financial';
export * from './forms';
export * from './governance';
export * from './impact';
export * from './integrations';
export * from './messaging';
export * from './notifications';
export * from './partners';
export * from './projects';
export * from './public';
export * from './rbac';
export * from './reporting';
export * from './scheduling';
export * from './tags';
export * from './volunteers';
export * from './workers';
export * from './workflows';
export * from './email';
