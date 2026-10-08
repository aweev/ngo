import { getTranslations } from 'next-intl/server';

export const dynamic = 'force-dynamic';

export default async function FieldHelpPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Field' });

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold">{t('help_title')}</h1>
            <div className="space-y-3">
                {[t('help_1'), t('help_2'), t('help_3')].map((line) => (
                    <p key={line} className="rounded-2xl border bg-card p-4 text-sm leading-relaxed">
                        {line}
                    </p>
                ))}
            </div>
        </div>
    );
}
