'use client';

// P0: root error boundary — [locale]/global-error.tsx covers localized routes.
export default function RootGlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html lang="en">
            <body>
                <main className="mx-auto max-w-xl px-4 py-24 text-center">
                    <h1 className="mb-4 text-3xl font-bold">Something went wrong</h1>
                    <p className="mb-8 text-muted-foreground">
                        {error.digest ? `Error reference: ${error.digest}` : 'Please try again.'}
                    </p>
                    <button type="button" onClick={reset} className="underline">
                        Try again
                    </button>
                </main>
            </body>
        </html>
    );
}
