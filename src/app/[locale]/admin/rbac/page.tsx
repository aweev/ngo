import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { getCustomRoles } from "@/actions/rbac";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { Plus } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function RbacPage() {
    const { data: roles } = await getCustomRoles();

    return (
        <div className="space-y-6">
            <PageHeader
                title="Roles & Permissions Matrix"
                description="Manage granular access control, system roles, and department permissions."
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/rbac/new">
                            <Plus className="h-4 w-4" />
                            Create Role
                        </Link>
                    </Button>
                }
            />

            <PermissionMatrix roles={roles || []} />
        </div>
    );
}
