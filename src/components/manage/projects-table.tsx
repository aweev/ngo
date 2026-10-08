"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { useLocale, useTranslations } from "next-intl";
import { createProject, deleteProject, updateProject } from "@/actions/projects";
import type { Project } from "@/types/domain/projects";

interface ProjectsTableProps {
    projects: Project[];
}

const PROJECT_STATUSES = ["planning", "active", "paused", "completed", "cancelled"];

export function ProjectsTable({ projects }: ProjectsTableProps) {
    const t = useTranslations("Manage.Projects");
    const tEnums = useTranslations("Manage.Enums");
    const locale = useLocale();
    const formatMoney = (amount: number, currency: string): string =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
    const enumLabel = (v: string) => (tEnums.has(v) ? tEnums(v) : v.replace(/_/g, " "));

    function slugify(name: string): string {
        return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    return (
        <EntityTable<Project>
            items={projects}
            config={{
                singular: t("entity_one"),
                plural: t("entity_many"),
                searchPlaceholder: t("search"),
                emptyTitle: t("empty_title"),
                emptyDescription: t("empty_desc"),
                columns: [
                    { label: t("cols.name"), render: (p) => <span className="font-medium">{p.name}</span> },
                    { label: t("cols.category"), render: (p) => (p.category ? enumLabel(p.category) : "—") },
                    { label: t("cols.status"), render: (p) => <StatusBadge status={p.status} /> },
                    {
                        label: t("cols.budget"),
                        render: (p) => (p.budget != null ? formatMoney(p.budget, p.currency) : "—"),
                        className: "text-right",
                    },
                    {
                        label: t("cols.spent"),
                        render: (p) => formatMoney(p.spent, p.currency),
                        className: "text-right",
                    },
                    {
                        label: t("cols.progress"),
                        render: (p) => `${p.progress}%`,
                    },
                    { label: t("cols.location"), render: (p) => p.location ?? "—" },
                ],
                fields: [
                    { name: "name", label: t("fields.name"), required: true, fullWidth: true },
                    { name: "description", label: t("fields.description"), fullWidth: true },
                    { name: "category", label: t("fields.category") },
                    { name: "status", label: t("fields.status"), type: "select", options: PROJECT_STATUSES, defaultValue: "planning" },
                    { name: "budget", label: t("fields.budget"), type: "number" },
                    { name: "currency", label: t("fields.currency"), defaultValue: "EUR" },
                    { name: "location", label: t("fields.location") },
                    { name: "start_date", label: t("fields.start_date"), type: "date" },
                    { name: "end_date", label: t("fields.end_date"), type: "date" },
                ],
                filter: (p, q) => {
                    const s = q.toLowerCase();
                    return (
                        p.name.toLowerCase().includes(s) ||
                        (p.category ?? "").toLowerCase().includes(s) ||
                        (p.location ?? "").toLowerCase().includes(s)
                    );
                },
                onCreate: async (values) => {
                    const res = await createProject({
                        name: values.name.trim(),
                        slug: slugify(values.name) || crypto.randomUUID(),
                        description: values.description?.trim() || null,
                        category: values.category?.trim() || null,
                        status: values.status as Project["status"],
                        budget: values.budget ? Number(values.budget) : null,
                        currency: values.currency || "EUR",
                        location: values.location?.trim() || null,
                        start_date: values.start_date || null,
                        end_date: values.end_date || null,
                    });
                    return { error: res.error };
                },
                onEdit: async (id, values) => {
                    const res = await updateProject(id, {
                        name: values.name.trim(),
                        description: values.description?.trim() || null,
                        category: values.category?.trim() || null,
                        status: values.status as Project["status"],
                        budget: values.budget ? Number(values.budget) : null,
                        currency: values.currency || "EUR",
                        location: values.location?.trim() || null,
                        start_date: values.start_date || null,
                        end_date: values.end_date || null,
                    });
                    return { error: res.error };
                },
                onDelete: async (id) => {
                    const res = await deleteProject(id);
                    return { error: res.error };
                },
                deleteLabel: (p) => p.name,
            }}
        />
    );
}