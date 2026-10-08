'use server';

import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';

/**
 * AI assistance — honest by construction (audit Wave 0, item 4).
 *
 * There is NO real model provider wired into this deployment. The previous
 * implementation produced deterministic placeholder text claiming
 * "5,000 verified beneficiaries" and "100% transparent audit lineage" —
 * fabricated numbers presented as facts. That is removed.
 *
 * What remains:
 *  - Disabled by default. `AI_COPILOT_ENABLED=true` opts a deployment in.
 *  - When enabled, the actions return a clearly-labelled DRAFT assembled
 *    only from the caller's own inputs, with full provenance
 *    (provider, timestamp, confidence, "requires human review").
 *  - No beneficiary counts, impact numbers, legal statements, or financial
 *    outcomes are ever invented. Open spots are left for the human reviewer.
 */

const DISABLED_ERROR =
    'The AI copilot is disabled in this deployment. No simulated output is produced. Connect a real provider and set AI_COPILOT_ENABLED=true to enable it.';

function isAiCopilotEnabled(): boolean {
    return process.env.AI_COPILOT_ENABLED === 'true';
}

export interface AiProvenance {
    /** What produced this text. Never claims to run a model we do not run. */
    provider: 'rule-based-template';
    model: string | null;
    generatedAt: string;
    /** null on purpose: a deterministic template has no meaningful confidence. */
    confidence: number | null;
    requiresHumanReview: true;
    /** The exact caller inputs this draft was assembled from. */
    sourceInputs: Record<string, string>;
}

function provenance(sourceInputs: Record<string, string>): AiProvenance {
    return {
        provider: 'rule-based-template',
        model: null,
        generatedAt: new Date().toISOString(),
        confidence: null,
        requiresHumanReview: true,
        sourceInputs,
    };
}

export interface GrantProposalOutput {
    executiveSummary: string;
    problemStatement: string;
    proposedSolution: string;
    expectedImpact: string;
    requestedBudget: string;
    provenance: AiProvenance;
}

export async function generateGrantNarrative(
    projectName: string,
    targetAudience: string,
    grantAmount: number,
    funderFocus: string,
): Promise<{ data: GrantProposalOutput | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    if (!isAiCopilotEnabled()) return { data: null, error: DISABLED_ERROR };

    const inputs = {
        projectName: projectName.trim(),
        targetAudience: targetAudience.trim(),
        grantAmount: Number.isFinite(grantAmount) && grantAmount > 0 ? String(Math.round(grantAmount)) : '',
        funderFocus: funderFocus.trim(),
    };
    if (!inputs.projectName || !inputs.targetAudience) {
        return { data: null, error: 'Project name and target audience are required.' };
    }

    const amount = inputs.grantAmount ? `$${Number(inputs.grantAmount).toLocaleString()}` : '[amount]';
    const alignment = inputs.funderFocus ? `, aligned with ${inputs.funderFocus}` : '';

    const data: GrantProposalOutput = {
        executiveSummary: `DRAFT — The proposed project "${inputs.projectName}" aims to serve ${inputs.targetAudience}${alignment}. Edit every section before submission; nothing here has been verified by the organization.`,
        problemStatement: `DRAFT — Describe the specific, evidenced problem affecting ${inputs.targetAudience}. State beneficiary numbers only when they come from verified program data.`,
        proposedSolution: `DRAFT — Describe the intervention for "${inputs.projectName}", who delivers it, and how progress will be evidenced.`,
        expectedImpact: '[To be completed with verified targets from program data — the system cannot predict impact.]',
        requestedBudget: `${amount} requested. Allocation across budget lines must be completed by the finance team — the template does not invent percentages.`,
        provenance: provenance(inputs),
    };

    return { data, error: null };
}

export interface FieldVoiceUpdateOutput {
    parsedMetric: string;
    count: number;
    narrative: string;
    provenance: AiProvenance;
}

export async function synthesizeFieldVoiceUpdate(
    voiceText: string,
    locationTag: string,
): Promise<{ data: FieldVoiceUpdateOutput | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.impact.manage);
    if (!auth.ok) return { data: null, error: auth.error };

    if (!isAiCopilotEnabled()) return { data: null, error: DISABLED_ERROR };

    // Deterministic keyword rules — explicitly NOT an AI model. The result is
    // a transcription aid for a human reviewer, never a verified metric.
    const numberMatch = voiceText.match(/\d+/);
    const count = numberMatch ? Number.parseInt(numberMatch[0], 10) : 0;

    let parsedMetric = 'Uncategorized';
    if (/water|filter|liter/i.test(voiceText)) parsedMetric = 'Clean Water Supply';
    else if (/meal|food|ration/i.test(voiceText)) parsedMetric = 'Nutritious Meals';
    else if (/patient|vaccine|clinic|health/i.test(voiceText)) parsedMetric = 'Medical Care Visits';

    const data: FieldVoiceUpdateOutput = {
        parsedMetric,
        count,
        narrative: `Recorded at ${locationTag}: "${voiceText}". Transcribed by keyword rules as ${count} × ${parsedMetric}. A reviewer must confirm the category and count before this becomes a measurement.`,
        provenance: provenance({ voiceText: voiceText.trim(), locationTag: locationTag.trim() }),
    };

    return { data, error: null };
}

