import { getTranslations } from "next-intl/server";

export default async function DashboardLoading() {
    const t = await getTranslations("Admin.Loading");
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6" aria-busy="true" aria-live="polite">
            <div className="w-full max-w-3xl space-y-4">
                <div className="h-8 w-56 animate-pulse rounded-lg bg-muted" />
                <div className="h-4 w-36 animate-pulse rounded bg-muted/70" />
                <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/70" />
                    ))}
                </div>
                <span className="sr-only">{t("dashboard")}</span>
            </div>
        </div>
    );
}
