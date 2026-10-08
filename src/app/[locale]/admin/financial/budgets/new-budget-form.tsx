"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createBudget } from "@/actions/financial";
import type { BudgetPeriodType, BudgetStatus } from "@/types/domain/financial";
import { Loader2, Plus } from "lucide-react";

export function NewBudgetForm() {
    const router = useRouter();
    const t = useTranslations("Admin.Financial.budgetForm");
    const [open, setOpen] = useState(false);
    const [name, setName] = useState("");
    const [totalAmount, setTotalAmount] = useState("");
    const [periodType, setPeriodType] = useState<BudgetPeriodType>("annual");
    const [status, setStatus] = useState<BudgetStatus>("draft");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!name.trim() || !totalAmount) {
            setError(t("required"));
            return;
        }
        setLoading(true);
        setError(null);
        const result = await createBudget({
            name: name.trim(),
            fiscal_year: new Date().getFullYear(),
            period_type: periodType,
            total_amount: Number(totalAmount),
            currency: "EUR",
            status,
            project_id: null,
            approved_by: null,
            approved_at: null,
            notes: notes.trim() || null,
        });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        setOpen(false);
        router.refresh();
    }

    if (!open) {
        return (
            <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> {t("new_budget")}
            </Button>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">{t("create_title")}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label htmlFor="budget-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("name_label")}</label>
                            <Input id="budget-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder={t("name_placeholder")} />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="budget-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("amount_label")}</label>
                            <Input id="budget-amount" required type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="50000" />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("period_label")}</label>
                            <Select value={periodType} onValueChange={(v) => setPeriodType(v as BudgetPeriodType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="annual">{t("period_annual")}</SelectItem>
                                    <SelectItem value="quarterly">{t("period_quarterly")}</SelectItem>
                                    <SelectItem value="monthly">{t("period_monthly")}</SelectItem>
                                    <SelectItem value="project">{t("period_project")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("status_label")}</label>
                            <Select value={status} onValueChange={(v) => setStatus(v as BudgetStatus)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">{t("status_draft")}</SelectItem>
                                    <SelectItem value="approved">{t("status_approved")}</SelectItem>
                                    <SelectItem value="active">{t("status_active")}</SelectItem>
                                    <SelectItem value="closed">{t("status_closed")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="budget-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("notes_label")}</label>
                        <Textarea id="budget-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notes_placeholder")} />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? t("creating") : t("create")}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
