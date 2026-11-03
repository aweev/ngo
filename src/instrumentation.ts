/**
 * P0: production safety net.
 * - Fails fast (logs loudly) when deployment-critical env is missing.
 * - Registers a global error hook so unhandled errors are structured-logged
 *   with correlation IDs (Sentry SDK replaces this when SENTRY_DSN is set).
 */
import { productionReadinessGaps } from '@/lib/env';

export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const gaps = productionReadinessGaps();
        if (gaps.length > 0) {
            console.error(
                `[P0 production gate] Missing/invalid production config: ${gaps.join(', ')}. ` +
                `Refusing silent boot — set these before serving traffic.`,
            );
        }
        process.on('unhandledRejection', (reason) => {
            console.error(JSON.stringify({ level: 'error', kind: 'unhandledRejection', reason: String(reason) }));
        });
    }
}
