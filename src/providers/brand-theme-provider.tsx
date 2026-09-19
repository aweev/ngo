// src/providers/brand-theme-provider.tsx
"use client";

import * as React from "react";
import {
  BRAND_THEME_STORAGE_KEY,
  DEFAULT_BRAND_THEME,
  isBrandThemeId,
  type BrandThemeId,
} from "@/lib/brand-themes";

interface BrandThemeContextType {
  brandTheme: BrandThemeId;
  setBrandTheme: (theme: BrandThemeId) => void;
}

const BrandThemeContext = React.createContext<BrandThemeContextType>({
  brandTheme: DEFAULT_BRAND_THEME,
  setBrandTheme: () => {},
});

export function useBrandTheme() {
  return React.useContext(BrandThemeContext);
}

/**
 * Priority: visitor's personal override (localStorage) >
 * server-rendered data-brand (admin default) > defaultTheme prop.
 */
function getInitialTheme(fallback: BrandThemeId): BrandThemeId {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(BRAND_THEME_STORAGE_KEY);
    if (isBrandThemeId(stored)) return stored;
  } catch {
    // ignore (private mode etc.)
  }
  // Also respect server-rendered data-brand if present
  const attr = document.documentElement.getAttribute("data-brand");
  if (isBrandThemeId(attr)) return attr;
  return fallback;
}

export function BrandThemeProvider({
  children,
  defaultTheme = DEFAULT_BRAND_THEME,
}: {
  children: React.ReactNode;
  /** Site-wide default set by admins — used when the visitor has no override. */
  defaultTheme?: BrandThemeId;
}) {
  const [brandTheme, setBrandThemeState] =
    React.useState<BrandThemeId>(defaultTheme);
  const [mounted, setMounted] = React.useState(false);

  // Hydrate from localStorage after mount (avoids SSR mismatch)
  React.useEffect(() => {
    setBrandThemeState(getInitialTheme(defaultTheme));
    setMounted(true);
  }, [defaultTheme]);

  // Apply to <html data-brand="..."> + persist
  React.useEffect(() => {
    if (!mounted) return;
    document.documentElement.setAttribute("data-brand", brandTheme);
    try {
      window.localStorage.setItem(BRAND_THEME_STORAGE_KEY, brandTheme);
    } catch {
      // ignore
    }
  }, [brandTheme, mounted]);

  const setBrandTheme = React.useCallback((theme: BrandThemeId) => {
    setBrandThemeState(theme);
  }, []);

  const value = React.useMemo(
    () => ({ brandTheme, setBrandTheme }),
    [brandTheme, setBrandTheme]
  );

  return (
    <BrandThemeContext.Provider value={value}>
      {children}
    </BrandThemeContext.Provider>
  );
}
