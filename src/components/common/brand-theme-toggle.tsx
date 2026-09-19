"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BRAND_THEMES, BRAND_THEME_IDS, type BrandThemeId } from "@/lib/brand-themes";
import { useBrandTheme } from "@/providers/brand-theme-provider";

interface BrandThemeToggleProps {
  size?: "sm" | "md";
  showLabel?: boolean;
}

function SwatchDots({ id, className }: { id: BrandThemeId; className?: string }) {
  const [c1, c2] = BRAND_THEMES[id].swatches;
  return (
    <span className={cn("flex items-center -space-x-1", className)} aria-hidden>
      <span
        className="h-3.5 w-3.5 rounded-full border border-white/80 shadow-sm"
        style={{ backgroundColor: c1 }}
      />
      <span
        className="h-3.5 w-3.5 rounded-full border border-white/80 shadow-sm"
        style={{ backgroundColor: c2 }}
      />
    </span>
  );
}

export function BrandThemeToggle({ size = "sm", showLabel = false }: BrandThemeToggleProps) {
  const t = useTranslations("BrandTheme");
  const { brandTheme, setBrandTheme } = useBrandTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border border-border/50 bg-muted/50 p-1",
          size === "sm" ? "h-7" : "h-8"
        )}
        aria-hidden
      >
        <div className={cn("rounded-full bg-muted", size === "sm" ? "h-5 w-5" : "h-6 w-6")} />
        <div className={cn("rounded-full bg-muted", size === "sm" ? "h-5 w-5" : "h-6 w-6")} />
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("label")}
      title={t("label")}
      className="flex items-center gap-0.5 rounded-full border border-border/50 bg-muted/50 p-1"
    >
      {BRAND_THEME_IDS.map((id) => {
        const isActive = brandTheme === id;
        const label = t(`${id}.label`);
        return (
          <Button
            key={id}
            variant="ghost"
            size="sm"
            onClick={() => setBrandTheme(id)}
            aria-pressed={isActive}
            aria-label={label}
            title={label}
            className={cn(
              "relative rounded-full transition-all duration-200",
              size === "sm" ? "h-6 px-2 gap-1.5" : "h-7 px-2.5 gap-2",
              isActive
                ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <SwatchDots id={id} />
            {showLabel && <span className="text-xs font-medium">{label}</span>}
            {isActive && showLabel && <Check className="h-3 w-3 text-primary" />}
          </Button>
        );
      })}
    </div>
  );
}
