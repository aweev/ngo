"use client";

import { useState } from "react";
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
            setError("A budget name and total amount are required.");
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
                <Plus className="h-4 w-4" /> New Budget
            </Button>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Create budget</CardTitle>
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
                            <label htmlFor="budget-name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Budget name</label>
                            <Input id="budget-name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Operations 2026" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="budget-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total amount (EUR)</label>
                            <Input id="budget-amount" required type="number" min="0" step="0.01" value={totalAmount} onChange={(e) => setTotalAmount(e.target.value)} placeholder="50000" />
                        </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</label>
                            <Select value={periodType} onValueChange={(v) => setPeriodType(v as BudgetPeriodType)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="annual">Annual</SelectItem>
                                    <SelectItem value="quarterly">Quarterly</SelectItem>
                                    <SelectItem value="monthly">Monthly</SelectItem>
                                    <SelectItem value="project">Project-based</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</label>
                            <Select value={status} onValueChange={(v) => setStatus(v as BudgetStatus)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="approved">Approved</SelectItem>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="closed">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="budget-notes" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</label>
                        <Textarea id="budget-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Scope, constraints, links to proposals..." />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Creating..." : "Create budget"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
