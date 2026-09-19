import { PageHeader } from "@/components/manage/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/auth";
import { RoleRequestForm } from "@/components/dashboard/role-request-form";
import { getMyRoleRequests } from "@/actions/role-requests";

export const dynamic = "force-dynamic";

export default async function DashboardSettingsPage() {
    const session = await auth();
    const requests = await getMyRoleRequests();
    return (
        <div className="space-y-6">
            <PageHeader title="Settings" description="Your access, language, and workspace preferences." />
            <Card><CardContent className="space-y-2 p-6 text-sm"><p className="font-medium">Current access</p><p className="text-muted-foreground">{session?.organizationName || "Personal workspace"} · {session?.user.role || "member"}</p><p className="text-xs text-muted-foreground">Use the language control in the dashboard header to change your preferred view language.</p></CardContent></Card>
            <Card><CardContent className="space-y-4 p-6"><div><h2 className="font-semibold">Request additional access</h2><p className="text-sm text-muted-foreground">Requests are reviewed by an organization administrator.</p></div><RoleRequestForm /><div className="space-y-2 border-t pt-4"><p className="text-sm font-medium">Your requests</p>{requests.data.length === 0 ? <p className="text-sm text-muted-foreground">No role requests yet.</p> : requests.data.map((request) => <div key={request.id} className="flex justify-between text-sm"><span>{request.requested_role}</span><span className="text-muted-foreground">{request.status}</span></div>)}</div></CardContent></Card>
        </div>
    );
}