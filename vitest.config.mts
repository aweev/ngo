import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Vitest runs the pure/unit layer (permission model, sanitizer, rate limiter,
 * i18n helpers, route builders). These are the pure modules that guards,
 * server actions, and render paths depend on, so they must never regress.
 * Browser-dependent behaviour is covered by Playwright (see e2e/).
 *
 * `.mts` keeps the config ESM without flipping the package to `"type": "module"`.
 */
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        environment: 'node',
        include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
        exclude: ['node_modules', '.next', 'e2e'],
        reporters: ['default'],
    },
});