"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { updateRole } from "@/actions/rbac";
import { ALL_PERMISSIONS, PERMISSIONS } from "@/lib/auth/permissions";
import type { CustomRole } from "@/types/domain/rbac";
import { Loader2, ShieldCheck } from "lucide-react";

const MODULE_LABELS: Record<string, string> = Object.fromEntries(
    Object.keys(PERMISSIONS).map((module) => [module, module.charAt(0).toUpperCase() + module.slice(1)]),
);

function groupPermissions(): Record<string, string[]> {
    const groups: Record<string, string[]> = {};
    for (const permission of ALL_PERMISSIONS) {
        const [module] = permission.split(".");
        (groups[module] ??= []).push(permission);
    }
    return groups;
}

const GROUPED = groupPermissions();

export function RolePermissionEditor({ role }: { role: CustomRole }) {
    const router = useRouter();
    const [grants, setGrants] = useState<Record<string, boolean>>(role.permissions ?? {});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    function toggle(permission: string, checked: boolean) {
        setGrants((prev) => {
            const next = { ...prev };
            if (checked) next[permission] = true;
            else delete next[permission];
            return next;
        });
    }

    const grantedCount = Object.keys(grants).length;

    async function handleSave() {
        setLoading(true);
        setError(null);
        const result = await updateRole(role.id, { permissions: grants });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        router.refresh();
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-emerald-500" /> Permissions
                </CardTitle>
                <CardDescription>
                    {grantedCount} of {ALL_PERMISSIONS.length} permissions granted. System roles are read-only.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {role.is_system ? (
                    <Alert>
                        <AlertDescription>
                            This is a system role. Its permissions are managed by the platform and cannot be changed.
                        </AlertDescription>
                    </Alert>
                ) : null}
                <div className="grid gap-6 md:grid-cols-2">
                    {Object.entries(GROUPED).map(([module, permissions]) => (
                        <div key={module} className="space-y-2 rounded-lg border p-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                {MODULE_LABELS[module] ?? module}
                            </h4>
                            <div className="space-y-2">
                                {permissions.map((permission) => (
                                    <label key={permission} className="flex items-center gap-2 text-sm">
                                        <Checkbox
                                            checked={Boolean(grants[permission])}
                                            disabled={role.is_system}
                                            onCheckedChange={(v) => toggle(permission, v === true)}
                                        />
                                        <code className="font-mono text-xs">{permission}</code>
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                {!role.is_system && (
                    <div className="flex justify-end">
                        <Button onClick={handleSave} disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Saving..." : "Save permissions"}
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
