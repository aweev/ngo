import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { ImpactMetricForm } from "./impact-metric-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Impact.metricForm" });
    return { title: t("metadata_title"), description: t("metadata_description") };
}

export default async function NewImpactMetricPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Impact.metricForm" });

    return (
        <div className="space-y-6">
            <PageHeader title={t("page_title")} description={t("page_description")} />
            <ImpactMetricForm />
        </div>
    );
}
