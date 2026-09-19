"use client";

import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { Facebook, Instagram, Linkedin, Twitter } from "lucide-react";
import { FooterLogo } from "@/components/common/brand-logo";
import { ImpactTicker } from "@/components/landing/impact-ticker";

export function PublicFooter() {
    const t = useTranslations("Footer");

    return (
        <footer className="bg-muted/30 border-t border-border">
            <ImpactTicker />

            {/* FIX: Added mx-auto here */}
            <div className="container mx-auto px-4 py-16 md:px-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8">

                    {/* Column 1: Brand & Tagline */}
                    <div className="lg:col-span-4 space-y-6">
                        <FooterLogo />
                        <p className="text-muted-foreground leading-relaxed max-w-xs">
                            {t("tagline")}
                        </p>
                        <div className="flex gap-4">
                            {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                                <Link key={i} href="#" className="p-2 rounded-full bg-background border border-border hover:border-primary/50 hover:text-primary transition-all">
                                    <Icon className="w-4 h-4" />
                                </Link>
                            ))}
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="font-serif font-bold text-lg">{t("about.title")}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/public/about" className="hover:text-primary transition-colors">{t("about.story")}</Link></li>
                            <li><Link href="/public/about/team" className="hover:text-primary transition-colors">{t("about.team")}</Link></li>
                            <li><Link href="/public/about/financials" className="hover:text-primary transition-colors">{t("about.financials")}</Link></li>
                        </ul>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        <h4 className="font-serif font-bold text-lg">{t("programs.title")}</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            <li><Link href="/public/programs/economic-empowerment" className="hover:text-primary transition-colors">{t("programs.economic")}</Link></li>
                            <li><Link href="/public/programs/education" className="hover:text-primary transition-colors">{t("programs.education")}</Link></li>
                            <li><Link href="/public/programs/health" className="hover:text-primary transition-colors">{t("programs.health")}</Link></li>
                            <li><Link href="/public/programs/social-integration" className="hover:text-primary transition-colors">{t("programs.social")}</Link></li>
                        </ul>
                    </div>

                    {/* Newsletter */}
                    <div className="lg:col-span-4 space-y-4">
                        <h4 className="font-serif font-bold text-lg">{t("newsletter.title")}</h4>
                        <p className="text-sm text-muted-foreground">{t("newsletter.description")}</p>
                        <form className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
                            <input
                                type="email"
                                placeholder={t("newsletter.placeholder")}
                                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background focus:outline-none focus:ring-2 focus:ring-primary/20"
                            />
                            <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors">
                                {t("newsletter.subscribe")}
                            </button>
                        </form>
                    </div>
                </div>

                <div className="mt-16 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex gap-6">
                        <Link href="/legal/privacy" className="hover:text-foreground">{t("legal.privacy")}</Link>
                        <Link href="/legal/terms" className="hover:text-foreground">{t("legal.terms")}</Link>
                        <Link href="/legal/imprint" className="hover:text-foreground">{t("legal.imprint")}</Link>
                    </div>
                    <p>© {new Date().getFullYear()} AWE e.V. {t("madeWith")} ❤️ {t("inBerlin")}</p>
                </div>
            </div>
        </footer>
    );
}