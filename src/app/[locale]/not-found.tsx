import { Link } from '@/lib/navigation';
import { useTranslations } from 'next-intl';

// Note: not-found.tsx in app/[locale] inherits the layout, 
// so we can use useTranslations here safely.
export default function NotFound() {
    const t = useTranslations('NotFound');
    const tCommon = useTranslations('Error');

    return (
        <main className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
    <div className="font-serif text-[120px] font-bold leading-none text-brand-hopeful-clay/20 select-none" aria-hidden="true">
        404
    </div>
    <h1 className="text-3xl font-bold mt-4">{t('title')}</h1>
            <p className="mt-2 text-muted-foreground max-w-md mx-auto">
                {t('description')}
            </p>
            <Link
                href="/"
                className="mt-8 rounded-lg bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90 transition-opacity inline-flex items-center gap-2"
            >
                {tCommon('home')}
            </Link>
        </main>
    );
}