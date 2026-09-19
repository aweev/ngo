import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBudgets, getExpenses } from "@/actions/financial";
import { Plus, Wallet, Receipt } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function FinancialPage() {
    const [{ data: budgets }, { data: expenses }] = await Promise.all([
        getBudgets(),
        getExpenses(),
    ]);

    return (
        <div className="space-y-6">
            <PageHeader
                title="Financials & Expenses"
                description="Monitor active budgets, approve expense requests, and audit organization spend."
                action={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/admin/financial/budgets">
                                <Wallet className="h-4 w-4" />
                                Budgets
                            </Link>
                        </Button>
                        <Button asChild className="gap-2">
                            <Link href="/admin/financial/expenses">
                                <Plus className="h-4 w-4" />
                                Log Expense
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-6 md:grid-cols-2">
                {/* Active Budgets */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" /> Active Budgets
                    </h3>
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                        {(!budgets || budgets.length === 0) ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No budgets configured yet.</p>
                        ) : (
                            budgets.map((b) => (
                                <div key={b.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                    <div>
                                        <span className="font-semibold">{b.name}</span>
                                        <p className="text-xs text-muted-foreground capitalize">{b.period_type} period</p>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-600">
                                        {b.total_amount.toLocaleString("en", { style: "currency", currency: b.currency || "EUR" })}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Expenses Log */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" /> Recent Expenses
                    </h3>
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                        {(!expenses || expenses.length === 0) ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">No expenses submitted.</p>
                        ) : (
                            expenses.map((e) => (
                                <div key={e.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                    <div>
                                        <span className="font-semibold">{e.title}</span>
                                        <p className="text-xs text-muted-foreground capitalize">{e.category || "General"}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-bold block">
                                            {e.amount.toLocaleString("en", { style: "currency", currency: e.currency || "EUR" })}
                                        </span>
                                        <Badge variant={e.status === 'approved' ? 'default' : 'outline'} className="text-[10px] capitalize">
                                            {e.status}
                                        </Badge>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
