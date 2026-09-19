import { ReactNode } from "react";
import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { AuthTestimonialSlider } from "@/components/auth/testimonial-slider";
import { AuthLiveStats } from "@/components/auth/live-stats";
import { BrandLogo } from "@/components/common/brand-logo";
import { Link } from "@/lib/navigation";
import { getPublicPortalExperience } from "@/actions/portal-experience";

interface AuthLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function AuthLayout({ children, params }: AuthLayoutProps) {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auth.Layout" });
    const { data: portalItems } = await getPublicPortalExperience(locale);
    const testimonials = portalItems.filter((item) => item.kind === "auth_testimonial") as Array<typeof portalItems[number] & { author?: string }>;
    const stats = portalItems.filter((item) => item.kind === "auth_stat");
    const currentYear = new Date().getFullYear();

    return (
        <div className="flex min-h-screen w-full bg-background">

            {/* LEFT COLUMN: Visual / Emotional Trigger (Hidden on Mobile) */}
            <div className="hidden lg:flex w-1/2 relative bg-slate-900 text-white flex-col justify-between overflow-hidden">

                {/* Background Image/Video Loop */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2000&auto=format&fit=crop"
                        alt={t("alt_impact")}
                        fill
                        className="object-cover opacity-60 mix-blend-overlay"
                        priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/30" />
                </div>

                {/* Top Brand */}
                <div className="relative z-10 p-12">
                    <BrandLogo variant="hero" size="lg" asLink={false} showText={true} />
                </div>

                {/* Center Content: Testimonials */}
                <div className="relative z-10 px-12 max-w-2xl">
                    <AuthTestimonialSlider items={testimonials} />
                </div>

                {/* Bottom Stats Strip */}
                <div className="relative z-10 w-full bg-white/5 backdrop-blur-md border-t border-white/10">
                    <AuthLiveStats items={stats} />
                </div>
            </div>

            {/* RIGHT COLUMN: Functional Gateway */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 md:p-12 relative">

                {/* Mobile Brand Header */}
                <div className="lg:hidden absolute top-6 left-6">
                    <BrandLogo variant="default" size="sm" />
                </div>

                {/* The Form Container */}
                <div className="w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>

                {/* Footer Legal */}
                <div className="absolute bottom-6 text-center w-full text-xs text-muted-foreground">
                    <div className="flex justify-center gap-4 mb-2">
                        <Link href="/legal/privacy" className="hover:text-primary transition-colors">
                            {t("privacy")}
                        </Link>
                        <Link href="/legal/terms" className="hover:text-primary transition-colors">
                            {t("terms")}
                        </Link>
                        <Link href="/public/contact" className="hover:text-primary transition-colors">
                            {t("help")}
                        </Link>
                    </div>
                    <p>{t("copyright", { year: currentYear })}</p>
                </div>
            </div>

        </div>
    );
}