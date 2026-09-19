import bundleAnalyzer from '@next/bundle-analyzer';
import withPWAInit from '@ducanh2912/next-pwa';
import createNextIntlPlugin from 'next-intl/plugin';
import type { NextConfig } from 'next';

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

// Initialize PWA
const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  // Never precache privileged HTML: admin/dashboard/auth must always hit the server.
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  publicExcludes: ['!workbox-*.js', '!sw.js'],
  workboxOptions: {
    // Never serve cached HTML for privileged or API routes.
    navigateFallbackDenylist: [/^\/api/, /\/admin/, /\/dashboard/, /\/auth\//],
    runtimeCaching: [
      {
        // Cache Cloudinary Images
        urlPattern: /^https:\/\/res\.cloudinary\.com\//,
        handler: 'CacheFirst',
        options: {
          cacheName: 'cloudinary-images',
          expiration: { maxEntries: 200, maxAgeSeconds: 86400 * 7 }, // 7 Days
        },
      },
    ],
  },
});

const withIntl = createNextIntlPlugin('./src/i18n.ts');

/** 
 * Helper to generate CSP
 */
function createCSP(dev: boolean) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  return [
    "default-src 'self'",
    `script-src 'self'${dev ? " 'unsafe-inline' 'unsafe-eval'" : ''} https://js.stripe.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com",
    "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com",
    `connect-src 'self' ${supabaseUrl} https://api.cloudinary.com https://js.stripe.com https://*.sentry.io https://vitals.vercel-insights.com`.trim(),
    "media-src 'self' https://res.cloudinary.com",
    "worker-src 'self' blob:",
    "frame-src 'self' https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join('; ');
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Standalone output is only needed for the Docker image (see apps/web/Dockerfile,
  // which sets NEXT_OUTPUT=standalone). Enabling it unconditionally breaks
  // `next build` on Windows: creating the standalone node_modules symlinks
  // requires Developer Mode / admin rights and fails with EPERM.
  output: process.env.NEXT_OUTPUT === 'standalone' ? 'standalone' : undefined,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(self "https://js.stripe.com")',
          },
          { key: 'Content-Security-Policy', value: createCSP(process.env.NODE_ENV === 'development') },
        ],
      },
    ];
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '**',
      },
      {
        protocol: 'https' as const,
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '**',
      },
    ],
  },
};

export default withBundleAnalyzer(withPWA(withIntl(nextConfig)));