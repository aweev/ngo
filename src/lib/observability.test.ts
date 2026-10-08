import { describe, expect, it } from 'vitest';
import { SLOS, slosAsPrometheusYaml, traceHeaders } from '@/lib/observability';

describe('observability', () => {
    it('defines page-level SLOs for outbox and dead letters', () => {
        const names = SLOS.map((s) => s.name);
        expect(names).toContain('outbox-drain');
        expect(names).toContain('dead-letter-growth');
        expect(SLOS.filter((s) => s.severity === 'page').length).toBeGreaterThanOrEqual(2);
    });

    it('renders Prometheus alert YAML', () => {
        const yaml = slosAsPrometheusYaml();
        expect(yaml).toContain('groups:');
        expect(yaml).toContain('ngo_outbox_pending');
    });

    it('propagates correlation + traceparent headers', () => {
        const headers = traceHeaders('corr_abc123');
        expect(headers['x-correlation-id']).toBe('corr_abc123');
        expect(headers.traceparent.startsWith('00-')).toBe(true);
    });
});
