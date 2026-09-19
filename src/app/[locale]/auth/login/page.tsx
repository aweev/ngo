import { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { getTranslations } from "next-intl/server";
import { Loader2 } from "lucide-react";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "Auth.Login" });
    return {
        title: t("title"),
        description: t("subtitle")
    };
}

export default function LoginPage() {
    return (
        <Suspense
            fallback={
                <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                </div>
            }
        >
            <LoginForm />
        </Suspense>
    );
}