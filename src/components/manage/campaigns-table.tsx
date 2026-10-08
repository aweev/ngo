"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { useLocale, useTranslations } from "next-intl";
import { createCampaign, deleteCampaign, updateCampaign } from "@/actions/campaigns";
import type { Campaign } from "@/types/domain/projects";

interface CampaignsTableProps {
    campaigns: Campaign[];
}

const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed", "cancelled"];

export function CampaignsTable({ campaigns }: CampaignsTableProps) {
    const t = useTranslations("Manage.Campaigns");
    const locale = useLocale();
    const formatMoney = (amount: number, currency: string): string =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);

    function slugify(name: string): string {
        return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    }

    return (
        <EntityTable<Campaign>
            items={campaigns}
            config={{
                singular: t("entity_one"),
                plural: t("entity_many"),
                searchPlaceholder: t("search"),
                emptyTitle: t("empty_title"),
                emptyDescription: t("empty_desc"),
                columns: [
                    { label: t("cols.name"), render: (c) => <span className="font-medium">{c.name}</span> },
                    { label: t("cols.status"), render: (c) => <StatusBadge status={c.status} /> },
                    {
                        label: t("cols.goal"),
                        render: (c) => formatMoney(c.goal_amount, c.currency),
                        className: "text-right",
                    },
                    {
                        label: t("cols.raised"),
                        render: (c) => formatMoney(c.raised_amount, c.currency),
                        className: "text-right",
                    },
                    {
                        label: t("cols.progress"),
                        render: (c) => `${Math.round((c.raised_amount / c.goal_amount) * 100)}%`,
                    },
                    {
                        label: t("cols.starts"),
                        render: (c) => c.start_date ? new Date(c.start_date).toLocaleDateString() : "—",
                    },
                    {
                        label: t("cols.ends"),
                        render: (c) => c.end_date ? new Date(c.end_date).toLocaleDateString() : "—",
                    },
                ],
                fields: [
                    { name: "name", label: t("fields.name"), required: true, fullWidth: true },
                    { name: "description", label: t("fields.description"), fullWidth: true },
                    { name: "goal_amount", label: t("fields.goal_amount"), type: "number", required: true },
                    { name: "currency", label: t("fields.currency"), defaultValue: "EUR" },
                    { name: "status", label: t("fields.status"), type: "select", options: CAMPAIGN_STATUSES, defaultValue: "draft" },
                    { name: "start_date", label: t("fields.start_date"), type: "date" },
                    { name: "end_date", label: t("fields.end_date"), type: "date" },
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
                onEdit: async (id, values) => {
                    const res = await updateCampaign(id, {
                        name: values.name.trim(),
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