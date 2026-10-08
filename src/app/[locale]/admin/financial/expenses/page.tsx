import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getExpenses } from "@/actions/financial";
import { ExpenseApprovalButtons, NewExpenseForm } from "./expense-forms";
import { ArrowLeft, Receipt } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function ExpensesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Financial.expensesPage" });
    const { data: expenses } = await getExpenses();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/financial">
                    <ArrowLeft className="h-4 w-4" /> {t("back")}
                </Link>
            </Button>
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={<NewExpenseForm />}
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("cols.expense")}</TableHead>
                            <TableHead>{t("cols.amount")}</TableHead>
                            <TableHead>{t("cols.status")}</TableHead>
                            <TableHead className="text-right">{t("cols.decision")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!expenses || expenses.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    {t("empty")}
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
                                        <span className="text-xs text-muted-foreground capitalize">{e.category || t("general")}</span>
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-sm">
                                        {e.amount.toLocaleString("en", { style: "currency", currency: e.currency || "EUR" })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={e.status === "approved" ? "default" : e.status === "rejected" ? "destructive" : e.status === "approved_first" ? "secondary" : "outline"}
                                            className="capitalize"
                                        >
                                            {e.status === "approved_first" ? t("needs_second") : e.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {e.status === "pending" || e.status === "approved_first" ? (
                                            <ExpenseApprovalButtons expenseId={e.id} stage={e.status === "approved_first" ? 2 : 1} />
                                        ) : (
                                            <span className="text-xs text-muted-foreground">{t("decided")}</span>
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
