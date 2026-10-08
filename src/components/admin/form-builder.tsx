"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createForm, updateFormDefinition } from "@/actions/forms";
import type { FormField, FormFieldType } from "@/types/domain/forms";
import { ArrowDown, ArrowLeft, ArrowUp, ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { Link } from "@/lib/navigation";

function getFieldTypes(t: (key: string) => string): { value: FormFieldType; label: string }[] {
    return [
        { value: "text", label: t("field_type_text") },
        { value: "textarea", label: t("field_type_textarea") },
        { value: "number", label: t("field_type_number") },
        { value: "select", label: t("field_type_select") },
        { value: "checkbox", label: t("field_type_checkbox") },
        { value: "radio", label: t("field_type_radio") },
        { value: "date", label: t("field_type_date") },
        { value: "file", label: t("field_type_file") },
        { value: "email", label: t("field_type_email") },
        { value: "phone", label: t("field_type_phone") },
    ];
}

let fieldSeq = 0;
/** Client-only unique id for new fields (never persisted to the database). */
function nextFieldId(): string {
    fieldSeq += 1;
    return `f_${Date.now().toString(36)}_${fieldSeq}`;
}

function slugify(value: string): string {
    return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Shape of a form while it is being authored. */
export interface FormBuilderDraft {
    title: string;
    slug: string;
    description: string;
    status: "draft" | "published" | "archived";
    fields: FormField[];
    submit_button_text: string;
    success_message: string;
    is_public: boolean;
}

function createDefaultDraft(labels: { name: string; email: string; submitText: string; successMessage: string }): FormBuilderDraft {
    return {
        title: "",
        slug: "",
        description: "",
        status: "draft",
        fields: [
            { id: nextFieldId(), type: "text", label: labels.name, required: true, sortOrder: 0 },
            { id: nextFieldId(), type: "email", label: labels.email, required: true, sortOrder: 1 },
        ],
        submit_button_text: labels.submitText,
        success_message: labels.successMessage,
        is_public: true,
    };
}

interface FormBuilderProps {
    /** Initial values in edit mode. */
    initial?: FormBuilderDraft;
    /** Present in edit mode: the id of the form being updated. */
    formId?: string;
    /** Back-navigation target override (defaults to /admin/forms). */
    backHref?: string;
}

export function FormBuilder({ initial, formId, backHref = "/admin/forms" }: FormBuilderProps) {
    const router = useRouter();
    const t = useTranslations("Admin.Forms.builder");
    const fieldTypes = getFieldTypes(t);
    const [draft, setDraft] = useState<FormBuilderDraft>(
        initial ?? createDefaultDraft({
            name: t("default_field_name"),
            email: t("default_field_email"),
            submitText: t("default_submit_text"),
            successMessage: t("default_success_message"),
        }),
    );
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const patch = (partial: Partial<FormBuilderDraft>) => setDraft((prev) => ({ ...prev, ...partial }));

    const patchField = (index: number, partial: Partial<FormField>) => {
        setDraft((prev) => ({
            ...prev,
            fields: prev.fields.map((f, i) => (i === index ? { ...f, ...partial } : f)),
        }));
    };

    const addField = () => {
        setDraft((prev) => {
            const field: FormField = {
                id: nextFieldId(),
                type: "text",
                label: `Question ${prev.fields.length + 1}`,
                required: false,
                sortOrder: prev.fields.length,
            };
            return { ...prev, fields: [...prev.fields, field] };
        });
    };

    const removeField = (index: number) => {
        setDraft((prev) => {
            if (prev.fields.length <= 1) return prev; // a form needs at least one field
            const fields = prev.fields.filter((_, i) => i !== index);
            return { ...prev, fields: fields.map((f, i) => ({ ...f, sortOrder: i })) };
        });
    };

    const moveField = (index: number, direction: -1 | 1) => {
        setDraft((prev) => {
            const target = index + direction;
            if (target < 0 || target >= prev.fields.length) return prev;
            const fields = [...prev.fields];
            [fields[index], fields[target]] = [fields[target], fields[index]];
            return { ...prev, fields: fields.map((f, i) => ({ ...f, sortOrder: i })) };
        });
    };

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!draft.title.trim() || !draft.slug.trim()) {
            setError("A form title and URL slug are required.");
            return;
        }
        if (draft.fields.length === 0) {
            setError("A form needs at least one field.");
            return;
        }

        setLoading(true);
        setError(null);

        const payload = {
            title: draft.title.trim(),
            slug: slugify(draft.slug),
            description: draft.description.trim() || null,
            status: draft.status,
            fields: draft.fields.map((f, i) => ({ ...f, sortOrder: i })),
            submit_button_text: draft.submit_button_text.trim() || t("default_submit_text"),
            success_message: draft.success_message.trim() || t("default_success_message"),
            is_public: draft.is_public,
            created_by: null,
        };

        const result = formId
            ? await updateFormDefinition(formId, payload)
            : await createForm(payload);

        if (result.error) {
            setError(result.error);
            setLoading(false);
            return;
        }

        router.push("/admin/forms");
        router.refresh();
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href={backHref}>
                        <ArrowLeft className="h-4 w-4" /> Back to Forms
                    </Link>
                </Button>
            </div>

            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                        <ClipboardList className="h-4 w-4 text-emerald-500" /> Form Configuration
                    </CardTitle>
                    <CardDescription>{t("config_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("form_title_label")}</label>
                            <Input
                                required
                                value={draft.title}
                                onChange={(e) => patch({ title: e.target.value, slug: draft.slug || slugify(e.target.value) })}
                                placeholder="e.g. Volunteer Application Form 2026"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("slug_label")}</label>
                            <Input
                                required
                                value={draft.slug}
                                onChange={(e) => patch({ slug: slugify(e.target.value) })}
                                placeholder="volunteer-application-2026"
                                className="font-mono text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                        <Textarea
                            value={draft.description}
                            onChange={(e) => patch({ description: e.target.value })}
                            placeholder={t("instructions_ph")}
                        />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                            <Select value={draft.status} onValueChange={(value) => patch({ status: value as FormBuilderDraft["status"] })}>
                                <SelectTrigger className="w-48">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="published">Published</SelectItem>
                                    <SelectItem value="archived">Archived</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex items-center gap-2 pt-6">
                            <Checkbox
                                id="form-public"
                                checked={draft.is_public}
                                onCheckedChange={(checked) => patch({ is_public: checked === true })}
                            />
                            <label htmlFor="form-public" className="text-sm">
                                Public form (accessible without sign-in)
                            </label>
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("submit_text_label")}</label>
                            <Input
                                value={draft.submit_button_text}
                                onChange={(e) => patch({ submit_button_text: e.target.value })}
                                placeholder={t("submit_text_ph")}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("success_label")}</label>
                            <Input
                                value={draft.success_message}
                                onChange={(e) => patch({ success_message: e.target.value })}
                                placeholder={t("success_ph")}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Fields</CardTitle>
                    <CardDescription>{t("fields_desc")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {draft.fields.map((field, index) => (
                        <div key={field.id} className="space-y-3 rounded-lg border p-3">
                            <div className="flex items-center justify-between gap-2">
                                <Badge variant="outline" className="font-mono">{index + 1}</Badge>
                                <div className="flex items-center gap-1">
                                    <Button type="button" variant="ghost" size="sm" disabled={index === 0} onClick={() => moveField(index, -1)}>
                                        <ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        disabled={index === draft.fields.length - 1}
                                        onClick={() => moveField(index, 1)}
                                    >
                                        <ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive"
                                        disabled={draft.fields.length <= 1}
                                        onClick={() => removeField(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Label</label>
                                    <Input
                                        value={field.label}
                                        onChange={(e) => patchField(index, { label: e.target.value })}
                                        placeholder={t("field_label_ph")}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("field_type_label")}</label>
                                    <Select
                                        value={field.type}
                                        onValueChange={(value) => patchField(index, { type: value as FormFieldType, options: undefined })}
                                    >
                                        <SelectTrigger className="h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fieldTypes.map((option) => (
                                                <SelectItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Placeholder</label>
                                    <Input
                                        value={field.placeholder ?? ""}
                                        onChange={(e) => patchField(index, { placeholder: e.target.value || undefined })}
                                        placeholder={t("field_placeholder_ph")}
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("help_label")}</label>
                                    <Input
                                        value={field.helpText ?? ""}
                                        onChange={(e) => patchField(index, { helpText: e.target.value || undefined })}
                                        placeholder={t("help_ph")}
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            {field.type === "select" || field.type === "radio" ? (
                                <div className="space-y-1">
                                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        Options (one per line)
                                    </label>
                                    <Textarea
                                        value={(field.options ?? []).join("\n")}
                                        onChange={(e) => patchField(index, { options: e.target.value.split("\n").filter((v) => v.trim() !== "") })}
                                        className="min-h-16 font-mono text-xs"
                                        placeholder={"Option A\nOption B"}
                                    />
                                </div>
                            ) : null}
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`field-required-${field.id}`}
                                    checked={field.required}
                                    onCheckedChange={(checked) => patchField(index, { required: checked === true })}
                                />
                                <label htmlFor={`field-required-${field.id}`} className="text-xs">
                                    Required
                                </label>
                            </div>

                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" className="gap-1" onClick={addField}>
                        <Plus className="h-3 w-3" /> Add field
                    </Button>
                </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
                <Button asChild variant="outline">
                    <Link href={backHref}>Cancel</Link>
                </Button>
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {loading ? "Saving..." : formId ? "Save changes" : "Create form"}
                </Button>
            </div>

        </form>
    );

}

