"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { requestOrganizationRole } from "@/actions/role-requests";
import { Button } from "@/components/ui/button";

export function RoleRequestForm() {
    const [role, setRole] = useState<"manager" | "admin">("manager");
    const [reason, setReason] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setMessage("");
        const result = await requestOrganizationRole(role, reason);
        setMessage(result.error ?? "Request submitted for administrator review.");
        if (result.success) setReason("");
        setLoading(false);
    };

    return (
        <form onSubmit={submit} className="space-y-3">
            <select value={role} onChange={(event) => setRole(event.target.value as "manager" | "admin")} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                <option value="manager">Request Manager access</option>
                <option value="admin">Request Admin access</option>
            </select>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why do you need this access?" className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
            <Button type="submit" disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <Send />}{loading ? "Submitting..." : "Request access"}</Button>
            {message && <p className="text-sm text-muted-foreground" role="status">{message}</p>}
        </form>
    );
}