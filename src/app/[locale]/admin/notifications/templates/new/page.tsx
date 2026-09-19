import { PageHeader } from "@/components/manage/page-header";
import { NotificationComposer } from "@/components/admin/notification-composer";

export const dynamic = "force-dynamic";

export default function NewNotificationTemplatePage() {
    return (
        <div className="space-y-6">
            <PageHeader
                title="New Message Template"
                description="Compose a reusable template. Use {{variables}} for per-recipient interpolation."
            />
            <NotificationComposer />
        </div>
    );
}
