import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { NotificationComposer } from "@/components/admin/notification-composer";

export const dynamic = "force-dynamic";

export default async function NewNotificationTemplatePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Notifications.templates.New" });
    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
            />
            <NotificationComposer />
        </div>
    );
}
