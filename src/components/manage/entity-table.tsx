"use client";

import { useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, Plus, Trash2, Loader2, Pencil } from "lucide-react";
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
    /** Plural display form for count lines (defaults to English "s" suffix). */
    plural?: string;
    searchPlaceholder: string;
    emptyTitle: string;
    emptyDescription: string;
    columns: ManageColumn<T>[];
    fields: ManageField[];
    filter: (item: T, q: string) => boolean;
    onCreate: (values: Record<string, string>) => Promise<{ error: string | null }>;
    onDelete: (id: string) => Promise<{ error: string | null }>;
    deleteLabel: (item: T) => string;
    /**
     * Optional edit support. When provided, each row gets an edit button
     * opening the same field set prefilled from the item.
     * `editValues` overrides the default item → form mapping.
     */
    onEdit?: (id: string, values: Record<string, string>) => Promise<{ error: string | null }>;
    editValues?: (item: T) => Record<string, string>;
}

interface EntityTableProps<T extends { id: string }> {
    items: T[];
    config: ManageEntityConfig<T>;
}

export function EntityTable<T extends { id: string }>({ items, config }: EntityTableProps<T>) {
    const router = useRouter();
    const t = useTranslations("Manage.Tables");
    const tEnums = useTranslations("Manage.Enums");
    const [query, setQuery] = useState("");
    const [open, setOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const initialValues = Object.fromEntries(
        config.fields.map((f) => [f.name, f.defaultValue ?? ""])
    ) as Record<string, string>;
    const [values, setValues] = useState<Record<string, string>>(initialValues);
    const [editing, setEditing] = useState<T | null>(null);
    const [editValues, setEditValues] = useState<Record<string, string>>(initialValues);
    const [savingEdit, setSavingEdit] = useState(false);

    const valuesFromItem = (item: T): Record<string, string> => {
        if (config.editValues) return config.editValues(item);
        const out: Record<string, string> = {};
        for (const f of config.fields) {
            const raw: unknown = (item as Record<string, unknown>)[f.name];
            out[f.name] = Array.isArray(raw)
                ? raw.filter((x) => typeof x === "string" || typeof x === "number").join(", ")
                : (raw ?? f.defaultValue ?? "").toString();
        }
        return out;
    };

    const openEdit = (item: T) => {
        setEditValues(valuesFromItem(item));
        setEditing(item);
    };

    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

    const handleEdit = async () => {
        if (!editing || !config.onEdit) return;
        for (const field of config.fields) {
            if (field.required && !editValues[field.name]?.trim()) {
                toast.error(t("required_field", { field: field.label }));
                return;
            }
        }
        setSavingEdit(true);
        const res = await config.onEdit(editing.id, editValues);
        setSavingEdit(false);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("updated", { entity: capitalize(config.singular) }));
        setEditing(null);
        router.refresh();
    };

    const filtered = items.filter((item) => config.filter(item, query));

    const setValue = (name: string, value: string) =>
        setValues((prev) => ({ ...prev, [name]: value }));

    const handleCreate = async () => {
        // Validate required fields
        for (const field of config.fields) {
            if (field.required && !values[field.name]?.trim()) {
                toast.error(t("required_field", { field: field.label }));
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
        toast.success(t("added", { entity: capitalize(config.singular) }));
        setOpen(false);
        setValues(initialValues);
        router.refresh();
    };

    const handleDelete = async (item: T) => {
        const label = config.deleteLabel(item);
        if (!window.confirm(t("delete_confirm", { entity: config.singular, label }))) return;
        setDeletingId(item.id);
        const res = await config.onDelete(item.id);
        setDeletingId(null);
        if (res.error) {
            toast.error(res.error);
            return;
        }
        toast.success(t("deleted", { entity: capitalize(config.singular) }));
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
                            {t("add", { entity: config.singular })}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {t("add", { entity: config.singular })}
                            </DialogTitle>
                            <DialogDescription>
                                {t("add_desc", { entity: config.singular })}
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
                                                    <SelectItem key={opt} value={opt}>{tEnums.has(opt) ? tEnums(opt) : opt.replace(/_/g, " ")}</SelectItem>
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
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>{t("cancel")}</Button>
                            <Button onClick={handleCreate} disabled={submitting}>
                                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("save")}
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
                                {items.length === 0 ? config.emptyDescription : t("no_search_results")}
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
                                <TableHead className="text-right">{t("actions")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((item) => (
                                <TableRow key={item.id}>
                                    {config.columns.map((col) => (
                                        <TableCell key={col.label} className={col.className}>{col.render(item)}</TableCell>
                                    ))}
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1">
                                            {config.onEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(item)}
                                                    title={t("edit_title", { entity: config.singular })}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleDelete(item)}
                                                disabled={deletingId === item.id}
                                            >
                                                {deletingId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
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
                {t("count", {
                    shown: filtered.length,
                    total: items.length,
                    entity: items.length === 1 ? config.singular : config.plural ?? `${config.singular}s`,
                })}
            </p>

            {config.onEdit && (
                <Dialog open={editing !== null} onOpenChange={(v) => { if (!v) setEditing(null); }}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>
                                {t("edit_title", { entity: config.singular })}
                            </DialogTitle>
                            <DialogDescription>
                                {t("edit_desc", { entity: config.singular })}
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4">
                            {config.fields.map((field) => (
                                <div key={field.name} className={`space-y-2 ${field.fullWidth ? "col-span-2" : ""}`}>
                                    <Label>{field.label}</Label>
                                    {field.type === "select" ? (
                                        <Select value={editValues[field.name]} onValueChange={(v) => setEditValues((p) => ({ ...p, [field.name]: v }))}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {field.options?.map((opt) => (
                                                    <SelectItem key={opt} value={opt}>{tEnums.has(opt) ? tEnums(opt) : opt.replace(/_/g, " ")}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    ) : (
                                        <Input
                                            type={field.type === "number" ? "number" : field.type === "email" ? "email" : field.type === "date" ? "date" : "text"}
                                            value={editValues[field.name]}
                                            onChange={(e) => setEditValues((p) => ({ ...p, [field.name]: e.target.value }))}
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditing(null)} disabled={savingEdit}>{t("cancel")}</Button>
                            <Button onClick={handleEdit} disabled={savingEdit}>
                                {savingEdit && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {t("save_changes")}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}