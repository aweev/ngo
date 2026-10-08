"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { Link } from "@/lib/navigation";
import { useLocale, useTranslations } from "next-intl";
import { createDonor, deleteDonor, updateDonor } from "@/actions/donors";
import type { Donor } from "@/types/domain/donors";

interface DonorsTableProps {
    donors: Donor[];
}

const DONOR_TYPES = ["individual", "corporate", "foundation", "government", "anonymous"];
const DONOR_STATUSES = ["active", "inactive", "prospect", "lapsed"];

export function DonorsTable({ donors }: DonorsTableProps) {
    const t = useTranslations("Manage.Donors");
    const tEnums = useTranslations("Manage.Enums");
    const locale = useLocale();
    const formatMoney = (amount: number, currency: string): string =>
        new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
    const enumLabel = (v: string) => (tEnums.has(v) ? tEnums(v) : v.replace(/_/g, " "));

    return (
        <EntityTable<Donor>
            items={donors}
            config={{
                singular: t("entity_one"),
                plural: t("entity_many"),
                searchPlaceholder: t("search"),
                emptyTitle: t("empty_title"),
                emptyDescription: t("empty_desc"),
                columns: [
                    {
                        label: t("cols.name"),
                        render: (d) => (
                            <Link href={`/admin/donors/${d.id}`} className="font-medium hover:underline">
                                {d.name}
                            </Link>
                        ),
                    },
                    {
                        label: t("cols.type"),
                        render: (d) => <span className="text-muted-foreground">{enumLabel(d.type)}</span>,
                    },
                    { label: t("cols.email"), render: (d) => <span className="text-muted-foreground">{d.email ?? "—"}</span> },
                    {
                        label: t("cols.total_donated"),
                        render: (d) => formatMoney(d.total_donated, d.currency),
                    },
                    {
                        label: t("cols.last_donation"),
                        render: (d) => d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : "—",
                    },
                    { label: t("cols.status"), render: (d) => <StatusBadge status={d.status} /> },
                ],
                fields: [
                    { name: "name", label: t("fields.name"), required: true, fullWidth: true },
                    { name: "type", label: t("fields.type"), type: "select", options: DONOR_TYPES, defaultValue: "individual" },
                    { name: "email", label: t("fields.email"), type: "email" },
                    { name: "phone", label: t("fields.phone") },
                    { name: "currency", label: t("fields.currency"), defaultValue: "EUR" },
                    { name: "status", label: t("fields.status"), type: "select", options: DONOR_STATUSES, defaultValue: "prospect" },
                ],
                filter: (d, q) => {
                    const s = q.toLowerCase();
                    return (
                        d.name.toLowerCase().includes(s) ||
                        (d.email ?? "").toLowerCase().includes(s)
                    );
                },
                onCreate: async (values) => {
                    const res = await createDonor({
                        name: values.name.trim(),
                        type: values.type as Donor["type"],
                        email: values.email?.trim() || null,
                        phone: values.phone?.trim() || null,
                        currency: values.currency || "EUR",
                        status: values.status as Donor["status"],
                    });
                    return { error: res.error };
                },
                onEdit: async (id, values) => {
                    const res = await updateDonor(id, {
                        name: values.name.trim(),
                        type: values.type as Donor["type"],
                        email: values.email?.trim() || null,
                        phone: values.phone?.trim() || null,
                        currency: values.currency || "EUR",
                        status: values.status as Donor["status"],
                    });
                    return { error: res.error };
                },
                onDelete: async (id) => {
                    const res = await deleteDonor(id);
                    return { error: res.error };
                },
                deleteLabel: (d) => d.name,
            }}
        />
    );
}