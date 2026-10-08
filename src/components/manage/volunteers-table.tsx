"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { useTranslations } from "next-intl";
import { createVolunteer, deleteVolunteer, updateVolunteer } from "@/actions/volunteers";
import type { Volunteer } from "@/types/domain/volunteers";

interface VolunteersTableProps {
    volunteers: Volunteer[];
}

const VOLUNTEER_STATUSES = ["active", "inactive", "pending", "on_break"];
const CHECK_STATUSES = ["pending", "approved", "rejected", "not_required"];

export function VolunteersTable({ volunteers }: VolunteersTableProps) {
    const t = useTranslations("Manage.Volunteers");
    const tEnums = useTranslations("Manage.Enums");
    const enumLabel = (v: string) => (tEnums.has(v) ? tEnums(v) : v.replace(/_/g, " "));

    return (
        <EntityTable<Volunteer>
            items={volunteers}
            config={{
                singular: t("entity_one"),
                plural: t("entity_many"),
                searchPlaceholder: t("search"),
                emptyTitle: t("empty_title"),
                emptyDescription: t("empty_desc"),
                columns: [
                    {
                        label: t("cols.name"),
                        render: (v) => (
                            <span className="font-medium">{v.first_name} {v.last_name}</span>
                        ),
                    },
                    { label: t("cols.email"), render: (v) => <span className="text-muted-foreground">{v.email}</span> },
                    { label: t("cols.phone"), render: (v) => v.phone ?? "—" },
                    {
                        label: t("cols.skills"),
                        render: (v) => v.skills.slice(0, 2).join(", ") || "—",
                    },
                    { label: t("cols.hours"), render: (v) => String(v.hours_logged) },
                    { label: t("cols.status"), render: (v) => <StatusBadge status={v.status} /> },
                    { label: t("cols.background_check"), render: (v) => enumLabel(v.background_check_status) },
                ],
                fields: [
                    { name: "first_name", label: t("fields.first_name"), required: true },
                    { name: "last_name", label: t("fields.last_name"), required: true },
                    { name: "email", label: t("fields.email"), type: "email", required: true, fullWidth: true },
                    { name: "phone", label: t("fields.phone") },
                    { name: "skills", label: t("fields.skills"), fullWidth: true },
                    { name: "interests", label: t("fields.interests"), fullWidth: true },
                    { name: "status", label: t("fields.status"), type: "select", options: VOLUNTEER_STATUSES, defaultValue: "pending" },
                    {
                        name: "background_check_status",
                        label: t("fields.background_check"),
                        type: "select",
                        options: CHECK_STATUSES,
                        defaultValue: "not_required",
                    },
                ],
                filter: (v, q) => {
                    const s = q.toLowerCase();
                    return (
                        v.first_name.toLowerCase().includes(s) ||
                        v.last_name.toLowerCase().includes(s) ||
                        v.email.toLowerCase().includes(s) ||
                        v.skills.some((k) => k.toLowerCase().includes(s))
                    );
                },
                onCreate: async (values) => {
                    const res = await createVolunteer({
                        first_name: values.first_name.trim(),
                        last_name: values.last_name.trim(),
                        email: values.email.trim(),
                        phone: values.phone?.trim() || null,
                        skills: values.skills?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
                        interests: values.interests?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
                        status: values.status as Volunteer["status"],
                        background_check_status: values.background_check_status as Volunteer["background_check_status"],
                    });
                    return { error: res.error };
                },
                onEdit: async (id, values) => {
                    const res = await updateVolunteer(id, {
                        first_name: values.first_name.trim(),
                        last_name: values.last_name.trim(),
                        email: values.email.trim(),
                        phone: values.phone?.trim() || null,
                        skills: values.skills?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
                        interests: values.interests?.split(",").map((s) => s.trim()).filter(Boolean) ?? [],
                        status: values.status as Volunteer["status"],
                        background_check_status: values.background_check_status as Volunteer["background_check_status"],
                    });
                    return { error: res.error };
                },
                onDelete: async (id) => {
                    const res = await deleteVolunteer(id);
                    return { error: res.error };
                },
                deleteLabel: (v) => `${v.first_name} ${v.last_name}`,
            }}
        />
    );
}