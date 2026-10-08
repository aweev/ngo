import { getTranslations } from 'next-intl/server';
import { getBeneficiaries } from '@/actions/beneficiaries';
import { BeneficiarySearch } from '@/components/field/beneficiary-search';

export const dynamic = 'force-dynamic';

export default async function FieldBeneficiariesPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'Field' });
    const { data } = await getBeneficiaries({ limit: 25 });

    return (
        <div className="space-y-4">
            <h1 className="text-xl font-bold">{t('search_title')}</h1>
            <BeneficiarySearch initial={data ?? []} />
        </div>
    );
}
