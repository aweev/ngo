"use client";

import { useState } from "react";
import { approveExpense, createExpense, rejectExpense } from "@/actions/financial";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Plus, X } from "lucide-react";

export function NewExpenseForm() {
    const [open, setOpen] = useState(false);
    const [title, setTitle] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!title.trim() || !amount) {
            setError("A title and amount are required.");
            return;
        }
        setLoading(true);
        setError(null);
        const result = await createExpense({
            title: title.trim(),
            description: description.trim() || null,
            amount: Number(amount),
            currency: "EUR",
            category: category.trim() || null,
            budget_id: null,
            budget_line_id: null,
            project_id: null,
            receipt_url: null,
            paid_at: null,
            vendor: null,
            submitted_by: null,
            approved_by: null,
            approved_at: null,
        });
        setLoading(false);
        if (result.error) {
            setError(result.error);
            return;
        }
        setOpen(false);
        setTitle("");
        setAmount("");
        setCategory("");
        setDescription("");
        window.location.reload();
    }

    if (!open) {
        return (
            <Button onClick={() => setOpen(true)} className="gap-2">
                <Plus className="h-4 w-4" /> Log Expense
            </Button>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-base">Log expense</CardTitle>
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
                            <label htmlFor="expense-title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Title</label>
                            <Input id="expense-title" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Venue rental" />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor="expense-amount" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount (EUR)</label>
                            <Input id="expense-amount" required type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="250.00" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="expense-category" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</label>
                        <Input id="expense-category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Events, Travel, Supplies" />
                    </div>
                    <div className="space-y-1">
                        <label htmlFor="expense-description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</label>
                        <Textarea id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Justification for this expense..." />
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Submitting..." : "Submit for approval"}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}

export function ExpenseApprovalButtons({ expenseId }: { expenseId: string }) {
    const [loading, setLoading] = useState<"approve" | "reject" | null>(null);

    async function handle(action: "approve" | "reject") {
        setLoading(action);
        if (action === "approve") await approveExpense(expenseId);
        else await rejectExpense(expenseId);
        setLoading(null);
        window.location.reload();
    }

    return (
        <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" className="gap-1" disabled={loading !== null} onClick={() => handle("approve")}>
                {loading === "approve" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                Approve
            </Button>
            <Button size="sm" variant="ghost" className="gap-1" disabled={loading !== null} onClick={() => handle("reject")}>
                {loading === "reject" ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                Reject
            </Button>
        </div>
    );
}
