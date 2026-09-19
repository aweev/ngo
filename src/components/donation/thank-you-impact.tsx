'use client';

import { useTranslations } from 'next-intl';
import { GraduationCap, Droplets, Wrench, Tablet } from 'lucide-react';

/**
 * "Where your gift goes" rail shown on the donation confirmation page.
 * Copy is shared with the donation widget so the promises made before the
 * payment match the ones repeated after it.
 */
export function DonationImpactRail() {
    const t = useTranslations('Donation.Widget');

    const items = [
        { icon: GraduationCap, label: t('impact_25') },
        { icon: Droplets, label: t('impact_50') },
        { icon: Wrench, label: t('impact_100') },
        { icon: Tablet, label: t('impact_250') },
    ];

    return (
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
            {items.map(({ icon: Icon, label }) => (
                <div
                    key={label}
                    className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 text-sm text-foreground"
                >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-medium">{label}</span>
                </div>
            ))}
        </div>
    );
}