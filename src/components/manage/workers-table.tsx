"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Plus, Trash2, Loader2, Users, Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Empty, EmptyContent, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { StatusBadge } from "@/components/manage/status-badge";
import { toast } from "sonner";
import { createWorker, deleteWorker, updateWorker } from "@/actions/workers";
import type { Worker } from "@/types/domain/workers";

interface WorkersTableProps {
    workers: Worker[];
}

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];
const STATUSES = ["active", "inactive", "on_leave", "terminated"];

export function WorkersTable({ workers }: WorkersTableProps) {
    const router = useRouter();
    const t = useTranslations("Manage.Workers");
    const tt = useTranslations("Manage.Tables");
    const tEnums = useTranslations("Manage.Enums");
    const enumLabel = (v: string) => (tEnums.has(v) ? tEnums(v) : v.replace(/_/g, " "));
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [editing, setEditing] = useState<Worker | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        department: "",
        position: "",
        employment_type: "full_time",
        status: "active",
    });

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
        setForm((prev) => ({ ...prev, [key]: e.target.value }));

    const filtered = workers.filter((w) => {
        const q = query.toLowerCase();
        return (
            w.first_name.toLowerCase().includes(q) ||
            w.last_name.toLowerCase().includes(q) ||
            w.email.toLowerCase().includes(q) ||
            (w.department ?? "").toLowerCase().includes(q)
        );
    });

    const handleCreate = async () => {
        if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
            toast.error(t("required_fields"));
            return;
        }
        setSubmitting(true);
        const res = await createWorker({
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            department: form.department.trim() || null,
            position: form.position.trim() || null,
            employment_type: form.employment_type as Worker["employment_type"],
            status: form.status as Worker["status"],
            currency: "EUR",
        });
        setSubmitting(false);

        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("added"));
        setOpen(false);
        setForm({ first_name: "", last_name: "", email: "", phone: "", department: "", position: "", employment_type: "full_time", status: "active" });
        router.refresh();
    };

    const openEdit = (w: Worker) => {
        setForm({
            first_name: w.first_name,
            last_name: w.last_name,
            email: w.email,
            phone: w.phone ?? "",
            department: w.department ?? "",
            position: w.position ?? "",
            employment_type: w.employment_type,
            status: w.status,
        });
        setEditing(w);
    };

    const handleEdit = async () => {
        if (!editing) return;
        if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim()) {
            toast.error(t("required_fields"));
            return;
        }
        setSavingEdit(true);
        const res = await updateWorker(editing.id, {
            first_name: form.first_name.trim(),
            last_name: form.last_name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            department: form.department.trim() || null,
            position: form.position.trim() || null,
            employment_type: form.employment_type as Worker["employment_type"],
            status: form.status as Worker["status"],
        });
        setSavingEdit(false);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("updated"));
        setEditing(null);
        router.refresh();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(t("delete_confirm", { name }))) return;
        setDeletingId(id);
        const res = await deleteWorker(id);
        setDeletingId(null);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("deleted"));
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t("search")}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Worker
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{tt("add", { entity: t("entity_one") })}</DialogTitle>
                            <DialogDescription>{t("add_desc")}</DialogDescription>
                        </DialogHeader>
<div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("fields.first_name")}</Label>
                                <Input value={form.first_name} onChange={set("first_name")} placeholder={t("placeholder_first_name")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.last_name")}</Label>
                                <Input value={form.last_name} onChange={set("last_name")} placeholder={t("placeholder_last_name")} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>{t("fields.email")}</Label>
                                <Input type="email" value={form.email} onChange={set("email")} placeholder={t("placeholder_email")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.phone")}</Label>
                                <Input value={form.phone} onChange={set("phone")} placeholder={t("placeholder_phone")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.department")}</Label>
                                <Input value={form.department} onChange={set("department")} placeholder={t("placeholder_department")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.position")}</Label>
                                <Input value={form.position} onChange={set("position")} placeholder={t("placeholder_position")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.employment_type")}</Label>
                                <Select value={form.employment_type} onValueChange={(v) => setForm((p) => ({ ...p, employment_type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {EMPLOYMENT_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>{enumLabel(type)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.status")}</Label>
                                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((status) => (
                                            <SelectItem key={status} value={status}>{enumLabel(status)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{tt("cancel")}</Button>
                            <Button onClick={handleCreate} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {tt("save")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
                <Dialog open={editing !== null} onOpenChange={(v) => { if (!v) setEditing(null); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{tt("edit_title", { entity: t("entity_one") })}</DialogTitle>
                            <DialogDescription>{t("edit_desc")}</DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t("fields.first_name")}</Label>
                                <Input value={form.first_name} onChange={set("first_name")} placeholder={t("placeholder_first_name")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.last_name")}</Label>
                                <Input value={form.last_name} onChange={set("last_name")} placeholder={t("placeholder_last_name")} />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>{t("fields.email")}</Label>
                                <Input type="email" value={form.email} onChange={set("email")} placeholder={t("placeholder_email")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.phone")}</Label>
                                <Input value={form.phone} onChange={set("phone")} placeholder={t("placeholder_phone")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.department")}</Label>
                                <Input value={form.department} onChange={set("department")} placeholder={t("placeholder_department")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.position")}</Label>
                                <Input value={form.position} onChange={set("position")} placeholder={t("placeholder_position")} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.employment_type")}</Label>
                                <Select value={form.employment_type} onValueChange={(v) => setForm((p) => ({ ...p, employment_type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {EMPLOYMENT_TYPES.map((type) => (
                                            <SelectItem key={type} value={type}>{enumLabel(type)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t("fields.status")}</Label>
                                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((status) => (
                                            <SelectItem key={status} value={status}>{enumLabel(status)}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>{tt("cancel")}</Button>
                            <Button onClick={handleEdit} disabled={savingEdit}>
                                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {tt("save_changes")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
<div className="rounded-lg border bg-card">
                {filtered.length === 0 ? (
                    <Empty>
                        <EmptyMedia variant="icon" className="border"><Users className="h-5 w-5" /></EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>{t("empty_title")}</EmptyTitle>
                            <EmptyDescription>
                                {workers.length === 0
                                    ? t("empty_desc")
                                    : tt("no_search_results")}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("cols.name")}</TableHead>
                                <TableHead>{t("cols.email")}</TableHead>
                                <TableHead>{t("cols.department")}</TableHead>
                                <TableHead>{t("cols.position")}</TableHead>
                                <TableHead>{t("cols.type")}</TableHead>
                                <TableHead>{t("cols.status")}</TableHead>
                                <TableHead className="text-right">{tt("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((w) => (
                                <TableRow key={w.id}>
                                    <TableCell className="font-medium">{w.first_name} {w.last_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{w.email}</TableCell>
                                    <TableCell>{w.department ?? "—"}</TableCell>
                                    <TableCell>{w.position ?? "—"}</TableCell>
                                    <TableCell className="text-muted-foreground">{enumLabel(w.employment_type)}</TableCell>
                                    <TableCell><StatusBadge status={w.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => openEdit(w)}
                                                title={tt("edit_title", { entity: t("entity_one") })}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(w.id, `${w.first_name} ${w.last_name}`)}
                                                disabled={deletingId === w.id}
                                            >
                                                {deletingId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                {tt("count", {
                    shown: filtered.length,
                    total: workers.length,
                    entity: workers.length === 1 ? t("entity_one") : t("entity_many"),
                })}
            </p>
        </div>
    );
}