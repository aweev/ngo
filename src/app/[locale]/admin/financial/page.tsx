import { getTranslations } from "next-intl/server";
import { PageHeader } from "@/components/manage/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getBudgets, getExpenses } from "@/actions/financial";
import { Plus, Wallet, Receipt } from "lucide-react";
import { Link } from "@/lib/navigation";

export const dynamic = "force-dynamic";

export default async function FinancialPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Admin.Financial" });
    const tEnums = await getTranslations({ locale, namespace: "Manage.Enums" });
    const [{ data: budgets }, { data: expenses }] = await Promise.all([
        getBudgets(),
        getExpenses(),
    ]);
    const formatMoney = (amount: number, currency: string) =>
        amount.toLocaleString(locale, { style: "currency", currency });

    return (
        <div className="space-y-6">
            <PageHeader
                title={t("title")}
                description={t("description")}
                action={
                    <div className="flex gap-2">
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/admin/financial/reconcile">
                                <Receipt className="h-4 w-4" />
                                {t("reconcile.reconcile_link")}
                            </Link>
                        </Button>
                        <Button asChild variant="outline" className="gap-2">
                            <Link href="/admin/financial/budgets">
                                <Wallet className="h-4 w-4" />
                                {t("budgets")}
                            </Link>
                        </Button>
                        <Button asChild className="gap-2">
                            <Link href="/admin/financial/expenses">
                                <Plus className="h-4 w-4" />
                                {t("log_expense")}
                            </Link>
                        </Button>
                    </div>
                }
            />

            <div className="grid gap-6 md:grid-cols-2">
                {/* Active Budgets */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" /> {t("active_budgets")}
                    </h3>
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                        {(!budgets || budgets.length === 0) ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">{t("no_budgets")}</p>
                        ) : (
                            budgets.map((b) => (
                                <div key={b.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                    <div>
                                        <span className="font-semibold">{b.name}</span>
                                        <p className="text-xs text-muted-foreground">
                                            {t("period", { period: tEnums.has(b.period_type) ? tEnums(b.period_type) : b.period_type })}
                                        </p>
                                    </div>
                                    <span className="font-mono font-bold text-emerald-600">
                                        {formatMoney(b.total_amount, b.currency || "EUR")}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Expenses Log */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Receipt className="h-4 w-4 text-primary" /> {t("recent_expenses")}
                    </h3>
                    <div className="rounded-lg border bg-card p-4 space-y-3">
                        {(!expenses || expenses.length === 0) ? (
                            <p className="text-xs text-muted-foreground py-4 text-center">{t("no_expenses")}</p>
                        ) : (
                            expenses.map((e) => (
                                <div key={e.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                                    <div>
                                        <span className="font-semibold">{e.title}</span>
                                        <p className="text-xs text-muted-foreground">{e.category || t("general")}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="font-mono font-bold block">
                                            {formatMoney(e.amount, e.currency || "EUR")}
                                        </span>
                                        <Badge variant={e.status === 'approved' ? 'default' : 'outline'} className="text-[10px]">
                                            {tEnums.has(e.status) ? tEnums(e.status) : e.status}
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
