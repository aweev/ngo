"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2, Palette } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
    BRAND_THEMES,
    BRAND_THEME_IDS,
    type BrandThemeId,
} from "@/lib/brand-themes";
import { useBrandTheme } from "@/providers/brand-theme-provider";
import { updateDefaultBrandTheme } from "@/actions/organization";



export function BrandingThemeForm({ initialTheme }: { initialTheme: BrandThemeId }) {
    const t = useTranslations("Admin.SettingsBranding");
    const { setBrandTheme: setPersonalTheme } = useBrandTheme();
    const [selected, setSelected] = React.useState<BrandThemeId>(initialTheme);
    const [saving, setSaving] = React.useState(false);
    const [status, setStatus] = React.useState<{ kind: "ok" | "error"; text: string } | null>(null);

    const unchanged = selected === initialTheme;

    async function handleSave() {
        setSaving(true);
        setStatus(null);
        const result = await updateDefaultBrandTheme(selected);
        setSaving(false);
        if (result.success) {
            // Apply immediately for the admin too (personal override follows default)
            setPersonalTheme(selected);
            setStatus({ kind: "ok", text: t("status_ok") });
        } else {
            setStatus({ kind: "error", text: result.error ?? t("status_error") });
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Palette className="h-4 w-4" />
                <p>
                    {t("hint")}
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={t("aria_label")}>
                {BRAND_THEME_IDS.map((id) => {
                    const [c1, c2] = BRAND_THEMES[id].swatches;
                    const isActive = selected === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            role="radio"
                            aria-checked={isActive}
                            onClick={() => {
                                setSelected(id);
                                setStatus(null);
                            }}
                            className={cn(
                                "relative rounded-xl border p-4 text-left transition-all",
                                isActive
                                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                                    : "border-border hover:border-primary/40 hover:bg-muted/50"
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <span className="flex items-center -space-x-1.5" aria-hidden>
                                    <span
                                        className="h-7 w-7 rounded-full border-2 border-white shadow"
                                        style={{ backgroundColor: c1 }}
                                    />
                                    <span
                                        className="h-7 w-7 rounded-full border-2 border-white shadow"
                                        style={{ backgroundColor: c2 }}
                                    />
                                </span>
                                <span>
                                    <span className="block text-sm font-semibold capitalize">{id}</span>
                                    <span className="block text-xs text-muted-foreground">
                                        {t(id === "sunset" ? "theme_sunset" : "theme_ocean")}
                                    </span>
                                </span>
                            </div>
                            {isActive && (
                                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                                    <Check className="h-3 w-3" />
                                </span>
                            )}
                            {id === initialTheme && (
                                <span className="absolute bottom-3 right-3 rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                    {t("current_live")}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {status && (
                <p
                    role={status.kind === "error" ? "alert" : "status"}
                    className={cn(
                        "text-xs font-medium",
                        status.kind === "ok" ? "text-emerald-600" : "text-destructive"
                    )}
                >
                    {status.text}
                </p>
            )}

            <Button size="sm" onClick={handleSave} disabled={unchanged || saving}>
                {saving && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}
                {saving ? t("saving") : t("set_default")}
            </Button>
        </div>
    );
}
