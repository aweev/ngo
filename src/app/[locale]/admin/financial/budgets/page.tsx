import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBudgets } from "@/actions/financial";
import { NewBudgetForm } from "./new-budget-form";
import { ArrowLeft, Wallet } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
    const { data: budgets } = await getBudgets();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/financial">
                    <ArrowLeft className="h-4 w-4" /> Back to Financials
                </Link>
            </Button>
            <PageHeader
                title="Budgets"
                description="Plan fiscal periods, allocate funds, and track budget status."
                action={<NewBudgetForm />}
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Budget</TableHead>
                            <TableHead>Period</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!budgets || budgets.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    No budgets configured yet.
                                </TableCell>
                            </TableRow>
                        ) : (
                            budgets.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <Wallet className="h-4 w-4 text-emerald-600 shrink-0" />
                                            <span>{b.name}</span>
                                        </div>
                                        {b.fiscal_year && (
                                            <span className="text-xs text-muted-foreground">FY {b.fiscal_year}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="capitalize text-xs">{b.period_type}</TableCell>
                                    <TableCell className="font-mono font-bold text-sm">
                                        {b.total_amount.toLocaleString("en", { style: "currency", currency: b.currency || "EUR" })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={b.status === "active" ? "default" : "outline"} className="capitalize">
                                            {b.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
