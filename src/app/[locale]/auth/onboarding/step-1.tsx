"use client";

import { OnboardingFlow } from "@/components/auth/onboarding-flow";
import type { PortalExperienceItem } from "@/types/domain/portal-experience";

export function StepOne({ displayName, options }: { displayName?: string | null; options?: PortalExperienceItem[] }) {
    return <OnboardingFlow step={1} displayName={displayName} options={options} />;
}