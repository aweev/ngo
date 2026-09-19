import { MetadataRoute } from 'next';
import { ENV } from '@/lib/env'; // Assuming you have ENV vars, otherwise use process.env

export default function robots(): MetadataRoute.Robots {
    const baseUrl = ENV.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: [
                '/api/',      // Hide API endpoints
                '/admin/',    // Hide Admin Panel
                '/dashboard/',// Hide User Dashboard
                '/auth/',     // Hide Login flows
                '/_next/',    // Hide Next.js internals
            ],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}