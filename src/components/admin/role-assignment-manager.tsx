"use client";

import { useMemo, useState } from "react";
import { Loader2, UserPlus, UserX } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { assignRole, unassignRole, type RoleAssignmentRow } from "@/actions/rbac";
import type { OrgMember } from "@/actions/members";

const BASE_ROLE_LABEL: Record<string, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    member: "Member",
};

function label(member: OrgMember | undefined, fallback: string): string {
    return member?.name || member?.email || fallback;
}

/**
 * Grant/revoke a custom role to organization members. Writes `role_assignments`
 * rows, which `getEffectivePermissions()` (guards.ts) already merges into each
 * user's effective permission set — this is the missing writer that makes a
 * created custom role actually take effect.
 */
export function RoleAssignmentManager({
    roleId,
    initialAssignments,
    members,
}: {
    roleId: string;
    initialAssignments: RoleAssignmentRow[];
    members: OrgMember[];
}) {
    const t = useTranslations("Admin.Rbac.assignments");
    const [assignments, setAssignments] = useState<RoleAssignmentRow[]>(initialAssignments);
    const [selected, setSelected] = useState<string>("");
    const [pending, setPending] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const membersById = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
    const assignedIds = useMemo(() => new Set(assignments.map((a) => a.userId)), [assignments]);
    const assignable = useMemo(
        () => members.filter((m) => !assignedIds.has(m.userId)),
        [members, assignedIds],
    );

    async function handleAssign() {
        if (!selected) return;
        setPending("assign");
        setError(null);
        const result = await assignRole({ roleId, userId: selected });
        setPending(null);
        if (!result.success) {
            setError(result.error);
            toast.error(result.error || t("assign_failed"));
            return;
        }
        setAssignments((cur) => [...cur, { userId: selected, expiresAt: null, createdAt: new Date().toISOString() }]);
        setSelected("");
        toast.success(t("assigned"));
    }

    async function handleRemove(userId: string) {
        setPending(userId);
        setError(null);
        const result = await unassignRole({ roleId, userId });
        setPending(null);
        if (!result.success) {
            setError(result.error);
            toast.error(result.error || t("remove_failed"));
            return;
        }
        setAssignments((cur) => cur.filter((a) => a.userId !== userId));
        toast.success(t("removed"));
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <UserPlus className="h-4 w-4 text-emerald-500" /> {t("title")}
                </CardTitle>
                <CardDescription>{t("description")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {error && (
                    <Alert variant="destructive">
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1">
                        <label htmlFor="assign-member" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            {t("member_label")}
                        </label>
                        <Select value={selected} onValueChange={setSelected} disabled={assignable.length === 0}>
                            <SelectTrigger id="assign-member" className="w-full">
                                <SelectValue placeholder={assignable.length === 0 ? t("no_members") : t("select_placeholder")} />
                            </SelectTrigger>
                            <SelectContent>
                                {assignable.map((m) => (
                                    <SelectItem key={m.userId} value={m.userId}>
                                        {label(m, m.userId)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={handleAssign} disabled={!selected || pending === "assign"} className="gap-2">
                        {pending === "assign" ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                        {pending === "assign" ? t("assigning") : t("assign")}
                    </Button>
                </div>

                {assignments.length === 0 ? (
                    <p className="text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                    <ul className="divide-y rounded-lg border">
                        {assignments.map((a) => {
                            const member = membersById.get(a.userId);
                            return (
                                <li key={a.userId} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-medium">{label(member, a.userId)}</p>
                                        <p className="truncate text-xs text-muted-foreground">
                                            {member?.email ?? a.userId}
                                            {member?.role ? ` · ${BASE_ROLE_LABEL[member.role] ?? member.role}` : ""}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-xs">
                                            {a.expiresAt ? t("expires_on", { date: a.expiresAt.slice(0, 10) }) : t("no_expiry")}
                                        </Badge>
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="gap-1 text-destructive hover:text-destructive"
                                            onClick={() => handleRemove(a.userId)}
                                            disabled={pending === a.userId}
                                        >
                                            {pending === a.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                                            {t("remove")}
                                        </Button>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}
