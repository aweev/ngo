import { auth } from "@/auth";
import { getPublicPortalExperience } from "@/actions/portal-experience";
import { StepOne } from "@/app/[locale]/auth/onboarding/step-1";

export default async function OnboardingStepOnePage({ params }: { params: Promise<{ locale: string }> }) {
    const session = await auth();
    const { locale } = await params;
    const { data: portalItems } = await getPublicPortalExperience(locale);
    return <StepOne displayName={session?.user.name} options={portalItems} />;
}