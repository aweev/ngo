"use client";

import { EntityTable } from "@/components/manage/entity-table";
import { StatusBadge } from "@/components/manage/status-badge";
import { createVolunteer, deleteVolunteer } from "@/actions/volunteers";
import type { Volunteer } from "@/types/domain/volunteers";

interface VolunteersTableProps {
    volunteers: Volunteer[];
}

const VOLUNTEER_STATUSES = ["active", "inactive", "pending", "on_break"];
const CHECK_STATUSES = ["pending", "approved", "rejected", "not_required"];

export function VolunteersTable({ volunteers }: VolunteersTableProps) {
    return (
        <EntityTable<Volunteer>
            items={volunteers}
            config={{
                singular: "volunteer",
                searchPlaceholder: "Search volunteers...",
                emptyTitle: "No volunteers found",
                emptyDescription: "Add your first volunteer to start building your volunteer base.",
                columns: [
                    {
                        label: "Name",
                        render: (v) => (
                            <span className="font-medium">{v.first_name} {v.last_name}</span>
                        ),
                    },
                    { label: "Email", render: (v) => <span className="text-muted-foreground">{v.email}</span> },
                    { label: "Phone", render: (v) => v.phone ?? "—" },
                    {
                        label: "Skills",
                        render: (v) => v.skills.slice(0, 2).join(", ") || "—",
                    },
                    { label: "Hours", render: (v) => String(v.hours_logged) },
                    { label: "Status", render: (v) => <StatusBadge status={v.status} /> },
                    { label: "Background check", render: (v) => v.background_check_status.replace(/_/g, " ") },
                ],
                fields: [
                    { name: "first_name", label: "First name", required: true },
                    { name: "last_name", label: "Last name", required: true },
                    { name: "email", label: "Email", type: "email", required: true, fullWidth: true },
                    { name: "phone", label: "Phone" },
                    { name: "skills", label: "Skills (comma separated)", fullWidth: true },
                    { name: "interests", label: "Interests (comma separated)", fullWidth: true },
                    { name: "status", label: "Status", type: "select", options: VOLUNTEER_STATUSES, defaultValue: "pending" },
                    {
                        name: "background_check_status",
                        label: "Background check",
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
                onDelete: async (id) => {
                    const res = await deleteVolunteer(id);
                    return { error: res.error };
                },
                deleteLabel: (v) => `${v.first_name} ${v.last_name}`,
            }}
        />
    );
}