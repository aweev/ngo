import Link from 'next/link';

// P0: root boundary for pre-locale routes (e.g. bare `/`, bad locale).
// Localized 404s live in src/app/[locale]/not-found.tsx.
export default function RootNotFound() {
    return (
        <main className="mx-auto max-w-xl px-4 py-24 text-center">
            <h1 className="mb-4 text-3xl font-bold">Page not found</h1>
            <p className="mb-8 text-muted-foreground">
                The page you are looking for does not exist.
            </p>
            <Link href="/en/public" className="underline">
                Go to homepage
            </Link>
        </main>
    );
}
