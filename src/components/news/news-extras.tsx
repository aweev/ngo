"use client";

import { useTranslations } from "next-intl";
import { Download, Mail, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function NewsSubscribe() {
    const t = useTranslations("News.Subscribe");

    return (
        <section className="w-full bg-brand-hopeful-clay py-16 text-white my-16">
            <div className="container mx-auto px-4 text-center max-w-xl">
                <h3 className="text-2xl font-serif font-bold mb-6">{t("title")}</h3>
                <div className="flex gap-2 max-w-sm mx-auto mb-4">
                    <Input
                        placeholder={t("placeholder")}
                        className="bg-white/10 border-white/20 text-white placeholder:text-white/60 focus-visible:ring-white"
                    />
                    <Button variant="secondary" className="font-bold">
                        {t("button")}
                    </Button>
                </div>
                <p className="text-xs text-white/70">{t("privacy")}</p>
            </div>
        </section>
    );
}

export function MediaKit() {
    const t = useTranslations("News.MediaKit");

    return (
        <section className="bg-muted/30 py-12 border-t border-border">
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8">
                <div>
                    <h3 className="text-xl font-bold mb-1">{t("title")}</h3>
                    <p className="text-muted-foreground text-sm">{t("subtitle")}</p>
                </div>
                <div className="flex flex-wrap gap-4">
                    <Button variant="outline" size="sm" className="gap-2 bg-background">
                        <Download className="w-4 h-4" /> {t("assets")}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-background">
                        <Users className="w-4 h-4" /> {t("bios")}
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2 bg-background">
                        <Mail className="w-4 h-4" /> {t("contact")}
                    </Button>
                </div>
            </div>
        </section>
    );
}