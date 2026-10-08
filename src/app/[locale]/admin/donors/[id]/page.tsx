import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/manage/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GrantDonorLinkForm } from '@/components/admin/grant-donor-link-form';
import { getDonor } from '@/actions/donors';
import { getDonations } from '@/actions/donations';
import { getGrants } from '@/actions/trust';
import { ArrowLeft } from 'lucide-react';
import { Link } from '@/lib/navigation';

export const dynamic = 'force-dynamic';

/**
 * Donor 360°: commitments (donations), linked institutional grants, and
 * reporting deadlines from grant terms. Totals group by currency — amounts
 * in different currencies are never summed into one fiction.
 */
export default async function AdminDonorDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { locale, id } = await params;
    const t = await getTranslations({ locale, namespace: 'Admin.Donors.detail' });
    const [{ data: donor }, { data: donations }, { data: grants }] = await Promise.all([
        getDonor(id),
        getDonations(),
        getGrants(),
    ]);
    if (!donor) notFound();

    const donorDonations = (donations ?? []).filter((d) => d.donor_id === id);
    const linkedGrants = ((grants ?? []) as Array<Record<string, unknown>>).filter(
        (g) => g.donor_id === id,
    );
    const grantOptions = ((grants ?? []) as Array<Record<string, unknown>>).map((g) => ({
        id: g.id as string,
        title: (g.title as string) ?? '',
        grant_reference: (g.grant_reference as string | null) ?? null,
        donor_id: (g.donor_id as string | null) ?? null,
    }));

    const totalsByCurrency = new Map<string, number>();
    for (const d of donorDonations) {
        if (d.status !== 'completed') continue;
        totalsByCurrency.set(d.currency, (totalsByCurrency.get(d.currency) ?? 0) + Number(d.amount));
    }

    // eslint-disable-next-line react-hooks/purity -- server component, force-dynamic: evaluated fresh per request.
    const now = Date.now();
    const deadlines: Array<{ grant: string; label: string; raw: string; overdue: boolean }> = [];
    for (const g of linkedGrants) {
        const reqs = (g.reporting_requirements ?? {}) as Record<string, unknown>;
        for (const [label, raw] of Object.entries(reqs)) {
            if (typeof raw !== 'string') continue;
            const parsed = Date.parse(raw);
            if (Number.isNaN(parsed)) continue;
            deadlines.push({
                grant: (g.title as string) ?? '',
                label,
                raw,
                overdue: parsed < now && (g.status as string) !== 'completed' && (g.status as string) !== 'closed',
            });
        }
    }
    deadlines.sort((a, b) => Date.parse(a.raw) - Date.parse(b.raw));

    const money = (amount: number, currency: string) =>
        amount.toLocaleString(locale, { style: 'currency', currency });

    return (
        <div className="space-y-6">
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
                <Link href="/admin/donors">
                    <ArrowLeft className="h-4 w-4" /> {t('back')}
                </Link>
            </Button>
            <PageHeader
                title={donor.name}
                description={`${donor.type} — ${donor.status}`}
            />

            {/* Totals per currency */}
            <div className="grid gap-3 sm:grid-cols-3">
                {[...totalsByCurrency.entries()].map(([cur, total]) => (
                    <div key={cur} className="rounded-lg border bg-card p-4">
                        <div className="text-2xl font-bold">{money(total, cur)}</div>
                        <div className="text-xs text-muted-foreground">{t('total_given')} ({cur})</div>
                    </div>
                ))}
                {totalsByCurrency.size === 0 && (
                    <div className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                        {t('donations_empty')}
                    </div>
                )}
            </div>

            {/* Commitments */}
            <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('commitments')} ({donorDonations.length})
                </h2>
                <div className="rounded-lg border bg-card p-4">
                    {donorDonations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('donations_empty')}</p>
                    ) : (
                        donorDonations.slice(0, 30).map((d) => (
                            <div key={d.id} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                                <span>
                                    {money(Number(d.amount), d.currency)}
                                    <span className="text-muted-foreground">
                                        {' — '}{new Date(d.donated_at).toLocaleDateString(locale)}
                                    </span>
                                </span>
                                <Badge variant={d.status === 'completed' ? 'default' : 'outline'} className="text-[10px] capitalize">
                                    {d.status}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>
            </section>

            {/* Linked grants */}
            <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('linked_grants')} ({linkedGrants.length})
                </h2>
                <div className="rounded-lg border bg-card p-4">
                    {linkedGrants.length === 0 && <p className="text-sm text-muted-foreground">{t('grants_empty')}</p>}
                    <GrantDonorLinkForm donorId={id} grants={grantOptions} />
                </div>
            </section>

            {/* Deadlines */}
            <section className="space-y-2">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    {t('deadlines')} ({deadlines.length})
                </h2>
                <div className="rounded-lg border bg-card p-4">
                    {deadlines.length === 0 ? (
                        <p className="text-sm text-muted-foreground">{t('no_deadlines')}</p>
                    ) : (
                        deadlines.map((dl, i) => (
                            <div key={`${dl.grant}-${dl.label}-${i}`} className="flex items-center justify-between border-b py-2 text-sm last:border-0">
                                <span>
                                    <span className="font-medium">{dl.grant}</span>
                                    <span className="text-muted-foreground"> — {dl.label}: {dl.raw}</span>
                                </span>
                                <Badge variant={dl.overdue ? 'destructive' : 'outline'} className="text-[10px]">
                                    {dl.overdue ? t('overdue') : t('upcoming')}
                                </Badge>
                            </div>
                        ))
                    )}
                </div>
            </section>
        </div>
    );
}
