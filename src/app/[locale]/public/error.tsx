'use client';

import { useEffect } from 'react';
import { Link } from '@/lib/navigation';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function PublicError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        // Keep the boundary quiet for visitors while Next.js still captures the error.
        console.error('Public route failed to render');
    }, []);

    return (
        <main className="min-h-[60vh] pt-20" role="alert">
            <div className="container mx-auto flex min-h-[60vh] items-center justify-center px-4 text-center">
                <div className="max-w-lg space-y-6">
                    <AlertTriangle className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                    <h1 className="text-3xl font-serif font-bold text-foreground">Something went wrong</h1>
                    <p className="text-muted-foreground">This page could not be loaded. Please try again or return to the homepage.</p>
                    <div className="flex flex-col justify-center gap-3 sm:flex-row">
                        <Button type="button" onClick={reset}>
                            <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                            Try again
                        </Button>
                        <Button asChild variant="outline">
                            <Link href="/">Return home</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
