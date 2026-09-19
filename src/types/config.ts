/**
 * Visual branding configuration coming from the Backend.
 * Allows admins to change the look/feel without redeploying code.
 */
export interface BrandConfig {
    name: string;          // Maps to 'brandName' in your component
    logoUrl: string;       // Default logo (Light Mode)
    logoDarkUrl?: string;  // Optional: Specific logo for Dark Mode
    faviconUrl?: string;
    colors: {
        primary: string;
        secondary: string;
        accent?: string;
        background?: string;
    };
    /**
     * Site-wide default brand color theme ('sunset' | 'ocean').
     * Set by admins in Settings > Branding (stored in
     * organizations.settings->>'brand_theme'). Visitors with no
     * personal override (localStorage) see this theme.
     */
    defaultTheme?: string;
}

/**
 * Feature flags to toggle functionality via the Admin Panel.
 */
export interface FeatureFlags {
    enableDonations: boolean;
    enableBlog: boolean;
    enablePwa: boolean;       // Triggers the SyncProvider
    maintenanceMode: boolean; // Triggers a maintenance screen
}

/**
 * Localization settings managed by the Backend.
 */
export interface LocalizationConfig {
    activeLocales: string[]; // e.g., ["en", "de"] - allows disabling specific languages
    defaultLocale: string;
}

/**
 * The master configuration object returned by /api/v1/configuration/global
 */
export interface GlobalConfig {
    brand: BrandConfig;
    features: FeatureFlags;
    localization: LocalizationConfig;
}

/**
 * Fallback configuration used if the Go Backend is unreachable (High Availability).
 */
export const DEFAULT_CONFIG: GlobalConfig = {
    brand: {
        name: "AWE e.V.",
        logoUrl: "/logo.svg",
        colors: {
            primary: "#D95D39", // Default Hopeful Clay
            secondary: "#F0A202" // Default Radiant Gold
        }
    },
    features: {
        enableDonations: true,
        enableBlog: true,
        enablePwa: false,
        maintenanceMode: false
    },
    localization: {
        activeLocales: ['en', 'de', 'fr', 'es', 'ar'],
        defaultLocale: 'en'
    }
};