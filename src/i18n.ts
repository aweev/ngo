import { getRequestConfig } from 'next-intl/server';
import { routing } from '@/lib/navigation';
import { ALL_LOCALES } from '@/lib/i18n/locales';

export default getRequestConfig(async ({ requestLocale }) => {
    // This typically corresponds to the `[locale]` segment
    let locale = await requestLocale;

    // Validate that the incoming `locale` parameter is valid
    if (!locale || !ALL_LOCALES.includes(locale as (typeof ALL_LOCALES)[number])) {
        locale = routing.defaultLocale;
    }

    try {
        return {
            locale,
            messages: (await import(`../messages/${locale}.json`)).default
        };
    } catch {
        return {
            locale,
            messages: {}
        };
    }
});