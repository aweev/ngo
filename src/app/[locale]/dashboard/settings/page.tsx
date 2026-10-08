import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/auth";
import { RoleRequestForm } from "@/components/dashboard/role-request-form";
import { NotificationPreferencesForm } from "@/components/dashboard/notification-preferences-form";
import { getMyRoleRequests } from "@/actions/role-requests";
import { getMyNotificationPreferences } from "@/actions/notifications";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Dashboard.Settings" });
    const session = await auth();
    const requests = await getMyRoleRequests();
    const { data: preferences } = await getMyNotificationPreferences();
    return (
        <div className="space-y-6">
            <PageHeader title={t("title")} description={t("desc")} />
            <Card><CardContent className="space-y-2 p-6 text-sm"><p className="font-medium">{t("current_access")}</p><p className="text-muted-foreground">{session?.organizationName || t("personal")} · {session?.user.role || "member"}</p><p className="text-xs text-muted-foreground">{t("lang_hint")}</p></CardContent></Card>
            <Card><CardContent className="space-y-4 p-6"><div><h2 className="font-semibold">{t("notifications")}</h2><p className="text-sm text-muted-foreground">{t("notif_desc")}</p></div><NotificationPreferencesForm initial={preferences} /></CardContent></Card>
            <Card><CardContent className="space-y-4 p-6"><div><h2 className="font-semibold">{t("request_title")}</h2><p className="text-sm text-muted-foreground">{t("request_desc")}</p></div><RoleRequestForm /><div className="space-y-2 border-t pt-4"><p className="text-sm font-medium">{t("your_requests")}</p>{requests.data.length === 0 ? <p className="text-sm text-muted-foreground">{t("no_requests")}</p> : requests.data.map((request) => <div key={request.id} className="flex justify-between text-sm"><span>{request.requested_role}</span><span className="text-muted-foreground">{request.status}</span></div>)}</div></CardContent></Card>
        </div>
    );
}