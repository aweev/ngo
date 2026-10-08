"use client";

import { useTranslations } from "next-intl";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/navigation";
import type { CustomRole } from "@/types/domain/rbac";

const modules = [
    { key: "people" },
    { key: "programs" },
    { key: "operations" },
    { key: "financial" },
    { key: "system" },
] as const;

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
                    {modules.map((m) => (
                        <TableRow key={m.key}>
                            <TableCell className="font-medium text-xs">{t(m.key)}</TableCell>
                            {roles.map((r) => {
                                const isGranted = Boolean(r.permissions?.[m.key]);
                                return (
                                    <TableCell key={r.id} className="text-center">
                                        <Checkbox checked={isGranted} disabled />
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
