import type { ReactNode } from 'react';
import { getTranslations } from 'next-intl/server';
import { auth } from '@/auth';
import { FieldLink, fieldRedirect } from '@/lib/navigation-field';
import { normalizeFieldLocale } from '@/lib/i18n/locales';
import { FieldSyncBadge } from '@/components/field/sync-badge';

interface FieldLayoutProps {
    children: ReactNode;
    params: Promise<{ locale: string }>;
}

/**
 * Field app shell (Phase 1.2). Deliberately NOT the dashboard layout: no
 * sidebar, no heavy widgets — a thumb-reachable header that caches well
 * offline and stays usable on shared low-end phones.
 */
export const dynamic = 'force-dynamic';

export default async function FieldLayout({ children, params }: FieldLayoutProps) {
    const { locale: rawLocale } = await params;
    const locale = normalizeFieldLocale(rawLocale);
    const session = await auth();
    if (!session?.user) {
        fieldRedirect({ href: '/auth/login', locale });
        return null;
    }
    const t = await getTranslations({ locale, namespace: 'Field' });

    return (
        <div className="min-h-screen bg-background">
            <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
                <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
                    <FieldLink href="/field" className="text-base font-bold">
                        {t('field_home')}
                    </FieldLink>
                    <FieldSyncBadge />
                </div>
            </header>
            <main className="mx-auto max-w-2xl space-y-4 p-4 pb-24">{children}</main>
        </div>
    );
}
