import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n/locales';

export const routing = defineRouting({
    locales: SUPPORTED_LOCALES,

    defaultLocale: DEFAULT_LOCALE,

    localePrefix: 'always'
});

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);