"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "@/lib/navigation";
import type { CustomRole } from "@/types/domain/rbac";

const modules = [
    { key: "people", label: "People (Workers/Volunteers/Donors)" },
    { key: "programs", label: "Programs (Projects/Campaigns)" },
    { key: "operations", label: "Operations (Automations/Workflows)" },
    { key: "financial", label: "Financials & Expenses" },
    { key: "system", label: "System & Settings" },
];

interface PermissionMatrixProps {
    roles: CustomRole[];
}

export function PermissionMatrix({ roles }: PermissionMatrixProps) {
    return (
        <div className="rounded-lg border bg-card overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-64 font-semibold">Permission Scope</TableHead>
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
                            <TableCell className="font-medium text-xs">{m.label}</TableCell>
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
