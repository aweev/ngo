"use client";

import { createContext, useContext, useEffect, useMemo } from 'react';
import { BrandConfig, GlobalConfig } from '@/types/config';

interface BrandContextType extends BrandConfig {
    enabledLocales: string[];
}

const defaultContext: BrandContextType = {
    name: "AWE e.V.",
    logoUrl: "",
    colors: { primary: "#D95D39", secondary: "#F0A202" },
    enabledLocales: ["en", "de", "fr", "es", "ar"]
};

const BrandContext = createContext<BrandContextType>(defaultContext);

export const useBrandConfig = () => useContext(BrandContext);

export function BrandProvider({
    config,
    children
}: {
    config: GlobalConfig | null,
    children: React.ReactNode
}) {
    const contextValue = useMemo(() => {
        if (!config) return defaultContext;
        return {
            ...config.brand,
            enabledLocales: config.localization?.activeLocales || defaultContext.enabledLocales
        };
    }, [config]);

    useEffect(() => {
        if (!config?.brand) return;

        const root = document.documentElement;
        const { colors, faviconUrl, name } = config.brand;
        const dynamicColors = colors as Record<string, string>;

        const applyBrandColors = () => {
            // Skip brand-color overrides when a non-default brand theme is active —
            // that theme owns --primary/--accent via [data-brand] CSS.
            // Inline styles would beat the stylesheet, so they must be cleared.
            const activeBrand = root.getAttribute("data-brand");
            const isCustomBrand = !!activeBrand && activeBrand !== "sunset";

            // 1. Primary Brand Color (Identity)
            if (dynamicColors.primary && !isCustomBrand) {
                root.style.setProperty('--primary', dynamicColors.primary);
                // Also map to specific Tailwind alias if used
                root.style.setProperty('--brand-hopeful-clay', dynamicColors.primary);
            } else if (isCustomBrand) {
                root.style.removeProperty('--primary');
                root.style.removeProperty('--brand-hopeful-clay');
            }

            // 2. Secondary/Accent Color
            if (dynamicColors.secondary && !isCustomBrand) {
                root.style.setProperty('--accent', dynamicColors.secondary);
                root.style.setProperty('--brand-radiant-gold', dynamicColors.secondary);
            } else if (isCustomBrand) {
                root.style.removeProperty('--accent');
                root.style.removeProperty('--brand-radiant-gold');
            }
        };

        applyBrandColors();

        // Re-apply whenever data-brand changes (user toggles Sunset ↔ Ocean)
        const observer = new MutationObserver((mutations) => {
            for (const m of mutations) {
                if (m.type === "attributes" && m.attributeName === "data-brand") {
                    applyBrandColors();
                }
            }
        });
        observer.observe(root, { attributes: true, attributeFilter: ["data-brand"] });

        // REMOVED: Do not set --background or --foreground here.
        // Doing so adds inline styles to <html> which overrides the .dark class selector.
        // Let globals.css handle light/dark background switching.

        // 3. Update Favicon
        if (faviconUrl) {
            const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
            if (link) {
                link.href = faviconUrl;
            } else {
                const newLink = document.createElement('link');
                newLink.rel = 'icon';
                newLink.href = faviconUrl;
                document.head.appendChild(newLink);
            }
        }

        // 4. Update Title
        if (name) document.title = name;

        return () => observer.disconnect();
    }, [config]);

    return (
        <BrandContext.Provider value={contextValue}>
            {children}
        </BrandContext.Provider>
    );
}