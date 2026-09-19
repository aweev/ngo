"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Loader2, Users } from "lucide-react";
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
import { createWorker, deleteWorker } from "@/actions/workers";
import type { Worker } from "@/types/domain/workers";

interface WorkersTableProps {
    workers: Worker[];
}

const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"];
const STATUSES = ["active", "inactive", "on_leave", "terminated"];

export function WorkersTable({ workers }: WorkersTableProps) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

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
            toast.error("First name, last name, and email are required");
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
        toast.success("Worker added");
        setOpen(false);
        setForm({ first_name: "", last_name: "", email: "", phone: "", department: "", position: "", employment_type: "full_time", status: "active" });
        router.refresh();
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete worker ${name}? This cannot be undone.`)) return;
        setDeletingId(id);
        const res = await deleteWorker(id);
        setDeletingId(null);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success("Worker deleted");
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search workers..."
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
                            <DialogTitle>Add Worker</DialogTitle>
                            <DialogDescription>Add a new staff member to your organization.</DialogDescription>
                        </DialogHeader>
<div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>First name</Label>
                                <Input value={form.first_name} onChange={set("first_name")} placeholder="Jane" />
                            </div>
                            <div className="space-y-2">
                                <Label>Last name</Label>
                                <Input value={form.last_name} onChange={set("last_name")} placeholder="Doe" />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <Label>Email</Label>
                                <Input type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" />
                            </div>
                            <div className="space-y-2">
                                <Label>Department</Label>
                                <Input value={form.department} onChange={set("department")} placeholder="Programs" />
                            </div>
                            <div className="space-y-2">
                                <Label>Position</Label>
                                <Input value={form.position} onChange={set("position")} placeholder="Project Lead" />
                            </div>
                            <div className="space-y-2">
                                <Label>Employment type</Label>
                                <Select value={form.employment_type} onValueChange={(v) => setForm((p) => ({ ...p, employment_type: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {EMPLOYMENT_TYPES.map((t) => (
                                            <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {STATUSES.map((s) => (
                                            <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>Cancel</Button>
                            <Button onClick={handleCreate} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
<div className="rounded-lg border bg-card">
                {filtered.length === 0 ? (
                    <Empty>
                        <EmptyMedia variant="icon" className="border"><Users className="h-5 w-5" /></EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>No workers found</EmptyTitle>
                            <EmptyDescription>
                                {workers.length === 0
                                    ? "Add your first worker to start building your team."
                                    : "No workers match your search."}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead>Position</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((w) => (
                                <TableRow key={w.id}>
                                    <TableCell className="font-medium">{w.first_name} {w.last_name}</TableCell>
                                    <TableCell className="text-muted-foreground">{w.email}</TableCell>
                                    <TableCell>{w.department ?? "—"}</TableCell>
                                    <TableCell>{w.position ?? "—"}</TableCell>
                                    <TableCell className="text-muted-foreground">{w.employment_type.replace(/_/g, " ")}</TableCell>
                                    <TableCell><StatusBadge status={w.status} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(w.id, `${w.first_name} ${w.last_name}`)}
                                            disabled={deletingId === w.id}
                                        >
                                            {deletingId === w.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                {filtered.length} of {workers.length} worker{workers.length === 1 ? "" : "s"}
            </p>
        </div>
    );
}