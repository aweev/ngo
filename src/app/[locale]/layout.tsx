import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { Metadata, Viewport } from 'next';

import { fontSans, fontSerif } from '@/lib/fonts';
import { cn } from '@/lib/utils';
import { routing } from '@/lib/navigation';
import { ENV } from '@/lib/env';
import { ClientProviders } from '@/providers/client-providers';
import { DEFAULT_CONFIG, GlobalConfig } from '@/types/config';
import { DEFAULT_BRAND_THEME, isBrandThemeId } from '@/lib/brand-themes';
import {
  DEFAULT_BRAND_EXPERIENCE,
  isBrandCampaignId,
  type PublicBrandExperience,
} from '@/lib/brand-experience';
import { createSupabasePublicClient } from '@/lib/supabase/server';

import '@/styles/globals.css';

/**
 * Prerender the locale shell for every supported locale (enables ISR/static
 * output for the public pages underneath).
 */
export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

/**
 * Resolves the site-wide default brand theme chosen by admins
 * (organizations.settings->>'brand_theme' for the public org).
 * Reads through the SECURITY DEFINER public_org_brand_theme()
 * function using the cookieless anon client, so the layout stays
 * cacheable. Never throws — falls back to sunset when the DB
 * is unreachable.
 */
async function getServerBrandExperience(): Promise<PublicBrandExperience> {
  try {
    const supabase = createSupabasePublicClient();
    const { data } = await supabase.rpc('public_org_brand_experience');
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      const experience = data as Record<string, unknown>;
      if (isBrandThemeId(experience.base_theme)) {
        return {
          baseTheme: experience.base_theme,
          campaignId: isBrandCampaignId(experience.campaign_id) ? experience.campaign_id : null,
        };
      }
    }
  } catch {
    // DB unreachable during build/prerender — use default.
  }
  return { baseTheme: DEFAULT_BRAND_EXPERIENCE.baseTheme, campaignId: null };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;

  // Strict check against navigation config
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    return {};
  }

  const brandName = DEFAULT_CONFIG.brand.name;
  const favicon = '/icon.svg';

  return {
    metadataBase: new URL(ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
    title: {
      template: `%s | ${brandName}`,
      default: brandName,
    },
    description: "Dignified Growth & Radiant Community",
    icons: { icon: favicon },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  width: 'device-width',
  initialScale: 1,
  // No maximumScale: blocking pinch-zoom fails WCAG 1.4.4 (Resize Text).
};

export default async function RootLayout({ children, params }: Props) {
  const { locale } = await params;

  // 1. Validate Locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  // 2. Load translations (locale files only - branding/config comes from
  // DEFAULT_CONFIG until organization branding is stored in Supabase)
  const messages = await getMessages({ locale }).catch(() => ({}));

  // 3. Global Configuration (+ admin-chosen default brand theme)
  const brandExperience = await getServerBrandExperience();
  const defaultBrandTheme = brandExperience.baseTheme;
  const config: GlobalConfig = {
    ...DEFAULT_CONFIG,
    brand: { ...DEFAULT_CONFIG.brand, defaultTheme: defaultBrandTheme },
  };

  const dir = locale === 'ar' ? 'rtl' : 'ltr';

  return (
    <html
      lang={locale}
      dir={dir}
      data-brand={defaultBrandTheme}
      data-campaign={brandExperience.campaignId ?? undefined}
      suppressHydrationWarning
    >
      <head>
        {/*
          Restore brand theme before paint to avoid flash.
          Priority: visitor's personal override (localStorage) > admin default.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var d=${JSON.stringify(defaultBrandTheme)};var t=localStorage.getItem("awe-brand-theme");var v=(t==="ocean"||t==="sunset")?t:d;document.documentElement.setAttribute("data-brand",v)}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={cn(
          "min-h-screen bg-background font-sans text-foreground antialiased",
          fontSans.variable,
          fontSerif.variable
        )}
      >
        <ClientProviders
          locale={locale}
          messages={messages}
          config={config}
          defaultBrandTheme={defaultBrandTheme}
        >
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
