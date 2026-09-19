import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { NetworkHero } from "@/components/about/partners/network-hero";
import { PartnerGrid, PartnerLogo } from "@/components/about/partners/partner-grid";
import { PartnershipCTA } from "@/components/about/partners/partnership-cta";
import { getPublicContentPage, getPublicPartners } from "@/actions/public";

export const revalidate = 300;

function isValidExternalUrl(value: string | null | undefined): value is string {
    if (!value) return false;
    try {
        const url = new URL(value);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Partners.Hero" });
    return {
        title: t("title"),
        description: t("subtitle")
    };
}

export default async function PartnersPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Partners" });

    // Admin command center: /admin/partners (public_partners view).
    // No placeholder logos — tiers hide when the DB is empty.
    const [{ data }, { data: deckPage }] = await Promise.all([
        getPublicPartners(locale),
        getPublicContentPage("partnership-deck", locale),
    ]);
    const deckContent = (deckPage?.content ?? {}) as Record<string, unknown>;
    const deckHref = typeof deckContent.file_url === "string" && deckContent.file_url.trim()
        ? deckContent.file_url.trim()
        : typeof deckContent.url === "string" && deckContent.url.trim()
          ? deckContent.url.trim()
          : undefined;

    const logos: PartnerLogo[] = (data ?? [])
        .filter((p) => p.name && p.logo_url)
        .map((p) => ({
            id: p.id,
            name: p.name,
            logo: p.logo_url as string,
            ...(isValidExternalUrl(p.website) ? { website: p.website } : {}),
            _type: p.type,
            _partnership: p.partnership_type,
        } as PartnerLogo & { _type: string; _partnership: string }));

    const isStrategic = (p: PartnerLogo & { _type?: string; _partnership?: string }) =>
        ["government", "funder", "institutional", "strategic"].includes(
            (p._type ?? "").toLowerCase()
        ) ||
        ["strategic", "institutional", "funder"].includes((p._partnership ?? "").toLowerCase());

    const isCorporate = (p: PartnerLogo & { _type?: string; _partnership?: string }) =>
        ["corporate", "sponsor", "business"].includes((p._type ?? "").toLowerCase()) ||
        ["corporate", "sponsor", "csr"].includes((p._partnership ?? "").toLowerCase());

    const tier1 = logos.filter((p) => isStrategic(p as PartnerLogo & { _type?: string; _partnership?: string }));
    const tier2 = logos.filter(
        (p) => !isStrategic(p as PartnerLogo & { _type?: string; _partnership?: string }) && isCorporate(p as PartnerLogo & { _type?: string; _partnership?: string })
    );
    const tier3 = logos.filter(
        (p) => !isStrategic(p as PartnerLogo & { _type?: string; _partnership?: string }) && !isCorporate(p as PartnerLogo & { _type?: string; _partnership?: string })
    );

    return (
        <main className="pt-20">
            <NetworkHero />

            <div className="space-y-12 pb-12">
                {tier1.length > 0 && (
                    <PartnerGrid
                        title={t("Tiers.strategic")}
                        description={t("Tiers.strategic_desc")}
                        partners={tier1}
                        tier="tier1"
                    />
                )}

                {tier2.length > 0 && (
                    <PartnerGrid
                        title={t("Tiers.corporate")}
                        description={t("Tiers.corporate_desc")}
                        partners={tier2}
                        tier="tier2"
                    />
                )}

                {tier3.length > 0 && (
                    <PartnerGrid
                        title={t("Tiers.community")}
                        description={t("Tiers.community_desc")}
                        partners={tier3}
                        tier="tier3"
                    />
                )}

                {/* Unclassified admin data: show everything under Strategic so it is never lost. */}
                {tier1.length === 0 && tier2.length === 0 && tier3.length === 0 && logos.length > 0 && (
                    <PartnerGrid
                        title={t("Tiers.strategic")}
                        description={t("Tiers.strategic_desc")}
                        partners={logos}
                        tier="tier1"
                    />
                )}
            </div>

            <PartnershipCTA deckHref={deckHref} />
        </main>
    );
}
