"use client";

import { ArrowRight, HeartHandshake, HandHeart, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/store/use-onboarding-store";
import type { PortalExperienceItem } from "@/types/domain/portal-experience";

const fallbackRoles = [
    {
        item_key: "volunteer",
        label: "Volunteer",
        description: "Offer time, skills, and energy to create local impact.",
        icon: "volunteer",
    },
    {
        item_key: "donor",
        label: "Donor",
        description: "Fund projects and help shape where support goes.",
        icon: "donor",
    },
] as const;

const iconMap = {
    volunteer: Users,
    donor: HandHeart,
};

export function OnboardingWelcomeContent({ roleOptions = [] }: { roleOptions?: PortalExperienceItem[] }) {
    const t = useTranslations("Auth.Onboarding");
    const router = useRouter();
    const setRole = useOnboardingStore((state) => state.setRole);

    const configuredRoles = roleOptions.length > 0
        ? roleOptions.map((item) => ({
            item_key: item.item_key === "role_volunteer" ? "volunteer" : item.item_key === "role_donor" ? "donor" : item.item_key,
            label: item.label || item.item_key,
            description: item.description || (item.item_key.includes("donor") ? t("donor_description") : t("volunteer_description")),
            icon: item.icon === "heart" ? "donor" : "volunteer",
          }))
        : fallbackRoles.map((option) => ({ ...option, icon: option.icon as "volunteer" | "donor" }));

    const chooseRole = (role: "volunteer" | "donor") => {
        setRole(role);
        router.push("/auth/onboarding/step-1");
    };

    return (
        <div className="space-y-8">
            <div className="space-y-3 text-center md:text-left">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
                    <HeartHandshake className="h-3.5 w-3.5" />
                    {t("badge")}
                </div>
                <h1 className="font-serif text-3xl font-bold text-foreground md:text-4xl">{t("title")}</h1>
                <p className="text-muted-foreground">{t("subtitle")}</p>
            </div>

            <div className="grid gap-4">
                {configuredRoles.map((option) => {
                    const Icon = iconMap[option.icon as keyof typeof iconMap] ?? Users;
                    const roleKey = option.item_key === "volunteer" || option.item_key === "donor" ? option.item_key : "volunteer";

                    return (
                        <button
                            key={option.item_key}
                            type="button"
                            onClick={() => chooseRole(roleKey as "volunteer" | "donor")}
                            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                                <Icon className="h-6 w-6" />
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block font-semibold text-foreground">{option.label}</span>
                                <span className="mt-1 block text-sm text-muted-foreground">{option.description}</span>
                            </span>
                            <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </button>
                    );
                })}
            </div>

            <div className="text-center text-sm text-muted-foreground">
                <span>{t("already_started")} </span>
                <Button variant="link" className="h-auto p-0 font-semibold" onClick={() => router.push("/auth/login")}>
                    {t("back_to_login")}
                </Button>
            </div>
        </div>
    );
}
