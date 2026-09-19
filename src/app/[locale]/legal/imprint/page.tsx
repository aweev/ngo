import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Mail, MapPin, Building2, FileText, Scale } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Legal.Imprint" });
    return { title: t("title") };
}

export default async function ImprintPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Legal.Imprint" });

    return (
        <>
            <header className="mb-12">
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">{t("title")}</h1>
                <p className="text-muted-foreground text-lg">{t("operator")}</p>
            </header>

            <div className="space-y-8">
                {/* Card 1: Address & Contact */}
                <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-sm">
                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-foreground mb-4">
                                <MapPin className="w-4 h-4 text-primary" /> Address
                            </h3>
                            <address className="not-italic text-muted-foreground leading-relaxed">
                                <strong className="text-foreground block mb-1">{t("address_1")}</strong>
                                {t("address_2")}<br />
                                {t("address_3")}<br />
                                {t("address_4")}
                            </address>
                        </div>
                        <div>
                            <h3 className="flex items-center gap-2 font-bold text-foreground mb-4">
                                <Mail className="w-4 h-4 text-primary" /> {t("contact")}
                            </h3>
                            <ul className="space-y-3 text-muted-foreground">
                                <li className="flex items-center gap-3">
                                    <span className="w-16 text-xs font-bold uppercase tracking-wider opacity-70">{t("phone_label")}</span>
                                    <span>+49 (0) 30 12345678</span>
                                </li>
                                <li className="flex items-center gap-3">
                                    <span className="w-16 text-xs font-bold uppercase tracking-wider opacity-70">{t("email_label")}</span>
                                    <a href="mailto:info@awe-ev.org" className="text-primary hover:underline">info@awe-ev.org</a>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Card 2: Legal Details */}
                <div className="bg-card border border-border/60 rounded-2xl p-8 shadow-sm">
                    <div className="grid gap-6">
                        <div className="grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-baseline border-b border-border/50 pb-4">
                            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Building2 className="w-3 h-3" /> {t("registration")}
                            </h4>
                            <p className="text-foreground">
                                {t("reg_court")}<br />
                                <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">{t("reg_number")}</span>
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-baseline border-b border-border/50 pb-4">
                            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <Scale className="w-3 h-3" /> {t("represented_by")}
                            </h4>
                            <p className="text-foreground font-medium">
                                {t("board_members")}
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-[180px_1fr] gap-2 sm:gap-4 items-baseline">
                            <h4 className="font-bold text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                <FileText className="w-3 h-3" /> {t("tax_id")}
                            </h4>
                            <p className="text-foreground">
                                {t("vat_id")}: <span className="font-mono text-sm">DE 123 456 789</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Card 3: Disclaimer */}
                <div className="bg-muted/30 border border-border rounded-2xl p-8">
                    <h3 className="font-serif font-bold text-lg mb-2">{t("disclaimer_title")}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {t("disclaimer_text")}
                    </p>
                </div>
            </div>
        </>
    );
}