import { getPublicPortalExperience } from "@/actions/portal-experience";
import { OnboardingWelcomeContent } from "@/app/[locale]/auth/onboarding/welcome/content";

export default async function OnboardingWelcomePage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const { data: portalItems = [] } = await getPublicPortalExperience(locale);
    return <OnboardingWelcomeContent roleOptions={portalItems.filter((item) => item.kind === "onboarding_option" && item.metadata.group === "role")} />;
}