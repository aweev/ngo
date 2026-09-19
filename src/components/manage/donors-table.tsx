"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { createDonor, deleteDonor } from "@/actions/donors";
import type { Donor } from "@/types/domain/donors";

interface DonorsTableProps {
    donors: Donor[];
}

const DONOR_TYPES = ["individual", "corporate", "foundation", "government", "anonymous"];
const DONOR_STATUSES = ["active", "inactive", "prospect", "lapsed"];

function formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
}

export function DonorsTable({ donors }: DonorsTableProps) {
    return (
        <EntityTable<Donor>
            items={donors}
            config={{
                singular: "donor",
                searchPlaceholder: "Search donors...",
                emptyTitle: "No donors found",
                emptyDescription: "Add your first donor to start tracking contributions.",
                columns: [
                    { label: "Name", render: (d) => <span className="font-medium">{d.name}</span> },
                    {
                        label: "Type",
                        render: (d) => <span className="text-muted-foreground">{d.type.replace(/_/g, " ")}</span>,
                    },
                    { label: "Email", render: (d) => <span className="text-muted-foreground">{d.email ?? "—"}</span> },
                    {
                        label: "Total donated",
                        render: (d) => formatMoney(d.total_donated, d.currency),
                    },
                    {
                        label: "Last donation",
                        render: (d) => d.last_donation_date ? new Date(d.last_donation_date).toLocaleDateString() : "—",
                    },
                    { label: "Status", render: (d) => <StatusBadge status={d.status} /> },
                ],
                fields: [
                    { name: "name", label: "Name", required: true, fullWidth: true },
                    { name: "type", label: "Type", type: "select", options: DONOR_TYPES, defaultValue: "individual" },
                    { name: "email", label: "Email", type: "email" },
                    { name: "phone", label: "Phone" },
                    { name: "currency", label: "Currency", defaultValue: "EUR" },
                    { name: "status", label: "Status", type: "select", options: DONOR_STATUSES, defaultValue: "prospect" },
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
                onDelete: async (id) => {
                    const res = await deleteDonor(id);
                    return { error: res.error };
                },
                deleteLabel: (d) => d.name,
            }}
        />
    );
}