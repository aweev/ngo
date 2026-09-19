"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Search, Plus, Trash2, Loader2 } from "lucide-react";
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
import { toast } from "sonner";

export interface ManageField {
    name: string;
    label: string;
    type?: "text" | "email" | "number" | "select" | "date";
    options?: string[];
    defaultValue?: string;
    required?: boolean;
    fullWidth?: boolean;
}

export interface ManageColumn<T> {
    label: string;
    render: (item: T) => ReactNode;
    className?: string;
}

export interface ManageEntityConfig<T extends { id: string }> {
    singular: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDescription: string;
    columns: ManageColumn<T>[];
    fields: ManageField[];
    filter: (item: T, q: string) => boolean;
    onCreate: (values: Record<string, string>) => Promise<{ error: string | null }>;
    onDelete: (id: string) => Promise<{ error: string | null }>;
    deleteLabel: (item: T) => string;
}

interface EntityTableProps<T extends { id: string }> {
    items: T[];
    config: ManageEntityConfig<T>;
}

export function EntityTable<T extends { id: string }>({ items, config }: EntityTableProps<T>) {
    const router = useRouter();
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const initialValues = Object.fromEntries(
        config.fields.map((f) => [f.name, f.defaultValue ?? ""])
    ) as Record<string, string>;
    const [values, setValues] = useState<Record<string, string>>(initialValues);

    const filtered = items.filter((item) => config.filter(item, query));

    const setValue = (name: string, value: string) =>
        setValues((prev) => ({ ...prev, [name]: value }));

    const handleCreate = async () => {
        // Validate required fields
        for (const field of config.fields) {
            if (field.required && !values[field.name]?.trim()) {
                toast.error(`${field.label} is required`);
                return;
            }
        }

        setSubmitting(true);
        const res = await config.onCreate(values);
        setSubmitting(false);

        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} added`);
        setOpen(false);
        setValues(initialValues);
        router.refresh();
    };

    const handleDelete = async (item: T) => {
        const label = config.deleteLabel(item);
        if (!window.confirm(`Delete ${config.singular} "${label}"? This cannot be undone.`)) return;
        setDeletingId(item.id);
        const res = await config.onDelete(item.id);
        setDeletingId(null);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(`${config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} deleted`);
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:max-w-xs">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={config.searchPlaceholder}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add {config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                Add {config.singular.charAt(0).toUpperCase() + config.singular.slice(1)}
                            </DialogTitle>
                            <DialogDescription>
                                Add a new {config.singular} to your organization.
                            </DialogDescription>
                        </DialogHeader>
<div className="grid grid-cols-2 gap-4">
                            {config.fields.map((field) => (
                                <div key={field.name} className={`space-y-2 ${field.fullWidth ? "col-span-2" : ""}`}>
                                    <Label>{field.label}</Label>
                                    {field.type === "select" ? (
                                        <Select value={values[field.name]} onValueChange={(v) => setValue(field.name, v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {field.options?.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>{opt.replace(/_/g, " ")}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                                            value={values[field.name]}
                                            onChange={(e) => setValue(field.name, e.target.value)}
                                        />
                                    )}
                                </div>
                            ))}
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
                        <EmptyMedia variant="icon" className="border"><Plus className="h-5 w-5" /></EmptyMedia>
                        <EmptyHeader>
                            <EmptyTitle>{config.emptyTitle}</EmptyTitle>
                            <EmptyDescription>
                                {items.length === 0 ? config.emptyDescription : "No results match your search."}
                            </EmptyDescription>
                        </EmptyHeader>
                    </Empty>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {config.columns.map((col) => (
                                    <TableHead key={col.label} className={col.className}>{col.label}</TableHead>
                                ))}
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((item) => (
                                <TableRow key={item.id}>
                                    {config.columns.map((col) => (
                                        <TableCell key={col.label} className={col.className}>{col.render(item)}</TableCell>
                                    ))}
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleDelete(item)}
                                            disabled={deletingId === item.id}
                                        >
                                            {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                {filtered.length} of {items.length} {config.singular}
                {items.length === 1 ? "" : "s"}
            </p>
        </div>
    );
}