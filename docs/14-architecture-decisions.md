# 14 — Architecture Decision Records (ADR)

Decisions that change the direction set by earlier docs. **Append-only** — a
superseding decision adds a new ADR and annotates the old one; nothing is
rewritten. Numbering is `ADR-NNNN`, monotonic.

---

## ADR-0001 — Keep and invest in automations, workflows, and custom RBAC (supersedes the Phase-4 "cut the bloat" delete list)

- **Status:** Accepted
- **Date:** 2026-11-03
- **Supersedes:** `ARCHITECTURAL_REVIEW.md` §3.2 "Decisions for Phase 4" rows
  for *automations/workflows* and *RBAC builder + role-requests*, and
  `docs/12-roadmap.md` §"Later — Phase 4: cut the bloat".
- **Affects:** `supabase/functions/automation-engine`, `cron-runner`,
  `automation_rules` / `automation_templates` / `automation_executions`,
  `workflow_definitions` / `workflow_instances`, `custom_roles` /
  `role_assignments`, `/admin/rbac`.

### Context

The 2026-10-11 review proposed cutting breadth to protect the core. Its Phase-4
list marked the IFTTT automation engine, the multi-step workflow engine, and the
custom-RBAC builder for deletion, on the grounds that "custom roles are used by
<5% of orgs" and that the three rule engines should collapse into
`scheduled_jobs`.

That thesis optimises for code-surface cleanliness. It does not address the
product's actual pain: NGO staff lose their week to manual, repetitive
coordination — approvals, donor follow-up, volunteer onboarding, cross-team
handoffs. The event/automation substrate is how the product removes those
bottlenecks, and it is ~90% built: the rule engine, condition operators,
actions, transactional outbox, durable dispatcher, dead-lettering, and a
template/instantiate pattern already exist and are tested.

Deleting a nearly-complete differentiator to shrink a table count is the wrong
trade for this market.

### Decision

1. **Keep and invest in** the automation engine, the workflow engine, and
   custom RBAC (roles + assignments). They are core, not bloat.
2. **Do not** collapse automations/workflows into `scheduled_jobs`.
   `scheduled_jobs` stays the *time* trigger; automations stay the *event* and
   *condition* triggers; workflows stay the *multi-step human* chain. They
   compose — an automation action may `start_workflow`.
3. **Finish the event spine** (Slice A): emit domain events, route the
   transactional outbox to the automation engine, and let alert templates
   target recipients by role — so a large donation alerts the executive
   director end to end.
4. Still valid from Phase 4 and **not** overturned here: campaigns/events →
   `projects.kind`, tags removal, AI-copilot removal, governance/HR/reviews
   extraction, workers/volunteers merge, heavy public-site dependency removal.

### Consequences

- **Additive.** No schema removal and no data migration required. Existing
  `scheduled_jobs`, templates, and executions keep working.
- **New obligation.** The event spine becomes a supported surface: producers
  (`enqueueOutboxEvent`) and consumers (`cron-runner` → `automation-engine`)
  must stay wired. `pnpm verify:reliability` guards this at build time.
- **Docs.** `docs/12-roadmap.md` decision log updated; `ARCHITECTURAL_REVIEW.md`
  §3.2 / §5.4 annotated as superseded in part.

### Event spine (target architecture)

```
domain mutation ── enqueueOutboxEvent() ──▶ outbox_events
                                               │  (claim_outbox_events, leases)
                                               ▼
                                          cron-runner  (every minute)
                                     ┌─────────┴──────────┐
                                     ▼                    ▼
                            webhook-delivery        automation-engine
                          (external subscribers)  (conditions → actions:
                                                   notify / webhook /
                                                   start_workflow)
```

- **Producers (today):** `donation.completed` (Stripe webhook),
  `volunteer.created` (`src/actions/volunteers.ts`), plus the pre-existing
  `reporting.snapshot_created`, `messaging.message_sent`,
  `content.page_locale_published`.
- **Recipient resolution:** a `send_notification` action resolves its audience
  from `config.recipient_id`, else `config.recipient_role` (fans out to every
  member with that base role — e.g. `owner` = executive director), else
  `config.recipient_email`. Copy supports `{{payload.path}}` interpolation.

### Delivery log

- **Slice A (2026-11-03):** event spine connected — `donation.completed` /
  `volunteer.created` producers, outbox → `automation-engine` routing,
  role-targeted notification recipients, `{{payload}}` interpolation, and the
  seeded "Large gift alert" template retargeted at the executive director.
- **Slice B (2026-11-03):** unified starter-template gallery at
  `/admin/templates` — one UX, two catalogs: role permission presets and
  automation bundles (incl. a `start_workflow` major-donor stewardship chain).
  Backed by `src/lib/presets.ts` (structure/data) and `src/actions/presets.ts`
  (server-side resolution → custom role, or rule + optional workflow).
- **Slice C (2026-11-03):** role-adaptive "Morning briefing" rendered at the top
  of `/dashboard` and `/admin` — the "needs your attention" queue is computed
  from the caller's EFFECTIVE permissions (failed automations, workflows
  awaiting action, unread notifications, access requests, expenses to approve,
  field reports to verify). `src/actions/briefing.ts` + `MorningBriefing`. Adds a
  `paused_automations` queue so an installed-but-disabled bundle (e.g. the
  major-donor stewardship chain) surfaces as "review this"; gating is covered by
  `src/actions/briefing.test.ts`.
- **Slice C+ (2026-11-03):** enable-path polish at `/admin/templates` — a bundle
  now opens a read-only review dialog (`previewAutomationBundle`) showing the
  trigger, conditions, actions and workflow steps, with two explicit choices:
  "Install (disabled)" or "Install & activate" (`applyAutomationBundle({
  activate: true })` lands the rule enabled and its workflow chain active).
- **Spine contract fix (2026-11-03):** `postSibling` now sends the
  `x-cron-secret` header every function actually checks (it previously sent only
  `apikey`/`Authorization`, so every sibling call 401'd and **no outbox event
  could ever be delivered**), and `20261103000002_fix_schedule_cron_runtime.sql`
  re-points the pg_cron installer at the live function contracts —
  `webhook-delivery` gains a claim-based GET drain for engine-queued hooks, the
  dispatcher is driven by GET, and the vestigial `automation-engine` poller is
  retired. `verify:reliability` now locks both contracts.
- **Function type gate (2026-11-03):** type-checking the edge functions surfaced a
  real outage — `notification-dispatcher`'s doc block was never closed, so its
  `import` statements sat inside the comment and every helper (`jsonResponse`,
  `requireCronSecret`, `serviceClient`, `logEvent`, `nextAttemptIso`) was
  undefined at runtime; the grep-based reliability check had even matched
  `requireCronSecret` inside that dead import. Fixed, and
  `pnpm verify:functions` (`tsconfig.functions.json` + `deno-edge-shim.d.ts`)
  now type-checks `supabase/functions` as part of `pnpm verify`, because those
  files are excluded from the Next.js tsconfig and no other gate parses them.
  Running the real `deno check` (Deno 2.9) also proved
  `crypto.subtle.timingSafeEqual` **does not exist**, so `requireCronSecret`'s
  "timing-safe" branch was dead code and the shared secret was compared with a
  plain `!==`; it now uses an explicit constant-time byte comparison.
- **Gate hardening (2026-11-03):** that one-off verification is now permanent.
  `pnpm verify:functions` runs the authoritative `deno check` in CI
  (`denoland/setup-deno@v2`, with `REQUIRE_DENO=1` so a missing binary fails
  loudly) and falls back to `tsc -p tsconfig.functions.json` locally.
  `pnpm test:runtime` (`scripts/run-runtime-tests.mjs`) applies the runtime
  migration to a real database inside a transaction that always rolls back, then
  asserts the claim RPC and the pg_cron job contract
  (`supabase/tests/schedule-runtime-shims.sql` + `-tests.sql`); CI runs it on the
  same Supabase stack as the RLS suite.
