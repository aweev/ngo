"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { useTranslations } from "next-intl";
import { createPartner, deletePartner, updatePartner } from "@/actions/partners";
import type { Partner } from "@/types/domain/partners";

interface PartnersTableProps {
    partners: Partner[];
}

const PARTNER_TYPES = ["corporate", "government", "ngo", "educational", "individual", "other"];
const PARTNERSHIP_TYPES = ["financial", "in_kind", "strategic", "implementing", "other"];
const PARTNER_STATUSES = ["active", "inactive", "prospect", "former"];

export function PartnersTable({ partners }: PartnersTableProps) {
    const t = useTranslations("Manage.Partners");
    const tEnums = useTranslations("Manage.Enums");
    const enumLabel = (v: string) => (tEnums.has(v) ? tEnums(v) : v.replace(/_/g, " "));

    return (
        <EntityTable<Partner>
            items={partners}
            config={{
                singular: t("entity_one"),
                plural: t("entity_many"),
                searchPlaceholder: t("search"),
                emptyTitle: t("empty_title"),
                emptyDescription: t("empty_desc"),
                columns: [
                    { label: t("cols.name"), render: (p) => <span className="font-medium">{p.name}</span> },
                    {
                        label: t("cols.type"),
                        render: (p) => <span className="text-muted-foreground">{enumLabel(p.type)}</span>,
                    },
                    { label: t("cols.email"), render: (p) => <span className="text-muted-foreground">{p.email}</span> },
                    { label: t("cols.website"), render: (p) => p.website ? <span className="text-primary">{p.website}</span> : "—" },
                    {
                        label: t("cols.partnership"),
                        render: (p) => <span className="text-muted-foreground">{enumLabel(p.partnership_type)}</span>,
                    },
                    { label: t("cols.status"), render: (p) => <StatusBadge status={p.status} /> },
                ],
                fields: [
                    { name: "name", label: t("fields.name"), required: true, fullWidth: true },
                    { name: "type", label: t("fields.type"), type: "select", options: PARTNER_TYPES, defaultValue: "corporate" },
                    { name: "email", label: t("fields.email"), type: "email", required: true },
                    { name: "phone", label: t("fields.phone") },
                    { name: "website", label: t("fields.website"), fullWidth: true },
                    {
                        name: "partnership_type",
                        label: t("fields.partnership_type"),
                        type: "select",
                        options: PARTNERSHIP_TYPES,
                        defaultValue: "strategic",
                    },
                    { name: "status", label: t("fields.status"), type: "select", options: PARTNER_STATUSES, defaultValue: "prospect" },
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
                onEdit: async (id, values) => {
                    const res = await updatePartner(id, {
                        name: values.name.trim(),
                        type: values.type as Partner["type"],
                        email: values.email.trim(),
                        phone: values.phone?.trim() || null,
                        website: values.website?.trim() || null,
                        partnership_type: values.partnership_type as Partner["partnership_type"],
                        status: values.status as Partner["status"],
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