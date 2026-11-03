import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { TemplateGallery } from "@/components/admin/template-gallery";
import { getAutomationTemplates } from "@/actions/automations";

export const dynamic = "force-dynamic";

export default async function TemplatesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Templates" });
    const { data: templates } = await getAutomationTemplates();

    return (
        <div className="space-y-6">
            <PageHeader title={t("title")} description={t("description")} />
            <TemplateGallery dbTemplates={templates ?? []} />
        </div>
    );
}
