# Public Site Extraction Plan

**Decision:** 2026-10-11 — Split public marketing site to separate repo (`apps/web-public`)
**Rationale:** Zero shared runtime logic with NGO OS; deployment/bundle/security isolation; static SSG + ISR via webhook revalidation

---

## Current Architecture (Monorepo)

```
apps/ngo/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── public/           ← PUBLIC SITE (extract this)
│   │   │   │   ├── page.tsx      ← Homepage
│   │   │   │   ├── about/        ← About pages
│   │   │   │   ├── events/       ← Events
│   │   │   │   ├── stories/      ← Stories
│   │   │   │   ├── programs/     ← Programs
│   │   │   │   ├── get-involved/ ← Donate, Volunteer, Corporate
│   │   │   │   ├── contact/      ← Contact, Report
│   │   │   │   ├── news/         ← News
│   │   │   │   ├── layout.tsx    ← Public layout
│   │   │   │   ├── loading.tsx
│   │   │   │   ├── error.tsx
│   │   │   │   └── not-found.tsx
│   │   │   ├── admin/            ← STAYS (admin command center)
│   │   │   ├── dashboard/        ← STAYS (member dashboard)
│   │   │   ├── field/            ← STAYS (offline-first field PWA)
│   │   │   ├── auth/             ← STAYS (auth flows)
│   │   │   └── api/              ← STAYS (Stripe webhook, etc.)
│   │   ├── layout.tsx            ← Root layout (shared)
│   │   └── globals.css           ← Global styles (shared)
│   ├── components/
│   │   ├── landing/              ← Public site components
│   │   ├── about/                ← Public site components
│   │   ├── events/               ← Public site components
│   │   ├── stories/              ← Public site components
│   │   ├── ui/                   ← SHARED (design system)
│   │   ├── layout/               ← Mixed (admin + public)
│   │   └── field/                ← STAYS (field components)
│   ├── actions/
│   │   ├── public.ts             ← Public site server actions (extract)
│   │   └── ...                   ← STAYS
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── public-client.ts  ← SHARED (anon client for public reads)
│   │   ├── cache/                ← SHARED (revalidation)
│   │   ├── content/              ← SHARED (CMS mappers)
│   │   ├── seo.ts                ← Public site (extract)
│   │   └── i18n/                 ← SHARED (locales, formatting)
│   ├── types/
│   │   ├── domain-adapters.ts    ← Public site view models (extract)
│   │   └── domain/               ← Mixed
│   └── messages/                 ← SHARED (i18n messages)
```

---

## Target Architecture (Two Repos)

### Repo 1: `apps/ngo` — NGO Operating System (Core)
```
apps/ngo/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── admin/
│   │   │   ├── dashboard/
│   │   │   ├── field/
│   │   │   ├── auth/
│   │   │   └── api/
│   │   ├── layout.tsx            ← Minimal (auth providers only)
│   │   └── globals.css           ← Design system tokens only
│   ├── components/
│   │   ├── ui/                   ← Design system primitives
│   │   ├── layout/
│   │   │   ├── admin/            ← Admin sidebar, header
│   │   │   └── dashboard/        ← Dashboard layout
│   │   ├── field/                ← Field app components
│   │   └── admin/                ← Admin components
│   ├── actions/                  ← All server actions (admin, field, finance, etc.)
│   ├── lib/
│   │   ├── supabase/             ← All Supabase clients
│   │   ├── auth/                 ← Auth guards, permissions
│   │   ├── field-records.ts      ← Field core
│   │   ├── cache/                ← Revalidation tags
│   │   ├── content/              ← CMS view models (admin-facing)
│   │   └── ...
│   ├── types/
│   │   └── domain/               ← All domain types
│   └── messages/                 ← i18n (donor locales: en,de,fr,es,ar)
```

### Repo 2: `apps/web-public` — Public Marketing Site (Static)
```
apps/web-public/
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── page.tsx          ← Homepage
│   │   │   ├── about/
│   │   │   ├── events/
│   │   │   ├── stories/
│   │   │   ├── programs/
│   │   │   ├── get-involved/
│   │   │   ├── contact/
│   │   │   ├── news/
│   │   │   ├── layout.tsx        ← Public layout (header, footer)
│   │   │   ├── loading.tsx
│   │   │   ├── error.tsx
│   │   │   └── not-found.tsx
│   │   ├── layout.tsx            ← Root layout
│   │   └── globals.css           ← Public site styles
│   ├── components/
│   │   ├── landing/              ← Homepage sections
│   │   ├── about/                ← About page components
│   │   ├── events/               ← Event cards, lists
│   │   ├── stories/              ← Story cards, carousels
│   │   ├── ui/                   ← SHARED design system (from @awe/design-system)
│   │   └── layout/               ← Header, footer, nav
│   ├── lib/
│   │   ├── api.ts                ← Client for NGO OS public API
│   │   ├── supabase/
│   │   │   └── public-client.ts  ← Anon client (if direct DB access)
│   │   ├── content/              ← CMS mappers (public-facing)
│   │   ├── seo.ts                ← Metadata, structured data
│   │   └── i18n/                 ← Locale config (donor locales)
│   ├── types/
│   │   └── public.ts             ← Public view models
│   └── messages/                 ← i18n (donor locales: en,de,fr,es,ar)
```

---

## Shared Package: `@awe/design-system`

**Extract from both repos:**

```
packages/design-system/
├── src/
│   ├── tokens/
│   │   ├── colors.css
│   │   ├── spacing.css
│   │   ├── typography.css
│   │   ├── motion.css
│   │   └── breakpoints.css
│   ├── primitives/
│   │   ├── button/
│   │   ├── card/
│   │   ├── input/
│   │   ├── dialog/
│   │   ├── ... (all 60+ UI primitives)
│   ├── components/
│   │   ├── header/
│   │   ├── footer/
│   │   ├── navigation/
│   │   └── form-field/
│   ├── theme/
│   │   ├── createTheme.ts        ← Multi-tenant theming API
│   │   └── css-variables.ts
│   └── index.ts                  ← Public exports
├── stories/                      ← Storybook
├── package.json
└── tsconfig.json
```

**Consumption:**
- `apps/ngo`: `pnpm add @awe/design-system` (workspace protocol)
- `apps/web-public`: `pnpm add @awe/design-system` (workspace protocol)

---

## Data Access Strategy

### Option A: Direct Supabase Anon Access (Simpler, Recommended)
- `web-public` uses `@supabase/supabase-js` with anon key
- Reads from `public_*` views directly
- ISR revalidation via `next/cache` tags + webhook from NGO OS

### Option B: NGO OS Public API (More Controlled)
- `ngo` exposes `/api/public/*` endpoints
- `web-public` calls API with `Authorization: Bearer PUBLIC_API_KEY`
- Better for rate limiting, caching, versioning

**Recommendation:** Start with **Option A** (direct anon access). Migration to Option B only if needed.

---

## Revalidation Strategy

### Current (Monorepo)
- `revalidateTag('public-content')` called from admin actions
- `next/cache` tags shared in-process

### After Extraction
1. **NGO OS Admin Action** publishes content → calls webhook:
```typescript
// In NGO OS: actions/content.ts
await fetch(`${process.env.WEB_PUBLIC_URL}/api/revalidate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.REVALIDATION_SECRET}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ tags: ['public-content'], paths: ['/en/about'] }),
});
```

2. **Web Public Revalidation Endpoint** (`web-public/src/app/api/revalidate/route.ts`):
```typescript
export async function POST(request: Request) {
  const auth = request.headers.get('Authorization');
  if (auth !== `Bearer ${process.env.REVALIDATION_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  const { tags, paths } = await request.json();
  for (const tag of tags ?? []) {
    revalidateTag(tag);
  }
  for (const path of paths ?? []) {
    revalidatePath(path);
  }
  return Response.json({ revalidated: true, tags, paths });
}
```

---

## Migration Steps

### Phase 1: Prepare (Week 1)
- [ ] Create `packages/design-system` with current UI primitives
- [ ] Publish to local workspace (`pnpm -w add @awe/design-system`)
- [ ] Update both apps to consume design system
- [ ] Verify build passes in both apps

### Phase 2: Extract Public Site (Week 2)
- [ ] Create `apps/web-public` (Next.js 16 + `next-intl` + Tailwind 4)
- [ ] Copy `src/app/[locale]/public/*` → `web-public/src/app/[locale]/*`
- [ ] Copy `src/components/landing/*`, `about/*`, `events/*`, `stories/*` → `web-public/src/components/*`
- [ ] Copy `src/actions/public.ts` → `web-public/src/lib/api.ts` (convert to client fetch)
- [ ] Copy `src/lib/seo.ts`, `content/*`, `i18n/*` → `web-public/src/lib/*`
- [ ] Copy `src/types/domain-adapters.ts` → `web-public/src/types/public.ts`
- [ ] Copy `messages/*.json` (donor locales only) → `web-public/messages/*`
- [ ] Update imports to use `@awe/design-system`

### Phase 3: Connect Data (Week 3)
- [ ] Configure Supabase anon key in `web-public` env
- [ ] Implement `public-client.ts` for direct DB reads
- [ ] Implement revalidation webhook endpoint in `web-public`
- [ ] Update NGO OS admin actions to call revalidation webhook
- [ ] Test: publish content in admin → verify `web-public` updates

### Phase 4: Deploy & Cutover (Week 4)
- [ ] Deploy `web-public` to Vercel (separate project)
- [ ] Configure custom domain: `ngo.org` → `web-public`
- [ ] Configure subdomain: `app.ngo.org` → `ngo` (NGO OS)
- [ ] Update DNS, TLS, CDN
- [ ] Remove `src/app/[locale]/public/*` from `ngo`
- [ ] Remove public-only components from `ngo`
- [ ] Update CI/CD: separate pipelines

---

## Environment Variables

### NGO OS (apps/ngo)
```env
# Existing...
NEXT_PUBLIC_APP_URL=https://app.ngo.org
WEB_PUBLIC_URL=https://ngo.org
REVALIDATION_SECRET=generated-32-char-secret
```

### Web Public (apps/web-public)
```env
NEXT_PUBLIC_APP_URL=https://ngo.org
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
REVALIDATION_SECRET=generated-32-char-secret (same as NGO OS)
```

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Design system extraction breaks both apps | Extract incrementally; run both apps in parallel during transition |
| Revalidation webhook fails | Fallback: cron job in `web-public` polling `public_content_pages.updated_at` every 5min |
| i18n messages drift | Keep `messages/` in sync via shared package or script |
| SEO regression during cutover | Deploy `web-public` to preview domain first; run Lighthouse/SEO audit |
| Bundle size increases | Tree-shake design system; only import used primitives |

---

## Success Criteria

- [ ] `web-public` builds independently (no `ngo` dependencies)
- [ ] `ngo` builds without `public/` routes
- [ ] Admin publish → `web-public` updates within 30s
- [ ] Lighthouse score ≥ 90 (perf, a11y, SEO)
- [ ] All 5 donor locales render correctly
- [ ] Arabic RTL works on `web-public`
- [ ] No regression in NGO OS admin/dashboard/field