import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SecureReportForm } from "@/components/contact/secure-report-form";
import { ShieldCheck, AlertTriangle, PhoneCall } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Safeguarding.Hero" });
    return {
        title: t("title"),
        description: t("subtitle")
    };
}

export default async function ReportPage({ params }: { params: Promise<{ locale: string }> }) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Safeguarding" });

    return (
        <main className="bg-slate-50 dark:bg-background min-h-screen pt-32 pb-24 transition-colors duration-300">
            <div className="container mx-auto px-4 max-w-4xl">

                {/* Header */}
                <div className="text-center mb-12 space-y-4">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-muted border border-slate-200 dark:border-border text-slate-700 dark:text-muted-foreground text-xs font-bold uppercase tracking-widest shadow-sm">
                        <ShieldCheck className="w-3 h-3" />
                        {t("Hero.badge")}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-slate-900 dark:text-foreground">
                        {t("Hero.title")}
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-muted-foreground max-w-2xl mx-auto">
                        {t("Hero.subtitle")}
                    </p>
                </div>

                {/* Main Content Area */}
                <div className="grid lg:grid-cols-12 gap-8 items-start">

                    {/* Left: Context/Policy */}
                    <div className="lg:col-span-4 space-y-6 order-2 lg:order-1">

                        {/* Info Card */}
                        <div className="bg-white dark:bg-card p-6 rounded-xl border border-slate-200 dark:border-border shadow-sm">
                            <h3 className="font-bold text-slate-900 dark:text-card-foreground flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5 text-amber-500" />
                                {t("Notice.title")}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-muted-foreground leading-relaxed mb-4">
                                {t("Notice.text")}
                            </p>

                            {/* Warning Box */}
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-lg">
                                <p className="text-xs font-medium text-amber-800 dark:text-amber-200/90">
                                    {t("Notice.non_retaliation")}
                                </p>
                            </div>
                        </div>

                        {/* Emergency Contact */}
                        <div className="p-4 rounded-lg border border-dashed border-slate-300 dark:border-slate-700">
                            <p className="text-xs text-slate-500 dark:text-slate-400 text-center flex flex-col items-center gap-2">
                                <PhoneCall className="w-4 h-4 opacity-50" />
                                {t("Notice.emergency")}
                            </p>
                        </div>
                    </div>

                    {/* Right: The Form (8 Cols) */}
                    <div className="lg:col-span-8 order-1 lg:order-2">
                        <SecureReportForm />
                    </div>

                </div>

            </div>
        </main>
    );
}