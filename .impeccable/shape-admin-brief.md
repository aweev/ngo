# Shape Brief — /admin Command Center

## Job and audience

Who arrives: program managers, finance officers, fundraisers, M&E officers, executive directors / board members — five permission-gated roles (member, manager, admin, owner + field officer read-only where applicable).
Context: sitting at a desk, responsible for money, programs, people, or impact evidence; multitasking across tabs; needs to scan for exceptions, approve items, and export evidence quickly.
Need: a single command center that surfaces what needs attention today, routes each role to their primary work, and lets them act (approve, reject, export, edit) without hunting through nested menus.
Visitor mode: Operate — complete tasks, scan for exceptions, act on items.

## Outcome and proof

Primary task/action: each role lands on /admin and within seconds sees their open approvals, exceptions, and key metrics; can drill into one item and act (approve/reject/export/edit) in under two clicks.
Success: time-to-first-action under 60 seconds; zero missed approvals due to buried notifications; finance officer can reconcile a batch without leaving the financial section; fundraiser can pull a donor report without SQL.
Product-specific truth (from PRODUCT.md): fund accountability with two-step approvals above threshold; immutable audit trails; restricted vs unrestricted funds; offline-first does not apply here (admin is online-only); five locales including Arabic RTL; large tap targets, icons plus labels, plain language.

## Selected direction

Visual authority: existing DESIGN.md (Ntum) — Laterite Earth (#D95D39) primary, Harvest Gold (#F0A202) accent, Night Charcoal (#1D2129) secondary, system fonts, flat-by-default with shadow-sm cards, inline SVG textures only on public/marketing surfaces (not admin), Label-With-Icon rule.
Structural thesis: keep the current route structure; introduce a unified attention shell (global inbox + stat strip + recent actions) at /admin so every role sees their open items first; standardize list pages on the existing table + stat-card + page-header pattern; standardize forms on the existing input/button/card components.
Sequence: attention shell → role-specific list → item detail → action (approve/reject/edit/export) → confirmation toast → return to list.
Focal moment: the "needs your action" count in the attention shell — the first thing a role sees on landing.
Implementation consequence: no new component library; reuse the 24 existing admin components + shadcn/ui primitives; new shells/layouts are server components with client components for interactivity.

## Scope and boundaries

Fidelity: production-ready screen specification, not code.
Breadth: the /admin shell (layout + attention shell + navigation) and three representative list/detail flows: financial/expenses (two-step approval), governance/approval-inbox (workflow decisions), donors (donor 360° + report).
Interactivity: server actions for mutations, optimistic UI where safe, confirmation dialogs on destructive actions.
Named target: /admin and its child routes.
Untouched: existing Supabase schema, RLS policies, server action signatures, permission registry (5 roles, no custom role builder), audit_events append-only invariant, offline field app (/field), public site (/public).
Explicit anti-goals: no custom role builder (by design), no internal chat system (WhatsApp/SMS outside), no generic CMS builder, no HRIS lifecycle workflows, no AI-generated donor narratives.

## States and ranges

Content ranges: attention shell shows 0–50 open items (typical 3–12); list pages show 10–500 rows per page with pagination; stat cards show currency amounts and counts with delta indicators; forms have 2–15 fields.
Material states: first-run (empty state with onboarding hint), empty (no open items — show "caught up" state), loading (skeleton on lists/skeletons), error (server action failure — inline message with retry), success (toast + list refresh), permissions (403/404 gate with clear message), overflow (truncated tables with row menus), expert use (keyboard shortcuts, CSV export, query-hashed reports).

## Interaction and layout

Layout: fixed left navigation (role-filtered destinations), top bar with org switcher + user profile, main content area. Attention shell spans top of main: stat strip (3–5 key numbers), open-actions inbox (role-filtered), recent-activity feed.
Hierarchy: page title (display), subtitle/context (body), stat strip, then list or form. Primary action button in Laterite Earth; secondary/destructive per DESIGN.md.
Responsiveness: desktop-first (admin is desk-based); table stacks to cards below md breakpoint; navigation collapses to drawer.
Affordances: icons always with labels (Label-With-Icon Rule); primary buttons filled, secondary outlined, destructive red; inline confirmation dialogs for delete/reject; toasts for success/failure; disabled states at 50% opacity.
Transitions: intent only — focus rings on interactives, hover states on buttons, skeleton-to-content swap on load, slide-in for dialogs, fade for toasts. Motion gated by prefers-reduced-motion (existing globals.css).

## Constraints and open decisions

Platform: web (Next.js 16 App Router, React 19, Tailwind 4, shadcn/radix).
Delivery: admin routes are never cached (per existing PWA config); SSR/server components for data, client components for forms.
Accessibility: five locales incl. Arabic RTL; 44px+ touch targets; focus-visible rings; honest empty/error states; system fonts only.
Localization: next-intl; en/de/fr/es/ar; field locales sw/ha pending but not admin scope.
Reusable components: the 24 existing admin components + shadcn/ui button/card/input/table/badge/dialog/sheet; no new primitives unless a flow demands one.
Open decisions (builder must not invent silently):
- Which three list/detail flows to prototype first (recommended: expenses, approval-inbox, donors)
- Whether the attention shell is a single global component or per-route variants
- Exact stat strip metrics per role (finance: budget variance; fundraiser: open pledges; program: active programs; M&E: indicator gaps; ED: money-in → outcomes)
- Whether row actions use a dropdown menu or inline buttons (consistency decision needed)
