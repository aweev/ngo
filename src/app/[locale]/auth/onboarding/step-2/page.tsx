import { auth } from "@/auth";
import { getPublicPortalExperience } from "@/actions/portal-experience";
import { OnboardingFlow } from "@/components/auth/onboarding-flow";

export default async function OnboardingStepTwoPage({ params }: { params: Promise<{ locale: string }> }) {
    const session = await auth();
    const { locale } = await params;
    const { data: portalItems } = await getPublicPortalExperience(locale);
    return <OnboardingFlow step={2} displayName={session?.user.name} options={portalItems} />;
}