import { createNavigation } from 'next-intl/navigation';
import { defineRouting } from 'next-intl/routing';
import { FIELD_LOCALES } from '@/lib/i18n/locales';

export const fieldRouting = defineRouting({
    locales: FIELD_LOCALES,
    defaultLocale: 'en',
    localePrefix: 'always'
});

export const { Link: FieldLink, redirect: fieldRedirect, usePathname: useFieldPathname, useRouter: useFieldRouter } = createNavigation(fieldRouting);