'use client';

import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
    return (
        <div className="flex min-h-[60vh] items-center justify-center p-6" role="alert">
            <div className="max-w-md space-y-5 rounded-xl border bg-card p-8 text-center">
                <AlertTriangle className="mx-auto h-9 w-9 text-primary" aria-hidden="true" />
                <h1 className="text-xl font-semibold">This page failed to load</h1>
                <p className="text-sm text-muted-foreground">
                    Something went wrong while loading your dashboard. Please try again.
                </p>
                <Button type="button" onClick={reset} className="gap-2">
                    <RefreshCw className="h-4 w-4" aria-hidden="true" />
                    Try again
                </Button>
            </div>
        </div>
    );
}
