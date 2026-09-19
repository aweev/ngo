"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { createPartner, deletePartner } from "@/actions/partners";
import type { Partner } from "@/types/domain/partners";

interface PartnersTableProps {
    partners: Partner[];
}

const PARTNER_TYPES = ["corporate", "government", "ngo", "educational", "individual", "other"];
const PARTNERSHIP_TYPES = ["financial", "in_kind", "strategic", "implementing", "other"];
const PARTNER_STATUSES = ["active", "inactive", "prospect", "former"];

export function PartnersTable({ partners }: PartnersTableProps) {
    return (
        <EntityTable<Partner>
            items={partners}
            config={{
                singular: "partner",
                searchPlaceholder: "Search partners...",
                emptyTitle: "No partners found",
                emptyDescription: "Add your first partner to grow your network.",
                columns: [
                    { label: "Name", render: (p) => <span className="font-medium">{p.name}</span> },
                    {
                        label: "Type",
                        render: (p) => <span className="text-muted-foreground">{p.type.replace(/_/g, " ")}</span>,
                    },
                    { label: "Email", render: (p) => <span className="text-muted-foreground">{p.email}</span> },
                    { label: "Website", render: (p) => p.website ? <span className="text-primary">{p.website}</span> : "—" },
                    {
                        label: "Partnership",
                        render: (p) => <span className="text-muted-foreground">{p.partnership_type.replace(/_/g, " ")}</span>,
                    },
                    { label: "Status", render: (p) => <StatusBadge status={p.status} /> },
                ],
                fields: [
                    { name: "name", label: "Organization name", required: true, fullWidth: true },
                    { name: "type", label: "Type", type: "select", options: PARTNER_TYPES, defaultValue: "corporate" },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "phone", label: "Phone" },
                    { name: "website", label: "Website", fullWidth: true },
                    {
                        name: "partnership_type",
                        label: "Partnership type",
                        type: "select",
                        options: PARTNERSHIP_TYPES,
                        defaultValue: "strategic",
                    },
                    { name: "status", label: "Status", type: "select", options: PARTNER_STATUSES, defaultValue: "prospect" },
                ],
                filter: (p, q) => {
                    const s = q.toLowerCase();
                    return (
                        p.name.toLowerCase().includes(s) ||
                        p.email.toLowerCase().includes(s) ||
                        (p.contact_person ?? "").toLowerCase().includes(s)
                    );
                },
                onCreate: async (values) => {
                    const res = await createPartner({
                        name: values.name.trim(),
                        type: values.type as Partner["type"],
                        email: values.email.trim(),
                        phone: values.phone?.trim() || null,
                        website: values.website?.trim() || null,
                        partnership_type: values.partnership_type as Partner["partnership_type"],
                        status: values.status as Partner["status"],
                        currency: "EUR",
                    });
                    return { error: res.error };
                },
                onDelete: async (id) => {
                    const res = await deletePartner(id);
                    return { error: res.error };
                },
                deleteLabel: (p) => p.name,
            }}
        />
    );
}