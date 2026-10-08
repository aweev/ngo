import { getTranslations } from 'next-intl/server';
import { ClipboardList, HandHeart, HelpCircle, RefreshCw, UserPlus } from 'lucide-react';
import { Link } from '@/lib/navigation';
import { getBeneficiaries } from '@/actions/beneficiaries';
import { getReferrals, getServices } from '@/actions/services';

/**
 * Field home: exactly five destinations (Phase 1 role IA). Server-rendered
 * counts when online; the cards themselves are cached for offline revisits.
 */
export const dynamic = 'force-dynamic';

const CARDS = [
    { href: '/field/register', key: 'record_visit' as const, desc: 'record_visit_desc' as const, Icon: UserPlus },
    { href: '/field/beneficiaries', key: 'people' as const, desc: 'people_desc' as const, Icon: HandHeart },
    { href: '/field/sync', key: 'sync' as const, desc: 'sync_desc' as const, Icon: RefreshCw },
    { href: '/field/help', key: 'help' as const, desc: 'help_desc' as const, Icon: HelpCircle },
];

export default async function FieldHomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Field' });
    const [{ data: beneficiaries }, { data: services }, { data: referrals }] = await Promise.all([
        getBeneficiaries({ limit: 1 }),
        getServices(undefined, 1),
        getReferrals('open', 1),
    ]);

    return (
        <div className="space-y-4">
            <div>
                <h1 className="text-xl font-bold">{t('home_title')}</h1>
                <p className="text-sm text-muted-foreground">{t('home_desc')}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {CARDS.map(({ href, key, desc, Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className="flex min-h-28 flex-col justify-between rounded-2xl border bg-card p-4 active:bg-muted"
                    >
                        <Icon className="h-7 w-7 text-primary" aria-hidden="true" />
                        <div>
                            <div className="font-bold">{t(key)}</div>
                            <div className="text-xs text-muted-foreground">{t(desc)}</div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl border bg-card p-3">
                    <div className="text-2xl font-bold">{beneficiaries?.length ?? '–'}</div>
                    <div className="text-xs text-muted-foreground">{t('people')}</div>
                </div>
                <div className="rounded-2xl border bg-card p-3">
                    <div className="text-2xl font-bold">{services?.length ?? '–'}</div>
                    <div className="text-xs text-muted-foreground">{t('services_today')}</div>
                </div>
                <div className="rounded-2xl border bg-card p-3">
                    <div className="text-2xl font-bold">{referrals?.length ?? '–'}</div>
                    <div className="text-xs text-muted-foreground">{t('referrals_open')}</div>
                </div>
            </div>

            <Link
                href="/field/beneficiaries"
                className="flex min-h-14 items-center justify-center gap-2 rounded-2xl bg-primary font-bold text-primary-foreground"
            >
                <ClipboardList className="h-5 w-5" aria-hidden="true" />
                {t('log_service')}
            </Link>
        </div>
    );
}
