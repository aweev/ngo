import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExpenses } from "@/actions/financial";
import { ExpenseApprovalButtons, NewExpenseForm } from "./expense-forms";
import { ArrowLeft, Receipt } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
    const { data: expenses } = await getExpenses();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/financial">
                    <ArrowLeft className="h-4 w-4" /> Back to Financials
                </Link>
            </Button>
            <PageHeader
                title="Expenses"
                description="Review submitted expenses. Approval requires the finance.approve permission — you cannot approve your own submissions."
                action={<NewExpenseForm />}
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Expense</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Decision</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!expenses || expenses.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    No expenses submitted.
                                </TableCell>
                            </TableRow>
                        ) : (
                            expenses.map((e) => (
                                <TableRow key={e.id}>
                                    <TableCell className="font-semibold text-sm">
                                        <div className="flex items-center gap-2">
                                            <Receipt className="h-4 w-4 text-amber-600 shrink-0" />
                                            <span>{e.title}</span>
                                        </div>
                                        <span className="text-xs text-muted-foreground capitalize">{e.category || "General"}</span>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-sm">
                                        {e.amount.toLocaleString("en", { style: "currency", currency: e.currency || "EUR" })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={e.status === "approved" ? "default" : e.status === "rejected" ? "destructive" : "outline"}
                                            className="capitalize"
                                        >
                                            {e.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {e.status === "pending" ? (
                                            <ExpenseApprovalButtons expenseId={e.id} />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">Decided</span>
                                        )}
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
