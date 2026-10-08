import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { getWorkers } from "@/actions/workers";
import { getVolunteers } from "@/actions/volunteers";
import { getPartners } from "@/actions/partners";
import { ReviewForm } from "./review-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Reviews.New" });
    return { title: t("metadata_title"), description: t("metadata_description") };
}

function displayName(row: Record<string, unknown>): string {
    const first = typeof row.first_name === "string" ? row.first_name : "";
    const last = typeof row.last_name === "string" ? row.last_name : "";
    const joined = `${first} ${last}`.trim();
    if (joined) return joined;
    if (typeof row.name === "string" && row.name) return row.name;
    if (typeof row.email === "string") return row.email;
    return "Unnamed";
}

export default async function NewReviewPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Reviews.New" });
    const [{ data: workers }, { data: volunteers }, { data: partners }] = await Promise.all([
        getWorkers(),
        getVolunteers(),
        getPartners(),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader title={t("page_title")} description={t("page_description")} />
            <ReviewForm
                subjects={{
                    worker: (workers ?? []).map((w) => ({ id: w.id as string, label: displayName(w as unknown as Record<string, unknown>) })),
                    volunteer: (volunteers ?? []).map((v) => ({ id: v.id as string, label: displayName(v as unknown as Record<string, unknown>) })),
                    partner: (partners ?? []).map((p) => ({ id: p.id as string, label: displayName(p as unknown as Record<string, unknown>) })),
                }}
            />
        </div>
    );
}
