import { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ContactHero } from "@/components/contact/contact-hero";
import { DirectChannels } from "@/components/contact/direct-channels";
import { SmartContactForm } from "@/components/contact/smart-form";
import { FAQAndMap } from "@/components/contact/faq-map";
import { SafeguardingFooter } from "@/components/contact/safeguarding-footer";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Contact.Hero" });
    return {
        title: t("headline"),
        description: t("subheadline")
    };
}

export default async function ContactPage({ params }: { params: Promise<{ locale: string }> }) {
    await params;

    return (
        <main className="bg-background min-h-screen">
            <ContactHero />
            <DirectChannels />

            <div className="container mx-auto px-4 py-24">
                <div className="grid lg:grid-cols-12 gap-12 lg:gap-24">
                    {/* Left: Form (7 Cols) */}
                    <div className="lg:col-span-7">
                        <SmartContactForm />
                    </div>

                    {/* Right: Context (5 Cols) */}
                    <aside className="lg:col-span-5">
                        <FAQAndMap />
                    </aside>
                </div>
            </div>

            <SafeguardingFooter />
        </main>
    );
}