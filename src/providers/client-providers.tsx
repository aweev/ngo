'use client';

import { ThemeProvider } from '@/providers/theme-provider';
import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';
import { Toaster } from 'sonner';
import NextTopLoader from 'nextjs-toploader';

import { BrandProvider } from './brand-provider';
import { BrandThemeProvider } from './brand-theme-provider';
import { SyncProvider } from './sync-provider';
import { GlobalConfig } from '@/types/config';
import { DEFAULT_BRAND_THEME, type BrandThemeId } from '@/lib/brand-themes';
import { useAuthCheck } from '@/hooks/use-auth-check';
import { OfflineBanner } from '@/components/common/offline-banner';
import { CampaignSafetyGuard } from './campaign-safety-guard';

type Props = {
    children: React.ReactNode;
    locale: string;
    messages: AbstractIntlMessages;
    config: GlobalConfig;
    timeZone?: string;
    /** Site-wide default set by admins (Settings > Branding). */
    defaultBrandTheme?: BrandThemeId;
};

// Internal component to monitor auth state changes
function AuthStateMonitor() {
    useAuthCheck();
    return null;
}

export function ClientProviders({
    children,
    locale,
    messages,
    config,
    timeZone,
    defaultBrandTheme = DEFAULT_BRAND_THEME
}: Props) {
    return (
        <>
            {/* 1. Visual Feedback for Navigation */}
            <NextTopLoader
                color="var(--primary)"
                initialPosition={0.08}
                crawlSpeed={200}
                height={3}
                showSpinner={false}
                shadow="0 0 10px var(--primary),0 0 5px var(--primary)"
            />

            {/* 2. Security Monitor (Needs SessionContext) */}
            <AuthStateMonitor />

            <NextIntlClientProvider
                locale={locale}
                messages={messages}
                timeZone={timeZone ?? 'Europe/Berlin'}
            >
                <CampaignSafetyGuard />
                <SyncProvider> {/* PWA/Offline Support */}
                    <BrandThemeProvider defaultTheme={defaultBrandTheme}>
                        <ThemeProvider
                            attribute="class"
                            defaultTheme="system"
                            enableSystem
                            disableTransitionOnChange
                        >
                            {/*
                               BrandProvider applies CSS variables from the backend config
                               (sunset theme only — ocean theme owns its vars via data-brand CSS).
                            */}
                            <BrandProvider config={config}>
                                {children}

                                {/* Offline Sync Banner Indicator */}
                                <OfflineBanner />

                                {/* Global Toaster for API Success/Error messages */}
                                <Toaster
                                    position="top-right"
                                    richColors
                                    closeButton
                                    theme="system"
                                />
                            </BrandProvider>
                        </ThemeProvider>
                    </BrandThemeProvider>
                </SyncProvider>
            </NextIntlClientProvider>
        </>
    );
}
