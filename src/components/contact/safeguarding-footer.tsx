"use client";

import { useTranslations } from "next-intl";
import { ShieldAlert } from "lucide-react";
import { Link } from "@/lib/navigation";

export function SafeguardingFooter() {
    const t = useTranslations("Contact.Safeguarding");

    return (
        <section className="py-12 text-center">
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                <span>
                    {t("text")} <Link href="/public/contact/report" className="underline font-medium hover:text-foreground">{t("link")}</Link>
                </span>
            </div>
        </section>
    );
}