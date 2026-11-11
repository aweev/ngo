# src

## Classification
**Repository Root (Blueprint / Hay)** — contains direct source code files (auth.ts, i18n.ts, instrumentation.ts, proxy.ts) plus 9 subdirectories with code contracts: actions, app, components, hooks, lib, providers, store, styles, types.

## Summary
Application source root for the NGO OS Next.js 16 application. Top-level files: `auth.ts` (Supabase-backed `auth()` replacement returning user + organization context), `i18n.ts` (next-intl request config with locale validation and message catalog loading), `instrumentation.ts` (P0 production readiness gate — fails fast on missing env, registers unhandled rejection hook), `proxy.ts` (Next.js middleware — auth guard, MFA step-up, org gate, i18n middleware). Subdirectories contain the full application layer: actions (server actions), app (App Router), components (React components), hooks (custom hooks), lib (shared libraries), providers (React providers), store (Zustand stores), styles (global CSS), types (TypeScript types).

## Interface (root-level)
- `auth()` — [`auth.ts:29`]: async function returning `AuthSession | null`; uses `getAuthContext` from `@/lib/auth/guards`; `AuthUser` and `AuthSession` interfaces [`auth.ts:6,14`]
- `getRequestConfig` default export — [`i18n.ts:5`]: next-intl request config; validates locale against `ALL_LOCALES`; falls back to English messages for missing catalogs [`i18n.ts:10-28`]
- `register()` — [`instrumentation.ts:9`]: production safety net; calls `productionReadinessGaps()` from `@/lib/env`; registers `unhandledRejection` hook [`instrumentation.ts:10-21`]
- `proxy(req)` — [`proxy.ts:26`]: Next.js middleware; auth guard, MFA step-up (AAL2), org gate, i18n; `config.matcher` skips api/_next/static/sw.js [`proxy.ts:116-119`]; `sanitizeCallbackUrl(value)` — [`proxy.ts:10`]: relative URL validation

## Invariants
- `proxy` redirects unauthenticated users from `/admin`, `/dashboard`, `/field` to `/${locale}/auth/login` [`proxy.ts:44-50`]
- `proxy` enforces MFA step-up (AAL2) for enrolled users entering protected zones [`proxy.ts:55-79`]
- `proxy` redirects org-less users to `/${locale}/auth/setup` [`proxy.ts:86-96`]
- `proxy` redirects logged-in users away from login page to `/admin` or `/dashboard` based on role [`proxy.ts:99-109`]
- `auth()` returns `null` when no session [`auth.ts:30-31`]
- `i18n.ts` falls back to `en.json` messages when a locale catalog is missing [`i18n.ts:19-28`]
- `instrumentation.ts` only runs `productionReadinessGaps()` in Node.js runtime [`instrumentation.ts:10-11`]

## Side Effects
- `proxy.ts` creates Supabase middleware client and calls `supabase.auth.getUser()` per request [`proxy.ts:27-30`]
- `proxy.ts` queries `organization_members` table per request [`proxy.ts:87-92,101-105`]
- `proxy.ts` issues `NextResponse.redirect()` for auth/org/MFA routing [`proxy.ts:49,67,77,94,109`]
- `i18n.ts` dynamically imports message catalogs (`../messages/${locale}.json`) [`i18n.ts:17,26`]
- `instrumentation.ts` logs errors and registers global `unhandledRejection` handler [`instrumentation.ts:13-20`]

## Subdirectory Contracts
- [./actions/README.md](./actions/README.md)
- [./app/README.md](./app/README.md)
- [./components/README.md](./components/README.md)
- [./hooks/README.md](./hooks/README.md)
- [./lib/README.md](./lib/README.md)
- [./providers/README.md](./providers/README.md)
- [./store/README.md](./store/README.md)
- [./styles/README.md](./styles/README.md)
- [./types/README.md](./types/README.md)

## Verification
`pnpm verify` (typecheck + lint + all static gates)
`pnpm test` (vitest)
