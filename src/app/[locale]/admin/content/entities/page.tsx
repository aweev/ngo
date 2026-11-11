import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { Link } from "@/lib/navigation";
import { getCampaigns } from "@/actions/campaigns";
import { getProjects } from "@/actions/projects";
import { getPartners } from "@/actions/partners";
import { getImpactMetrics } from "@/actions/impact";
import { getEvents } from "@/actions/events";
import { getMyOrganizations } from "@/actions/organization";
import { getEntityTranslationCoverage } from "@/actions/entity-translations";
import {
    ENTITY_TRANSLATION_FIELDS,
    ENTITY_DISPLAY_FIELD,
    type TranslatableEntityType,
} from "@/lib/content/entity-translations";
import EntityTranslationsPanel from "@/components/manage/entity-translations-panel";

export const dynamic = "force-dynamic";

type Item = { id: string; label: string; slug?: string | null };
type Group = { type: TranslatableEntityType; heading: string; items: Item[] };

/**
 * Translation coverage dashboard (P0 §3): every public entity type in one
 * place, with per-locale coverage and the reusable editor panel. Only the
 * published locales here are what the public site serves — drafts,
 * machine translations, and in-review rows never leak (see
 * `public_entity_translations`).
 */
export default async function EntityTranslationsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Content.Entities" });

    const [campaigns, projects, partners, metrics, events, orgs, coverage] = await Promise.all([
        getCampaigns(),
        getProjects(),
        getPartners(),
        getImpactMetrics(),
        getEvents(),
        getMyOrganizations(),
        getEntityTranslationCoverage(),
    ]);

    const groups: Group[] = [
        {
            type: "campaign",
            heading: t("type_campaign"),
            items: (campaigns.data ?? []).map((c) => ({ id: c.id, label: c.name, slug: c.slug })),
        },
        {
            type: "project",
            heading: t("type_project"),
            items: (projects.data ?? []).map((p) => ({ id: p.id, label: p.name, slug: p.slug })),
        },
        {
            type: "partner",
            heading: t("type_partner"),
            items: (partners.data ?? []).map((p) => ({ id: p.id, label: p.name })),
        },
        {
            type: "impact_metric",
            heading: t("type_impact_metric"),
            items: (metrics.data ?? []).map((m) => ({ id: m.id, label: m.name })),
        },
        {
            type: "org_event",
            heading: t("type_org_event"),
            items: (events.data ?? []).map((e) => ({ id: e.id, label: e.title, slug: e.slug })),
        },
    ];

    const memberships = orgs.data ?? [];
    const activeOrg = memberships.find((o) => o.isActive) ?? memberships[0];
    if (activeOrg) {
        groups.push({
            type: "organization",
            heading: t("type_organization"),
            items: [{ id: activeOrg.id, label: activeOrg.name ?? activeOrg.id }],
        });
    }

    const aiConfigured =
        !!process.env.CMS_TRANSLATION_PROVIDER &&
        (!!process.env.CMS_TRANSLATION_API_KEY || !!process.env.OPENAI_API_KEY);

    return (
        <div className="max-w-5xl space-y-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/content">
                        <ArrowLeft className="h-4 w-4" /> {t("back")}
                    </Link>
                </Button>
            </div>

            <PageHeader title={t("title")} description={t("description")} />

            {!aiConfigured && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{t("ai_warning")}</p>
                </div>
            )}

            {groups.map((group) => (
                <section key={group.type} className="space-y-3">
                    <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {group.heading}
                        </h2>
                        <Badge variant="secondary" className="text-[11px]">{group.items.length}</Badge>
                    </div>
                    {group.items.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t("group_empty")}</p>
                    ) : (
                        <div className="space-y-2">
                            {group.items.map((item) => (
                                <EntityTranslationsPanel
                                    key={`${group.type}:${item.id}`}
                                    entityType={group.type}
                                    entityId={item.id}
                                    entityLabel={item.label}
                                    entitySubtitle={item.slug ? `/${item.slug}` : null}
                                    fields={ENTITY_TRANSLATION_FIELDS[group.type]}
                                    displayFieldKey={ENTITY_DISPLAY_FIELD[group.type]}
                                    coverage={coverage.data[`${group.type}:${item.id}`] ?? {}}
                                    aiConfigured={aiConfigured}
                                />
                            ))}
                        </div>
                    )}
                </section>
            ))}
        </div>
    );
}
