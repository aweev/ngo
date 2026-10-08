import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getBudgets } from "@/actions/financial";
import { NewBudgetForm } from "./new-budget-form";
import { ArrowLeft, Wallet } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function BudgetsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Financial" });
    const tEnums = await getTranslations({ locale, namespace: "Manage.Enums" });
    const { data: budgets } = await getBudgets();

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/financial">
                    <ArrowLeft className="h-4 w-4" /> {t("back_to_financials")}
                </Link>
            </Button>
            <PageHeader
                title={t("budgets_title")}
                description={t("budgets_description")}
                action={<NewBudgetForm />}
            />

            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t("cols.budget")}</TableHead>
                            <TableHead>{t("cols.period")}</TableHead>
                            <TableHead>{t("cols.total")}</TableHead>
                            <TableHead>{t("cols.status")}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(!budgets || budgets.length === 0) ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                    {t("no_budgets")}
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
                                            <span className="text-xs text-muted-foreground">{t("fiscal_year", { year: b.fiscal_year })}</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-xs">
                                        {tEnums.has(b.period_type) ? tEnums(b.period_type) : b.period_type}
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-sm">
                                        {b.total_amount.toLocaleString(locale, { style: "currency", currency: b.currency || "EUR" })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={b.status === "active" ? "default" : "outline"}>
                                            {tEnums.has(b.status) ? tEnums(b.status) : b.status}
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
