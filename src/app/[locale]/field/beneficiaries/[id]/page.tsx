import { notFound } from 'next/navigation';
import { getBeneficiary } from '@/actions/beneficiaries';
import { getReferrals, getServices } from '@/actions/services';
import { BeneficiaryDetail } from '@/components/field/beneficiary-detail';

export const dynamic = 'force-dynamic';

export default async function FieldBeneficiaryDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
    const { id } = await params;
    const [{ data: beneficiary }, { data: services }, { data: referrals }] = await Promise.all([
        getBeneficiary(id),
        getServices(id, 50),
        getReferrals(undefined, 50, id),
    ]);
    if (!beneficiary) notFound();

    return (
        <BeneficiaryDetail beneficiary={beneficiary} services={services ?? []} referrals={referrals ?? []} />
    );
}
