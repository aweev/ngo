import { Link } from "@/lib/navigation";
import { ArrowLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";

export default async function LegalLayout({
    children,
    params
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    // Await params to get locale
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Navigation" });

    return (
        <main className="min-h-screen bg-background relative pt-32 pb-24">
            {/* Subtle Texture Background */}
            <div className="absolute inset-0 bg-texture-paper opacity-30 pointer-events-none fixed" />

            <div className="container mx-auto px-4 max-w-3xl relative z-10">
                {/* Elegant Back Navigation */}
                <div className="mb-12">
                    <Link
                        href="/"
                        className="group inline-flex items-center text-sm font-bold text-muted-foreground hover:text-primary transition-colors"
                    >
                        <div className="w-8 h-8 rounded-full border border-border bg-background flex items-center justify-center mr-3 group-hover:border-primary/50 transition-colors">
                            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                        </div>
                        {t("back_home")}
                    </Link>
                </div>

                {/* The Page Content renders here */}
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </div>
        </main>
    );
}