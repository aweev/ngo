import { getTranslations } from "next-intl/server";

export default async function AdminLoading() {
    const t = await getTranslations("Admin.Loading");
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6" aria-busy="true" aria-live="polite">
            <div className="w-full max-w-3xl space-y-4">
                <div className="h-8 w-64 animate-pulse rounded-lg bg-slate-800" />
                <div className="h-4 w-40 animate-pulse rounded bg-slate-800/70" />
                <div className="grid gap-4 pt-4 sm:grid-cols-2 lg:grid-cols-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-28 animate-pulse rounded-xl bg-slate-800/70" />
                    ))}
                </div>
                <div className="h-64 animate-pulse rounded-xl bg-slate-800/50" />
                <span className="sr-only">{t("admin")}</span>
            </div>
        </div>
    );
}
