# Deploy runbook (web)

## Prerequisites
- `apps/web/.env.local` filled (Supabase URL/anon, service role server-only,
  `NEXT_PUBLIC_APP_URL` = canonical prod URL, Stripe keys if live).
- Supabase migrations applied: `supabase db push --linked`
  (includes `20240101000027_stripe_events.sql`).
- `pnpm verify` green (typecheck + lint + migrations + action-auth + cta-links + i18n).

## Build & ship
1. `cd apps/web && pnpm build` (standalone output in `.next/standalone`).
2. Docker: `docker build -f apps/web/Dockerfile -t awe-web:$TAG ./apps/web`
3. Run: `docker run -p 3000:3000 --env-file apps/web/.env.local awe-web:$TAG`
4. Health: `GET /` 200; PWA `sw.js` served; CSP header present.

## Post-deploy checks
- `/api/stripe/webhook` returns 400 on missing signature (route live, not 404).
- Locale homepages `/en /de /fr /es /ar` render; `/_next/static` cached.
- Admin/login redirect works; MFA step-up triggers for enrolled users.
