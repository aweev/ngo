"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { initiateOffboarding } from "@/actions/governance";
import { UserMinus, ArrowLeft } from "lucide-react";
import { Link } from "@/lib/navigation";

export default function OffboardPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [personId, setPersonId] = useState("");
    const [personType, setPersonType] = useState<"worker" | "volunteer">("worker");
    const [reason, setReason] = useState("");
    const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split("T")[0]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!personId || !reason) return;
        setLoading(true);

        const res = await initiateOffboarding({
            person_id: personId,
            person_type: personType,
            reason,
            effective_date: effectiveDate,
        });

        setLoading(false);
        if (!res.error) {
            router.push("/admin/hr");
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex items-center gap-2">
                <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                    <Link href="/admin/hr">
                        <ArrowLeft className="h-4 w-4" /> Back to HR Lifecycle
                    </Link>
                </Button>
            </div>

            <PageHeader
                title="Initiate Offboarding / Termination"
                description="Automated system access revocation, hardware collection checklist, and ED exit interview."
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserMinus className="h-4 w-4 text-rose-500" /> Offboarding Details
                        </CardTitle>
                        <CardDescription>Select the personnel ID and effective departure date.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personnel ID (UUID)</label>
                                <Input
                                    required
                                    value={personId}
                                    onChange={(e) => setPersonId(e.target.value)}
                                    placeholder="Enter Worker or Volunteer UUID"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Effective Date</label>
                                <Input
                                    type="date"
                                    required
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Offboarding Reason</label>
                            <Textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Contract expiration, resignation, performance, or reorganization..."
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/hr">Cancel</Link>
                    </Button>
                    <Button type="submit" variant="destructive" disabled={loading}>
                        {loading ? "Initiating..." : "Initiate Offboarding Protocol"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
