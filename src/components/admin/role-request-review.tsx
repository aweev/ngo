"use client";

import { useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { reviewRoleRequest, type RoleRequest } from "@/actions/role-requests";
import { Button } from "@/components/ui/button";

export function RoleRequestReview({ initialRequests }: { initialRequests: RoleRequest[] }) {
    const t = useTranslations("Admin.Members.roleRequests");
    const [requests, setRequests] = useState(initialRequests);
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const review = async (id: string, decision: "approved" | "rejected") => {
        setLoadingId(id);
        const result = await reviewRoleRequest(id, decision, "");
        if (result.success) setRequests((current) => current.filter((request) => request.id !== id));
        setLoadingId(null);
    };

    if (requests.length === 0) return <p className="text-sm text-muted-foreground">{t("empty")}</p>;
    return <div className="space-y-3">{requests.map((request) => <div key={request.id} className="flex flex-col gap-3 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{t("user_request")} {request.requested_role}</p><p className="text-xs text-muted-foreground">{request.reason || t("no_reason")}</p></div><div className="flex gap-2"><Button size="sm" onClick={() => review(request.id, "approved")} disabled={loadingId === request.id}><Check />{t("approve")}</Button><Button size="sm" variant="outline" onClick={() => review(request.id, "rejected")} disabled={loadingId === request.id}>{loadingId === request.id ? <Loader2 className="animate-spin" /> : <X />}{t("reject")}</Button></div></div>)}</div>;
}