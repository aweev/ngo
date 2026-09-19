// src/providers/theme-provider.tsx
"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    if (!mounted) {
        // Prevent hydration mismatch by rendering a placeholder with same dimensions or hidden
        return <div style={{ visibility: "hidden" }}>{children}</div>;
    }

    return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}