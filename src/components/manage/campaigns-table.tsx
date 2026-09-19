"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { createCampaign, deleteCampaign } from "@/actions/campaigns";
import type { Campaign } from "@/types/domain/projects";

interface CampaignsTableProps {
    campaigns: Campaign[];
}

const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed", "cancelled"];

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}

function slugify(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
    return (
        <EntityTable<Campaign>
            items={campaigns}
            config={{
                singular: "campaign",
                searchPlaceholder: "Search campaigns...",
                emptyTitle: "No campaigns found",
                emptyDescription: "Create your first fundraising campaign.",
                columns: [
                    { label: "Name", render: (c) => <span className="font-medium">{c.name}</span> },
                    { label: "Status", render: (c) => <StatusBadge status={c.status} /> },
                    {
                        label: "Goal",
                        render: (c) => formatMoney(c.goal_amount, c.currency),
                        className: "text-right",
                    },
                    {
                        label: "Raised",
                        render: (c) => formatMoney(c.raised_amount, c.currency),
                        className: "text-right",
                    },
                    {
                        label: "Progress",
                        render: (c) => `${Math.round((c.raised_amount / c.goal_amount) * 100)}%`,
                    },
                    {
                        label: "Starts",
                        render: (c) => c.start_date ? new Date(c.start_date).toLocaleDateString() : "—",
                    },
                    {
                        label: "Ends",
                        render: (c) => c.end_date ? new Date(c.end_date).toLocaleDateString() : "—",
                    },
                ],
                fields: [
                    { name: "name", label: "Name", required: true, fullWidth: true },
                    { name: "description", label: "Description", fullWidth: true },
                    { name: "goal_amount", label: "Goal amount", type: "number", required: true },
                    { name: "currency", label: "Currency", defaultValue: "EUR" },
                    { name: "status", label: "Status", type: "select", options: CAMPAIGN_STATUSES, defaultValue: "draft" },
                    { name: "start_date", label: "Start date", type: "date" },
                    { name: "end_date", label: "End date", type: "date" },
                ],
                filter: (c, q) => {
                    const s = q.toLowerCase();
                    return c.name.toLowerCase().includes(s) || (c.description ?? "").toLowerCase().includes(s);
                },
                onCreate: async (values) => {
                    const res = await createCampaign({
                        name: values.name.trim(),
                        slug: slugify(values.name) || crypto.randomUUID(),
                        description: values.description?.trim() || null,
                        goal_amount: Number(values.goal_amount),
                        currency: values.currency || "EUR",
                        status: values.status as Campaign["status"],
                        start_date: values.start_date || null,
                        end_date: values.end_date || null,
                    });
                    return { error: res.error };
                },
                onDelete: async (id) => {
                    const res = await deleteCampaign(id);
                    return { error: res.error };
                },
                deleteLabel: (c) => c.name,
            }}
        />
    );
}