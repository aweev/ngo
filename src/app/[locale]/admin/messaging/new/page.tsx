import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { NewThreadForm } from "./new-thread-form";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Messaging.New" });
    return { title: t("metadata_title"), description: t("metadata_description") };
}

export default async function NewMessagingThreadPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Messaging.New" });
    return (
        <div className="space-y-6">
            <PageHeader title={t("page_title")} description={t("page_description")} />
            <NewThreadForm />
        </div>
    );
}
