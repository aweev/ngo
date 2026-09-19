'use client';

import { useEffect } from 'react';

export function SyncProvider({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        // 1. Register Service Worker in Production
        if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
            navigator.serviceWorker
                .register('/sw.js')
                .then(() => {
                    console.log('✅ Service Worker Registered');
                })
                .catch((err) => {
                    console.error('❌ Service Worker Registration failed:', err);
                });
        }

        // 2. Network Status Listener
        const handleOnline = () => {
            console.log("🌐 App is back online. Triggering sync...");
            // Dispatch a custom event that your Sync Service hook will listen to
            window.dispatchEvent(new CustomEvent('sync-queue'));
        };

        const handleOffline = () => {
            console.log("🔌 App is offline. Requests will be queued.");
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return <>{children}</>;
}