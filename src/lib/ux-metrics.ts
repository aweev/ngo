/**
 * UX outcome metrics (audit Wave 4: measure task completion, error recovery,
 * abandonment, and trust — not only clicks).
 *
 * Lightweight, privacy-preserving: counts and durations per task, no
 * keystrokes or personal data. The admin "Workspace health" card reads the
 * in-memory aggregates; a future warehouse sink can attach via `report()`.
 */

export type UxOutcome = 'completed' | 'abandoned' | 'error_recovered' | 'error_unrecovered';

export interface UxTaskSample {
    task: string;
    outcome: UxOutcome;
    durationMs: number;
    at: string;
}

const samples: UxTaskSample[] = [];
const listeners = new Set<(samples: readonly UxTaskSample[]) => void>();

function emit() {
    for (const fn of listeners) {
        try {
            fn(samples);
        } catch {
            /* listener failure must not break the app */
        }
    }
}

/** Records one finished task attempt (completion, abandonment, or recovery). */
export function recordUxTask(task: string, outcome: UxOutcome, durationMs: number): UxTaskSample {
    const sample: UxTaskSample = { task, outcome, durationMs, at: new Date().toISOString() };
    samples.push(sample);
    if (samples.length > 500) samples.splice(0, samples.length - 500);
    emit();
    return sample;
}

/** Starts a timer; call .finish(outcome) when the user completes or leaves. */
export function startUxTask(task: string) {
    const startedAt = Date.now();
    return {
        finish: (outcome: UxOutcome) => recordUxTask(task, outcome, Date.now() - startedAt),
    };
}

export interface UxSummary {
    task: string;
    attempts: number;
    completionRate: number;
    abandonmentRate: number;
    errorRecoveryRate: number;
    medianDurationMs: number;
}

/** Aggregates samples per task for the workspace-health view. */
export function summarizeUx(sampleset: readonly UxTaskSample[] = samples): UxSummary[] {
    const byTask = new Map<string, UxTaskSample[]>();
    for (const s of sampleset) {
        const list = byTask.get(s.task) ?? [];
        list.push(s);
        byTask.set(s.task, list);
    }
    return [...byTask.entries()].map(([task, list]) => {
        const attempts = list.length;
        const completed = list.filter((s) => s.outcome === 'completed').length;
        const abandoned = list.filter((s) => s.outcome === 'abandoned').length;
        const errors = list.filter((s) => s.outcome.startsWith('error'));
        const recovered = list.filter((s) => s.outcome === 'error_recovered').length;
        const durations = list.map((s) => s.durationMs).sort((a, b) => a - b);
        return {
            task,
            attempts,
            completionRate: attempts ? completed / attempts : 0,
            abandonmentRate: attempts ? abandoned / attempts : 0,
            errorRecoveryRate: errors.length ? recovered / errors.length : 1,
            medianDurationMs: durations.length ? durations[Math.floor(durations.length / 2)] : 0,
        };
    });
}

export function subscribeUx(fn: (samples: readonly UxTaskSample[]) => void): () => void {
    listeners.add(fn);
    return () => {
        listeners.delete(fn);
    };
}

/** Test-only: clears the in-memory buffer. */
export function __clearUxSamples(): void {
    samples.length = 0;
}
