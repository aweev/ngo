"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { Home, Search, ArrowLeft } from "lucide-react";

export default function PublicNotFound() {
    const t = useTranslations("NotFound");

    return (
        <div className="flex min-h-[60dvh] items-center justify-center px-4 pt-28">
            <div className="text-center space-y-6 max-w-md">
                <div className="text-9xl font-bold text-muted/20">404</div>
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("description")}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild size="lg" className="gap-2">
                        <Link href="/public">
                            <Home className="h-4 w-4" />
                            {t("home")}
                        </Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="gap-2">
                        <Link href="/public/about">
                            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
                            {t("about")}
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}