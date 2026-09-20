import type { ReactNode } from 'react';

/**
 * Root layout (passthrough).
 *
 * next-intl owns the `<html>` / `<body>` tags in `src/app/[locale]/layout.tsx`,
 * so this file must exist but only render children. Next.js App Router
 * requires a root `app/layout.tsx` — without it every page fails to render.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
