'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const t = useTranslations("Admin.Error");

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
            <div className="max-w-md space-y-5 rounded-xl border bg-card p-8 text-center">
                <AlertTriangle className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
                <h1 className="text-xl font-semibold">{t("dashboard_title")}</h1>
                <p className="text-sm text-muted-foreground">
                    {t("dashboard_description")}
                </p>
                <Button type="button" onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t("try_again")}
                </Button>
            </div>
        </div>
    );
}
