"use client";

import { Button } from "@/components/ui/button";
import { Link } from "@/lib/navigation";
import { useTranslations } from "next-intl";
import { RefreshCw, Home, AlertCircle } from "lucide-react";

export default function PublicError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const t = useTranslations("Error");

    return (
        <div className="flex min-h-[60dvh] items-center justify-center px-4 pt-28">
            <div className="text-center space-y-6 max-w-md">
                <AlertCircle className="h-16 w-16 text-destructive/50 mx-auto" />
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-foreground">{t("title")}</h1>
                    <p className="text-muted-foreground">{t("description")}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button onClick={reset} className="gap-2" size="lg">
                        <RefreshCw className="h-4 w-4" />
                        {t("retry")}
                    </Button>
                    <Button asChild variant="outline" size="lg" className="gap-2">
                        <Link href="/public">
                            <Home className="h-4 w-4" />
                            {t("home")}
                        </Link>
                    </Button>
                </div>
                {error.digest && (
                    <p className="text-xs text-muted-foreground font-mono">
                        {t("error_id")}: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}