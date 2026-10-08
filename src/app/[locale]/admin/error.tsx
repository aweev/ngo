'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    const t = useTranslations("Admin.Error");

    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
            <div className="max-w-md space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-200">
                <AlertTriangle className="mx-auto h-9 w-9 text-amber-400" aria-hidden="true" />
                <h1 className="text-xl font-semibold text-white">{t("title")}</h1>
                <p className="text-sm text-slate-400">
                    {t("description")}
                </p>
                <Button type="button" onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    {t("try_again")}
                </Button>
            </div>
        </div>
    );
}
