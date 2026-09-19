import { ReactNode } from "react";
import { setRequestLocale } from "next-intl/server";
import { PublicHeader } from "@/components/layout/public/public-header";
import { PublicFooter } from "@/components/layout/public/public-footer";

interface PublicLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

export default async function PublicLayout({
    children,
    params,
}: PublicLayoutProps) {
    // Enable static rendering for the whole public subtree: every child page
    // receives its locale from the parent's generateStaticParams.
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <div className="flex min-h-screen flex-col">
            {/* Header - Sticky behavior is internal to the component */}
            <PublicHeader />

            {/* Main Content - Flex-1 pushes footer down on short pages */}
            <main className="flex-1">
                {children}
            </main>

            {/* Footer */}
            <PublicFooter />
        </div>
    );
}