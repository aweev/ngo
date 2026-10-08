import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/manage/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FinanceSettingsForm } from '@/components/admin/finance-settings-form';
import { FxRateForm } from '@/components/admin/fx-rate-form';
import { getExchangeRates, getFinanceSettings } from '@/actions/fx';
import { getReconciliation } from '@/actions/reconciliation';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/lib/navigation';

export const dynamic = 'force-dynamic';

/**
 * Reconciliation: budget lines vs actuals, grants vs spend, and every open
 * issue (awaiting approvals, unfunded spend, missing receipts, missing FX
 * rates) on one screen. Converted columns are null-safe: no rate means the
 * native amount shows and the pair is listed, never guessed.
 */
export default async function ReconcilePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Admin.Financial.reconcile' });
    const [{ data: rec }, { data: settings }, { data: rates }] = await Promise.all([
        getReconciliation(),
        getFinanceSettings(),
        getExchangeRates(20),
    ]);

    const money = (amount: number, currency: string) =>
        amount.toLocaleString(locale, { style: 'currency', currency });

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/financial">
                    <ArrowLeft className="h-4 w-4" /> {t('back')}
                </Link>
            </Button>
            <PageHeader
                title={t('title')}
                description={t('desc')}
            />

            {rec?.missing_rates && rec.missing_rates.length > 0 && (
                <div className="rounded-lg border border-amber-500 bg-amber-50 p-4 text-sm dark:bg-amber-950">
                    {t('missing_rates_msg')} {rec.missing_rates.join(', ')}
                </div>
            )}

            {/* Budget lines */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('lines_title')} ({t('org_currency')}: {rec?.org_currency})
                </h2>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('col_budget')}</TableHead>
                                <TableHead>{t('col_line')}</TableHead>
                                <TableHead className="text-right">{t('col_allocated')}</TableHead>
                                <TableHead className="text-right">{t('col_spent')}</TableHead>
                                <TableHead className="text-right">{t('col_spent_org', { currency: rec?.org_currency ?? '' })}</TableHead>
                                <TableHead className="text-right">{t('col_remaining')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!rec || rec.lines.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                                        {t('empty_lines')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rec.lines.map((l) => (
                                    <TableRow key={l.line_id}>
                                        <TableCell className="text-sm">{l.budget_name}</TableCell>
                                        <TableCell className="text-sm font-semibold">{l.category}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{money(l.allocated, l.currency)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{money(l.spent, l.currency)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">
                                            {l.spent_in_org_currency === null ? '—' : money(l.spent_in_org_currency, rec.org_currency)}
                                        </TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold">
                                            {money(l.remaining, l.currency)}
                                            {l.remaining < 0 && (
                                                <Badge variant="destructive" className="ml-2 text-[10px]">
                                                    {t('overspent')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* Grants */}
            <section className="space-y-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{t('grants_title')}</h2>
                <div className="rounded-lg border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('col_grant')}</TableHead>
                                <TableHead>{t('col_funder')}</TableHead>
                                <TableHead className="text-right">{t('col_committed')}</TableHead>
                                <TableHead className="text-right">{t('col_spent')}</TableHead>
                                <TableHead className="text-right">{t('col_remaining')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {!rec || rec.grants.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                                        {t('empty_grants')}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                rec.grants.map((g) => (
                                    <TableRow key={g.grant_id}>
                                        <TableCell className="text-sm font-semibold">{g.grant_title}</TableCell>
                                        <TableCell className="text-sm">{g.funder}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{money(g.committed, g.currency)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm">{money(g.spent, g.currency)}</TableCell>
                                        <TableCell className="text-right font-mono text-sm font-bold">
                                            {money(g.remaining, g.currency)}
                                            {g.remaining < 0 && (
                                                <Badge variant="destructive" className="ml-2 text-[10px]">
                                                    {t('overspent')}
                                                </Badge>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* Attention lists */}
            <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-semibold">{t('awaiting_title')}: {rec?.awaiting ?? 0}</h3>
                    {(rec?.awaiting_rows ?? []).slice(0, 5).map((e) => (
                        <p key={e.id as string} className="border-b py-1 text-xs last:border-0">
                            {e.title as string} — {money(Number(e.amount), (e.currency as string) ?? 'EUR')}
                        </p>
                    ))}
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-semibold">{t('unlinked_title')}: {rec?.unlinked_count ?? 0}</h3>
                    {(rec?.unlinked_rows ?? []).slice(0, 5).map((e) => (
                        <p key={e.id as string} className="border-b py-1 text-xs last:border-0">
                            {e.title as string} — {money(Number(e.amount), (e.currency as string) ?? 'EUR')}
                        </p>
                    ))}
                </div>
                <div className="rounded-lg border bg-card p-4">
                    <h3 className="text-sm font-semibold">{t('receipts_title')}: {(rec?.missing_receipts ?? []).length}</h3>
                    {(rec?.missing_receipts ?? []).slice(0, 5).map((e) => (
                        <p key={e.id as string} className="border-b py-1 text-xs last:border-0">
                            {e.title as string} — {money(Number(e.amount), (e.currency as string) ?? 'EUR')}
                        </p>
                    ))}
                </div>
            </div>

            {/* Settings + FX */}
            <div className="grid gap-6 md:grid-cols-2">
                <FinanceSettingsForm
                    initial={{
                        default_currency: (settings as { default_currency: string } | null)?.default_currency ?? 'EUR',
                        expense_approval_threshold: (settings as { expense_approval_threshold: number | null } | null)?.expense_approval_threshold ?? null,
                    }}
                />
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {t('rates_title')}
                        </h3>
                        <FxRateForm />
                    </div>
                    <div className="rounded-lg border bg-card p-4 text-sm">
                        {(!rates || rates.length === 0) ? (
                            <p className="text-muted-foreground">{t('missing_rates_msg')} —</p>
                        ) : (
                            rates.map((r) => (
                                <div key={r.id} className="flex justify-between border-b py-1 last:border-0">
                                    <span>
                                        {(r.from_currency as string)} → {(r.to_currency as string)}
                                        <span className="text-muted-foreground"> ({(r.rate_date as string)})</span>
                                    </span>
                                    <span className="font-mono font-bold">{Number(r.rate)}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
