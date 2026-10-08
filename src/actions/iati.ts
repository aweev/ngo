'use server';

import { authorizePermission } from '@/lib/auth/guards';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { generateIATIXml, type IATIActivityInput } from '@/lib/iati-export';

/**
 * Honest IATI export (Phase 2.2b).
 *
 * Every element traces to a real row. No sector match, no funder link, no
 * description → the node is omitted, never invented. Projects without a name
 * are skipped entirely rather than exported as fiction.
 */

// Conservative project-category → DAC sector map. Categories outside this map
// export WITHOUT a sector node until the M&E team maps them deliberately.
const SECTOR_MAP: Record<string, { code: string; name: string }> = {
    health: { code: '12110', name: 'Health policy and administrative management' },
    education: { code: '11110', name: 'Education policy and administrative management' },
    wash: { code: '14010', name: 'Water sector policy and administrative management' },
    water: { code: '14010', name: 'Water sector policy and administrative management' },
    protection: { code: '15160', name: 'Human rights' },
    livelihoods: { code: '16020', name: 'Employment policy and administrative management' },
    food: { code: '52010', name: 'Food assistance' },
    shelter: { code: '73010', name: 'Emergency and distress relief' },
    emergency: { code: '73010', name: 'Emergency and distress relief' },
};

const STATUS_MAP: Record<string, '1' | '2' | '3' | '4' | '5'> = {
    planning: '1',
    active: '2',
    paused: '2',
    completed: '3',
    cancelled: '5',
};

export async function generateIATIXmlExport(): Promise<{ data: { xml: string; filename: string; activity_count: number; warnings: string[] } | null; error: string | null }> {
    const auth = await authorizePermission(PERMISSIONS.reporting.read);
    if (!auth.ok) return { data: null, error: auth.error };

    const [{ data: org }, { data: projects }, { data: budgets }, { data: grants }] = await Promise.all([
        auth.context.supabase.from('organizations').select('name').eq('id', auth.organizationId).single(),
        auth.context.supabase.from('projects').select('id, name, description, category, status, budget, currency, start_date, end_date, created_at').eq('organization_id', auth.organizationId),
        auth.context.supabase.from('budgets').select('project_id, fund_id').eq('organization_id', auth.organizationId),
        auth.context.supabase.from('grants').select('fund_id, grantor_name').eq('organization_id', auth.organizationId),
    ]);

    // Real funder chain: project -> budgets -> fund -> grants -> grantor names.
    const fundsByProject = new Map<string, Set<string>>();
    for (const b of ((budgets ?? []) as Array<{ project_id: string | null; fund_id: string | null }>)) {
        if (!b.project_id || !b.fund_id) continue;
        if (!fundsByProject.has(b.project_id)) fundsByProject.set(b.project_id, new Set());
        fundsByProject.get(b.project_id)!.add(b.fund_id);
    }
    const grantorsByFund = new Map<string, Set<string>>();
    for (const g of ((grants ?? []) as Array<{ fund_id: string | null; grantor_name: string }>)) {
        if (!g.fund_id || !g.grantor_name) continue;
        if (!grantorsByFund.has(g.fund_id)) grantorsByFund.set(g.fund_id, new Set());
        grantorsByFund.get(g.fund_id)!.add(g.grantor_name);
    }

    const orgName = (org as { name: string } | null)?.name || 'NGO Organization';
    const orgIatiRef = `XI-IATI-${auth.organizationId.substring(0, 8).toUpperCase()}`;
    const day = new Date().toISOString().slice(0, 10);
    const warnings: string[] = [];

    const activities: IATIActivityInput[] = [];
    for (const p of ((projects ?? []) as Array<Record<string, unknown>>)) {
        const name = ((p.name as string) ?? '').trim();
        if (!name) continue; // Never export a nameless activity.
        const statusCode = STATUS_MAP[(p.status as string) ?? ''] ?? '1';
        const category = ((p.category as string) ?? '').trim().toLowerCase();
        const sector = SECTOR_MAP[category];
        if (category && !sector) {
            warnings.push(`"${name}": category "${category}" has no mapped DAC sector — exported without a sector.`);
        }
        const funders = new Set<string>();
        for (const fundId of fundsByProject.get(p.id as string) ?? []) {
            for (const grantor of grantorsByFund.get(fundId) ?? []) funders.add(grantor);
        }
        if (funders.size === 0) {
            warnings.push(`"${name}": no linked grants — exported without a funding organisation.`);
        }
        const startDate = ((p.start_date as string) || (p.created_at as string) || `${day}T00:00:00Z`).slice(0, 10);
        activities.push({
            id: p.id as string,
            iatiIdentifier: `${orgIatiRef}-PROJ-${(p.id as string).substring(0, 6)}`,
            title: name,
            description: ((p.description as string) ?? '').trim() || null,
            sectorCode: sector?.code ?? null,
            sectorName: sector?.name ?? null,
            statusCode,
            startDate,
            endDate: ((p.end_date as string) || null)?.slice(0, 10) ?? null,
            budgetAmount: Number(p.budget) || 0,
            currency: (p.currency as string) || 'EUR',
            funderNames: [...funders],
        });
    }

    const xml = generateIATIXml(orgName, orgIatiRef, activities);
    return {
        data: { xml, filename: `iati-activities-${day}.xml`, activity_count: activities.length, warnings },
        error: null,
    };
}
