"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { createProject, deleteProject } from "@/actions/projects";
import type { Project } from "@/types/domain/projects";

interface ProjectsTableProps {
    projects: Project[];
}

const PROJECT_STATUSES = ["planning", "active", "paused", "completed", "cancelled"];

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}

function slugify(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function ProjectsTable({ projects }: ProjectsTableProps) {
    return (
        <EntityTable<Project>
            items={projects}
            config={{
                singular: "project",
                searchPlaceholder: "Search projects...",
                emptyTitle: "No projects found",
                emptyDescription: "Create your first project or program.",
                columns: [
                    { label: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
                    { label: "Category", render: (p) => p.category?.replace(/_/g, " ") ?? "—" },
                    { label: "Status", render: (p) => <StatusBadge status={p.status} /> },
                    {
                        label: "Budget",
                        render: (p) => (p.budget != null ? formatMoney(p.budget, p.currency) : "—"),
                        className: "text-right",
                    },
                    {
                        label: "Spent",
                        render: (p) => formatMoney(p.spent, p.currency),
                        className: "text-right",
                    },
                    {
                        label: "Progress",
                        render: (p) => `${p.progress}%`,
                    },
                    { label: "Location", render: (p) => p.location ?? "—" },
                ],
                fields: [
                    { name: "name", label: "Name", required: true, fullWidth: true },
                    { name: "description", label: "Description", fullWidth: true },
                    { name: "category", label: "Category" },
                    { name: "status", label: "Status", type: "select", options: PROJECT_STATUSES, defaultValue: "planning" },
                    { name: "budget", label: "Budget", type: "number" },
                    { name: "currency", label: "Currency", defaultValue: "EUR" },
                    { name: "location", label: "Location" },
                    { name: "start_date", label: "Start date", type: "date" },
                    { name: "end_date", label: "End date", type: "date" },
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
                onDelete: async (id) => {
                    const res = await deleteProject(id);
                    return { error: res.error };
                },
                deleteLabel: (p) => p.name,
            }}
        />
    );
}