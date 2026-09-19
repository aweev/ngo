import { notFound } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { NotificationComposer } from "@/components/admin/notification-composer";
import { getNotificationTemplate } from "@/actions/notifications";

export const dynamic = "force-dynamic";

export default async function NotificationTemplateDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { id } = await params;
    const { data: template } = await getNotificationTemplate(id);

    if (!template) notFound();

    return (
        <div className="space-y-6">
            <PageHeader
                title={template.name}
                description={`Channel: ${template.channel} · ${template.is_system ? "System template" : "Custom template"}`}
            />
            <NotificationComposer
                templateId={template.id}
                initial={{
                    name: template.name,
                    slug: template.slug,
                    description: template.description ?? "",
                    channel: template.channel,
                    subject: template.subject ?? "",
                    body: template.body,
                    variables: template.variables ?? [],
                }}
            />
        </div>
    );
}
