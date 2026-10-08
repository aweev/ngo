import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { getCustomRoles } from "@/actions/rbac";
import { PermissionMatrix } from "@/components/admin/permission-matrix";
import { Plus } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function RbacPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Rbac" });
    const { data: roles } = await getCustomRoles();

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <Button asChild className="gap-2">
                        <Link href="/admin/rbac/new">
                            <Plus className="h-4 w-4" />
                            {t("create_role")}
                        </Link>
                    </Button>
                }
            />

            <PermissionMatrix roles={roles || []} />
        </div>
    );
}
