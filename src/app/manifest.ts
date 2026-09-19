import { MetadataRoute } from 'next';
import { DEFAULT_CONFIG } from '@/types/config';

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: DEFAULT_CONFIG.brand.name,
        short_name: "AWE",
        description: "Dignified Growth & Radiant Community",
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: DEFAULT_CONFIG.brand.colors.background || '#F9F8F6',
        theme_color: DEFAULT_CONFIG.brand.colors.primary,
        icons: [
            {
                src: '/icon.svg',
                sizes: 'any',
                type: 'image/svg+xml',
            },
            {
                src: '/icon.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    };
}