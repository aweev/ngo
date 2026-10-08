"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
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
    const t = useTranslations("Admin.Hr.Offboard");
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
                        <ArrowLeft className="h-4 w-4" /> {t("back")}
                    </Link>
                </Button>
            </div>

            <PageHeader
                title={t("title")}
                description={t("description")}
            />

            <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <UserMinus className="h-4 w-4 text-rose-500" /> {t("details_title")}
                        </CardTitle>
                        <CardDescription>{t("details_description")}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("person_id_label")}</label>
                                <Input
                                    required
                                    value={personId}
                                    onChange={(e) => setPersonId(e.target.value)}
                                    placeholder={t("person_id_placeholder")}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("effective_date_label")}</label>
                                <Input
                                    type="date"
                                    required
                                    value={effectiveDate}
                                    onChange={(e) => setEffectiveDate(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("reason_label")}</label>
                            <Textarea
                                required
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder={t("reason_placeholder")}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3">
                    <Button asChild variant="outline">
                        <Link href="/admin/hr">{t("cancel")}</Link>
                    </Button>
                    <Button type="submit" variant="destructive" disabled={loading}>
                        {loading ? t("initiating") : t("initiate")}
                    </Button>
                </div>
            </form>
        </div>
    );
}
