export default function PublicLoading() {
    return (
        <main className="min-h-[60vh] pt-20" aria-busy="true" aria-live="polite">
            <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4">
                <div className="w-full max-w-xl space-y-4 text-center">
                    <div className="mx-auto h-2 w-24 animate-pulse rounded-full bg-primary/30" />
                    <div className="mx-auto h-8 w-3/4 animate-pulse rounded-lg bg-muted" />
                    <div className="mx-auto h-4 w-2/3 animate-pulse rounded-lg bg-muted" />
                    <span className="sr-only">Loading page</span>
                </div>
            </div>
        </main>
    );
}
