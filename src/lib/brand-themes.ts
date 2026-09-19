/**
 * Brand color themes (independent from light/dark mode).
 * Active theme is stored as `data-brand` on <html> and persisted in localStorage.
 *
 * - sunset: current default — Hopeful Clay + Radiant Gold (warm, Afro-centric)
 * - ocean:  Ocean Trust — Deep Teal + Warm Sand (trustworthy, NGO-professional)
 *
 * Light/dark mode (next-themes `.dark` class) combines with these,
 * giving 4 combos: sunset-light, sunset-dark, ocean-light, ocean-dark.
 */

export type BrandThemeId = "sunset" | "ocean";

export interface BrandThemeDefinition {
  id: BrandThemeId;
  // CSS variables applied via globals.css [data-brand="..."] selectors.
  // Kept here as source of truth for previews / toggles / inline fallback.
  light: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    ring: string;
  };
  dark: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    ring: string;
  };
  // Swatch colors shown in the toggle UI
  swatches: [string, string];
}

export const BRAND_THEMES: Record<BrandThemeId, BrandThemeDefinition> = {
  sunset: {
    id: "sunset",
    light: {
      primary: "#D95D39",
      primaryForeground: "#FFFFFF",
      accent: "#F0A202",
      accentForeground: "#1D2129",
      ring: "#D95D39",
    },
    dark: {
      primary: "#D95D39",
      primaryForeground: "#FFFFFF",
      accent: "#F0A202",
      accentForeground: "#1D2129",
      ring: "#F0A202",
    },
    swatches: ["#D95D39", "#F0A202"],
  },
  ocean: {
    id: "ocean",
    light: {
      primary: "#0E7C7B",
      primaryForeground: "#FFFFFF",
      accent: "#E9C46A",
      accentForeground: "#14342B",
      ring: "#0E7C7B",
    },
    dark: {
      primary: "#2A9D8F",
      primaryForeground: "#0B1512",
      accent: "#E9C46A",
      accentForeground: "#14342B",
      ring: "#E9C46A",
    },
    swatches: ["#0E7C7B", "#E9C46A"],
  },
};

export const BRAND_THEME_IDS: BrandThemeId[] = ["sunset", "ocean"];

export const DEFAULT_BRAND_THEME: BrandThemeId = "sunset";

export const BRAND_THEME_STORAGE_KEY = "awe-brand-theme";

export function isBrandThemeId(value: unknown): value is BrandThemeId {
  return value === "sunset" || value === "ocean";
}
