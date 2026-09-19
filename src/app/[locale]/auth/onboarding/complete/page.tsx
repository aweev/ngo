"use client";

import { CheckCircle2, LayoutDashboard, RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/lib/navigation";
import { Button } from "@/components/ui/button";
import { useOnboardingStore } from "@/store/use-onboarding-store";

export default function OnboardingCompletePage() {
    const t = useTranslations("Auth.Onboarding");
    const router = useRouter();
    const reset = useOnboardingStore((state) => state.reset);

    return (
        <div className="space-y-7 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary"><CheckCircle2 className="h-9 w-9" /></div>
            <div className="space-y-3"><h1 className="font-serif text-3xl font-bold text-foreground">{t("complete_title")}</h1><p className="text-muted-foreground">{t("complete_subtitle")}</p></div>
            <div className="grid gap-3">
                <Button size="lg" onClick={() => router.push("/dashboard")}><LayoutDashboard />{t("dashboard")}</Button>
                <Button variant="ghost" onClick={() => { reset(); router.push("/auth/onboarding/welcome"); }}><RotateCcw />{t("start_over")}</Button>
            </div>
        </div>
    );
}