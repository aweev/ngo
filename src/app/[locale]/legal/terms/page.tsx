import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ScrollText } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Legal.Terms" });
    return { title: t("title") };
}

export default async function TermsPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Legal.Terms" });

    return (
        <article>
            <header className="mb-16 text-center">
                <div className="w-16 h-16 bg-muted mx-auto rounded-2xl flex items-center justify-center mb-6 text-foreground">
                    <ScrollText className="w-8 h-8" />
                </div>
                <h1 className="text-4xl md:text-5xl font-serif font-bold text-foreground mb-4">{t("title")}</h1>
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                    {t("last_updated")}
                </p>
            </header>

            {/* Content Container with Left Border Line */}
            <div className="relative border-l-2 border-border/50 ml-4 md:ml-8 pl-8 md:pl-12 space-y-16 py-4">

                {[1, 2, 3, 4].map((num) => (
                    <section key={num} className="relative">
                        {/* Number Badge */}
                        <div className="absolute -left-[43px] md:-left-[59px] top-0 w-8 h-8 md:w-10 md:h-10 rounded-full bg-background border-2 border-border flex items-center justify-center font-bold font-serif text-muted-foreground shadow-sm">
                            {num}
                        </div>

                        <h2 className="text-2xl font-serif font-bold text-foreground mb-4">
                            {t(`section_${num}_title`)}
                        </h2>
                        <div className="prose prose-slate dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
                            <p>{t(`section_${num}_text`)}</p>
                        </div>
                    </section>
                ))}

            </div>

            {/* Acceptance Footer */}
            <div className="mt-20 p-6 bg-muted/30 rounded-xl text-center text-sm text-muted-foreground border border-border">
                <p>{t("acceptance_footer")}</p>
            </div>
        </article>
    );
}