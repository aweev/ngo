"use client";

import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/navigation";
import { PERMISSIONS } from "@/lib/auth/permissions";
import type { CustomRole } from "@/types/domain/rbac";

/**
 * Display scope -> the permission modules that belong to it.
 *
 * Every module key below MUST exist in the PERMISSIONS registry
 * (`src/lib/auth/permissions.ts`). A scope counts as granted only when EVERY
 * permission of its modules is present in `custom_roles.permissions` — those
 * are stored as real keys like `"projects.manage": true`, never as the flat
 * scope names shown here (that mismatch was the old bug).
 */
const SCOPE_MODULES: Record<string, readonly (keyof typeof PERMISSIONS)[]> = {
    people: ["workers", "volunteers", "partners", "donors", "donations", "beneficiaries"],
    programs: ["projects", "campaigns", "events", "forms", "impact", "content"],
    operations: ["automations", "workflows", "scheduling", "integrations", "messaging", "notifications", "tags"],
    financial: ["finance", "reporting"],
    system: ["settings", "members", "rbac", "audit", "governance"],
};

const SCOPES = ["people", "programs", "operations", "financial", "system"] as const;

/** Every registered permission key that belongs to a display scope. */
function scopePermissions(scope: string): string[] {
    const modules = SCOPE_MODULES[scope] ?? [];
    return modules.flatMap((module) => Object.values(PERMISSIONS[module] ?? {}) as string[]);
}

interface PermissionMatrixProps {
    roles: CustomRole[];
}

export function PermissionMatrix({ roles }: PermissionMatrixProps) {
    const t = useTranslations("Admin.Rbac.matrix");
    return (
        <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-64 font-semibold">{t("scope")}</TableHead>
                        {roles.map((r) => (
                            <TableHead key={r.id} className="text-center font-semibold capitalize">
                                <Link href={`/admin/rbac/roles/${r.id}`} className="hover:underline">
                                    {r.name}
                                </Link>
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {SCOPES.map((scope) => {
                        const permissions = scopePermissions(scope);
                        return (
                            <TableRow key={scope}>
                                <TableCell className="font-medium text-xs">{t(scope)}</TableCell>
                                {roles.map((r) => {
                                    const granted = permissions.filter((p) => r.permissions?.[p]).length;
                                    const allGranted = permissions.length > 0 && granted === permissions.length;
                                    return (
                                        <TableCell key={r.id} className="text-center">
                                            <div className="flex flex-col items-center gap-1">
                                                <Checkbox checked={allGranted} disabled />
                                                <span className="text-[10px] tabular-nums text-muted-foreground">
                                                    {granted}/{permissions.length}
                                                </span>
                                            </div>
                                        </TableCell>
                                    );
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
