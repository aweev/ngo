import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRole, getRoleAssignments } from "@/actions/rbac";
import { getMembers } from "@/actions/members";
import { RolePermissionEditor } from "./role-permission-editor";
import { RoleAssignmentManager } from "@/components/admin/role-assignment-manager";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function RoleDetailPage({
    params,
}: {
    params: Promise<{ locale: string; id: string }>;
}) {
    const { locale, id } = await params;
    const [{ data: role }, { data: assignments }, { data: members }] = await Promise.all([
        getRole(id),
        getRoleAssignments(id),
        getMembers(),
    ]);

    if (!role) notFound();

    const t = await getTranslations({ locale, namespace: "Admin.Rbac.roleDetail" });

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/rbac">
                    <ArrowLeft className="h-4 w-4" /> {t("back")}
                </Link>
            </Button>
            <PageHeader
                title={role.name}
                description={role.description ?? `Slug: ${role.slug}`}
                action={
                    <Badge variant={role.is_system ? "secondary" : "outline"}>
                        {role.is_system ? t("systemRole") : t("customRole")}
                    </Badge>
                }
            />
            <RolePermissionEditor role={role} />
            <RoleAssignmentManager
                roleId={role.id}
                initialAssignments={assignments ?? []}
                members={members ?? []}
            />
        </div>
    );
}
