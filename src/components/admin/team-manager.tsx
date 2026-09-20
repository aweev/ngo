"use client";

import { useState } from "react";
import {
    Check, Copy, Loader2, MailPlus, RefreshCw, ShieldCheck, Trash2, UserX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    getInvitations, getMembers, inviteMember, removeMember, revokeInvitation, updateMemberRole,
    type OrgInvitation, type OrgMember,
} from "@/actions/members";
import { APP_ROLES, type AppRole } from "@/lib/auth/permissions";

const ROLE_LABEL: Record<AppRole, string> = {
    owner: "Owner",
    admin: "Admin",
    manager: "Manager",
    member: "Member",
};

function initials(name: string | null, email: string | null): string {
    const source = (name || email || "?").trim();
    const parts = source.split(/[\s@._-]+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return source.slice(0, 2).toUpperCase();
}

export function TeamManager({
    locale,
    initialMembers,
    initialInvitations,
    loadError,
}: {
    locale: string;
    initialMembers: OrgMember[];
    initialInvitations: OrgInvitation[];
    loadError: string | null;
}) {
    const [members, setMembers] = useState(initialMembers);
    const [invitations, setInvitations] = useState(initialInvitations);
    const [refreshing, setRefreshing] = useState(false);
    const [acting, setActing] = useState<string | null>(null);

    const refresh = async () => {
        setRefreshing(true);
        const [m, i] = await Promise.all([getMembers(), getInvitations(locale)]);
        if (!m.error) setMembers(m.data);
        if (!i.error) setInvitations(i.data);
        setRefreshing(false);
    };

    const changeRole = async (userId: string, role: AppRole) => {
        setActing(userId);
        const result = await updateMemberRole({ userId, role });
        if (result.success) {
            setMembers((cur) => cur.map((m) => (m.userId === userId ? { ...m, role } : m)));
            toast.success("Role updated.");
        } else {
            toast.error(result.error || "Could not update the role.");
        }
        setActing(null);
    };

    const remove = async (userId: string, label: string) => {
        if (!window.confirm(`Remove ${label} from the organization? They lose access immediately.`)) return;
        setActing(userId);
        const result = await removeMember(userId);
        if (result.success) {
            setMembers((cur) => cur.filter((m) => m.userId !== userId));
            toast.success("Member removed.");
        } else {
            toast.error(result.error || "Could not remove the member.");
        }
        setActing(null);
    };

    const revoke = async (id: string) => {
        setActing(id);
        const result = await revokeInvitation(id);
        if (result.success) {
            setInvitations((cur) => cur.map((v) => (v.id === id ? { ...v, status: "revoked" } : v)));
            toast.success("Invitation revoked.");
        } else {
            toast.error(result.error || "Could not revoke the invitation.");
        }
        setActing(null);
    };

    const copy = async (link: string) => {
        try {
            await navigator.clipboard.writeText(link);
            toast.success("Invite link copied — send it to your teammate.");
        } catch {
            toast.error("Copy failed. Select the link manually.");
        }
    };

    if (loadError && members.length === 0 && invitations.length === 0) {
        return (
            <Card>
                <CardContent className="space-y-4 p-6 text-center">
                    <p className="text-sm text-muted-foreground">{loadError}</p>
                    <Button size="sm" variant="outline" onClick={refresh}>
                        <RefreshCw className="mr-2 h-4 w-4" /> Try again
                    </Button>
                </CardContent>
            </Card>
        );
    }

    const pending = invitations.filter((v) => v.status === "pending");

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base font-semibold">Members ({members.length})</CardTitle>
                        <CardDescription>Everyone with access to this workspace.</CardDescription>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing}>
                            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} /> Refresh
                        </Button>
                        <InviteDialog
                            locale={locale}
                            onInvited={(link) => {
                                void link;
                                refresh();
                            }}
                        />
                    </div>
                </CardHeader>
                <CardContent>
                    {members.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">No members yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Person</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.map((m) => (
                                    <TableRow key={m.userId}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8">
                                                    <AvatarFallback className="text-xs">
                                                        {initials(m.name, m.email)}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="text-sm font-medium">{m.name || "Unnamed member"}</p>
                                                    <p className="text-xs text-muted-foreground">{m.email || m.userId.slice(0, 8)}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Select
                                                value={m.role}
                                                onValueChange={(v) => changeRole(m.userId, v as AppRole)}
                                                disabled={acting === m.userId}
                                            >
                                                <SelectTrigger className="h-8 w-32">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {APP_ROLES.map((r) => (
                                                        <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="hidden text-xs text-muted-foreground md:table-cell">
                                            {m.joinedAt ? new Date(m.joinedAt).toLocaleDateString() : "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive"
                                                disabled={acting === m.userId}
                                                onClick={() => remove(m.userId, m.name || m.email || "this member")}
                                            >
                                                {acting === m.userId ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserX className="h-4 w-4" />}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base font-semibold">Invitations ({pending.length} pending)</CardTitle>
                    <CardDescription>Share the claim link — it works for new and existing accounts.</CardDescription>
                </CardHeader>
                <CardContent>
                    {invitations.length === 0 ? (
                        <p className="py-4 text-center text-sm text-muted-foreground">No invitations yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invitations.map((v) => (
                                    <TableRow key={v.id}>
                                        <TableCell className="text-sm font-medium">{v.email}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">{ROLE_LABEL[v.role] ?? v.role}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={v.status === "pending" ? "default" : "secondary"}>
                                                {v.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {v.status === "pending" && (
                                                <div className="flex justify-end gap-1">
                                                    <Button size="sm" variant="ghost" onClick={() => copy(v.claimLink)} title="Copy invite link">
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="text-destructive hover:text-destructive"
                                                        disabled={acting === v.id}
                                                        onClick={() => revoke(v.id)}
                                                        title="Revoke invitation"
                                                    >
                                                        {acting === v.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                                    </Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

function InviteDialog({ locale, onInvited }: { locale: string; onInvited: (link: string) => void }) {
    const [open, setOpen] = useState(false);
    const [email, setEmail] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [role, setRole] = useState<AppRole>("member");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");
    const [link, setLink] = useState("");
    const [emailSent, setEmailSent] = useState(false);
    const [copied, setCopied] = useState(false);

    const reset = () => {
        setEmail("");
        setFirstName("");
        setLastName("");
        setRole("member");
        setError("");
        setLink("");
        setEmailSent(false);
        setCopied(false);
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSending(true);
        setError("");
        const result = await inviteMember({ email, role, firstName, lastName, locale });
        if (result.success && result.claimLink) {
            setLink(result.claimLink);
            setEmailSent(result.emailSent === true);
            onInvited(result.claimLink);
        } else {
            setError(result.error || "Could not create the invitation.");
        }
        setSending(false);
    };

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            toast.success("Invite link copied.");
        } catch {
            toast.error("Copy failed. Select the link manually.");
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
            <DialogTrigger asChild>
                <Button size="sm"><MailPlus className="mr-2 h-4 w-4" /> Invite member</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Invite to the workspace</DialogTitle>
                    <DialogDescription>
                        They claim access with the link below — no email delivery to configure.
                    </DialogDescription>
                </DialogHeader>

                {link ? (
                    <div className="space-y-4">
                        <div className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${emailSent ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
                            <ShieldCheck className="h-4 w-4 shrink-0" />
                            {emailSent
                                ? `Invite email sent to ${email} (${ROLE_LABEL[role]}). The link below works too.`
                                : `Email delivery unavailable — share this link with ${email} (${ROLE_LABEL[role]}) manually.`}
                        </div>
                        <div className="flex gap-2">
                            <Input value={link} readOnly className="font-mono text-xs" onFocus={(e) => e.target.select()} />
                            <Button size="sm" onClick={copyLink} className="shrink-0">
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)}>Done</Button>
                        </DialogFooter>
                    </div>
                ) : (
                    <form onSubmit={submit} className="space-y-4">
                        {error && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
                        )}
                        <div className="space-y-2">
                            <Label>Email</Label>
                            <Input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="teammate@example.org"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label>First name</Label>
                                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                            </div>
                            <div className="space-y-2">
                                <Label>Last name</Label>
                                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Role</Label>
                            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {APP_ROLES.map((r) => (
                                        <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter>
                            <Button type="submit" disabled={sending}>
                                {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MailPlus className="mr-2 h-4 w-4" />}
                                Create invitation
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
