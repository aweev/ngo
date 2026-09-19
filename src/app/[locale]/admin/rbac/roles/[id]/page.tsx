import { notFound } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRole } from "@/actions/rbac";
import { RolePermissionEditor } from "./role-permission-editor";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function RoleDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { id } = await params;
    const { data: role } = await getRole(id);

    if (!role) notFound();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/rbac">
                    <ArrowLeft className="h-4 w-4" /> Back to Roles
                </Link>
            </Button>
            <PageHeader
                title={role.name}
                description={role.description ?? `Slug: ${role.slug}`}
                action={
                    <Badge variant={role.is_system ? "secondary" : "outline"}>
                        {role.is_system ? "System role" : "Custom role"}
                    </Badge>
                }
            />
            <RolePermissionEditor role={role} />
        </div>
    );
}
