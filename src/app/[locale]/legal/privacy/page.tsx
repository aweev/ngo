import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShieldCheck, Lock, Eye, Cookie } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Legal.Privacy" });
    return { title: t("title") };
}

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Legal.Privacy" });

    return (
        <article>
            {/* Header */}
            <header className="mb-12 border-b border-border pb-12">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider mb-6">
                    <ShieldCheck className="w-3 h-3" /> GDPR Compliant
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-6">{t("title")}</h1>
                <p className="text-xl text-muted-foreground leading-relaxed max-w-2xl">{t("intro")}</p>
            </header>

            <div className="space-y-12">

                {/* Section 1 */}
                <section className="group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Eye className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">{t("section_1_title")}</h2>
                    </div>
                    <div className="pl-13 md:pl-14 prose prose-slate dark:prose-invert max-w-none text-muted-foreground">
                        <p>{t("section_1_text")}</p>
                    </div>
                </section>

                {/* Section 2 */}
                <section className="group">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/20 flex items-center justify-center text-amber-600">
                            <Cookie className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">{t("section_2_title")}</h2>
                    </div>
                    <div className="pl-13 md:pl-14 prose prose-slate dark:prose-invert max-w-none text-muted-foreground">
                        <p>{t("section_2_text")}</p>
                    </div>
                </section>

                {/* Section 3 (Rights List) */}
                <section className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center text-blue-600">
                            <Lock className="w-5 h-5" />
                        </div>
                        <h2 className="text-2xl font-serif font-bold text-foreground">{t("section_3_title")}</h2>
                    </div>
                    <p className="mb-6 text-muted-foreground">{t("section_3_text")}</p>
                    <ul className="grid sm:grid-cols-2 gap-4">
                        {['access', 'rectification', 'erasure'].map((right) => (
                            <li key={right} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50">
                                <div className="w-2 h-2 rounded-full bg-primary" />
                                <span className="font-medium text-foreground">{t(`rights_list.${right}`)}</span>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Contact Footer */}
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                        <h3 className="font-bold text-foreground text-lg mb-1">{t("section_4_title")}</h3>
                        <p className="text-sm text-muted-foreground">For any privacy-related concerns.</p>
                    </div>
                    <a
                        href="mailto:privacy@awe-ev.org"
                        className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-full hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20"
                    >
                        privacy@awe-ev.org
                    </a>
                </div>

            </div>
        </article>
    );
}