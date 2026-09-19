# NGO OS — Command Center: Full NextJS Fullstack Migration & Build-Out

## Background & Objective

The project is transitioning from a **NextJS (frontend) + Golang (API)** architecture to a **NextJS fullstack-only** system, with Supabase as the backend-as-a-service layer. The Golang API contains 38 domain services and 36 HTTP route files — all of this logic must live in Next.js Server Actions and API Routes going forward.

The focus of this plan is **the Admin "Command Center"** — the internal tool that makes this NGO OS powerful enough for a massive international NGO while being lean enough for a solo operator. Think of it as a mission control: every capability (automations, workflows, IFTTT-style rules, scheduling, templates, RBAC, reporting, and more) must be fully accessible, composable, and production-grade.

---

## What Already Exists (✅ Working)

| Area | Status |
|------|--------|
| Supabase auth + session (`auth.ts`) | ✅ Working |
| Admin layout + sidebar (icon-nav, role guard) | ✅ Working |
| Command menu (Cmd+K, placeholder) | ✅ Partial |
| Workers CRUD + stats (Server Actions) | ✅ Working |
| Volunteers CRUD + hours log (Server Actions) | ✅ Working |
| Partners CRUD + stats (Server Actions) | ✅ Working |
| Donors CRUD + stats (Server Actions) | ✅ Working |
| Projects CRUD + stats (Server Actions) | ✅ Working |
| Campaigns CRUD + stats (Server Actions) | ✅ Working |
| Supabase schema (orgs, workers, volunteers, partners, donors, projects, campaigns, audit) | ✅ Done |
| Public website routes | ✅ Working |

---

## Security Architecture (Phase 1 + Phase 2 ✅)

| Layer | Mechanism | File |
|-------|-----------|------|
| Permission registry | Isomorphic `PERMISSIONS` + `ROLE_PERMISSIONS` (mirrors DB) | `src/lib/auth/permissions.ts` |
| Server Action guards | `authorizePermission()` / `authorizeUser()` on every action | `src/lib/auth/guards.ts` |
| Layout guards | `hasRole()` + `ADMIN_PANEL_ROLES` | `admin/layout.tsx`, `sidebar.tsx`, `proxy.ts` |
| Multi-org context | Active-org cookie + `getMyOrganizations()` / `switchActiveOrganization()` | `src/actions/organization.ts` |
| DB RLS (permission-aware) | `role_has_permission()` + `user_has_permission()` helpers; `USING` + `WITH CHECK` on all tables | `supabase/migrations/20240101000014_rls_policies.sql` |
| Org-ID immutability | `BEFORE UPDATE` trigger blocks `organization_id` changes | `supabase/migrations/20240101000015_org_protection.sql` |
| Content publish / expense approval gating | `BEFORE UPDATE` trigger requires `content.publish` / `finance.approve` | `supabase/migrations/20240101000016_approval_triggers.sql` |
| Storage isolation | Org-folder-scoped bucket policies (write needs manage; private read needs read) | `supabase/migrations/20240101000017_storage_policies.sql` |
| Public data safety | Narrow `public_campaigns` / `public_projects` / `public_partners` views + `public_impact_stats()` SECURITY DEFINER | `supabase/migrations/20240101000018_public_views.sql` |
| FK & index integrity | Missing FKs + org indexes on all tenant tables | `supabase/migrations/20240101000013_indexes_foreign_keys.sql` |
| Action gate | Static check: every Server Action guarded or allowlisted | `scripts/verify-action-auth.mjs` |
| RLS isolation tests | Cross-org + per-role assertions (owner/admin/manager/member) | `supabase/tests/rls-isolation-tests.sql` |

---

## What Needs to Be Built (The Command Center)

The Golang API has 38 domain services. The migration maps them to NextJS Server Actions + Supabase tables + NextJS App Routes. Below is the complete build plan grouped by Command Center section.

---

## User Review Required

> [!IMPORTANT]
> **Architecture Decision: Supabase-first vs. External Services**
> Several Golang services use external dependencies (Temporal for workflows, Redis for queues/realtime, Prometheus for metrics). For the NextJS fullstack approach, we will replace these with **Supabase-native equivalents** where possible, using Supabase's pg_cron for scheduling, Supabase Realtime for live updates, and Postgres functions/triggers for automation. For truly complex workflow orchestration, we can use a lightweight in-DB approach.

> [!WARNING]
> **Golang API Deprecation**
> The `apps/api` Golang service should NOT be deleted immediately. We'll build out the NextJS side fully and keep Golang running in parallel until all features are verified, then deprecate it. This plan does NOT touch `apps/api`.

> [!IMPORTANT]
> **Database Schema Expansion**
> The current Supabase schema covers ~8 tables. To match the full Go domain (38 services), we need ~25 additional tables. This migration plan includes all new schema SQL files.

---

## Open Questions

> [!IMPORTANT]
> **Q1: Real-time & Queues** — Should background job processing use Supabase pg_cron (simple, no infra) or an external queue like Inngest/Trigger.dev (more powerful)? I'll default to **pg_cron + Supabase Edge Functions** unless you want Inngest.

> [!IMPORTANT]  
> **Q2: Workflow Engine** — The Golang side uses Temporal for durable workflows. In NextJS fullstack, I'll implement a state-machine approach using a `workflow_instances` Postgres table + pg_cron triggers. Is that acceptable, or do you want to integrate with an external workflow engine (e.g., Inngest, Trigger.dev, Windmill)?

> [!IMPORTANT]
> **Q3: AI/IFTTT Automations** — The automation engine (IFTTT-style rules) — should triggers include AI-generated suggestions (e.g., "when donor hasn't donated in 90 days, suggest re-engagement email"), or keep it rule-based only for now?

---

## Proposed Changes

### Component 1: Database Schema (Supabase SQL)

All new tables were implemented and are now versioned as 18 ordered migrations in `apps/web/supabase/migrations/`. The original per-domain `schema-*.sql` files were consolidated into these migrations (archived in `apps/web/supabase/archive/`); the headings below map each proposed file to the migration that now contains its tables — see `apps/web/supabase/README.md` for the full migration map.

#### ✅ `schema-automations.sql` → `migrations/20240101000008_automations_workflows.sql`
Automations / IFTTT engine: `automation_rules`, `automation_executions`, `automation_templates`

#### ✅ `schema-workflows.sql` → `migrations/20240101000008_automations_workflows.sql`
Workflow state machine: `workflow_definitions`, `workflow_instances`, `workflow_steps` (`workflow_transitions` not implemented)

#### ✅ `schema-notifications.sql` → `migrations/20240101000007_notifications_integrations.sql`
Full notification system: `notification_templates`, `notifications`, `notification_preferences` (`notification_channels` not implemented)

#### ✅ `schema-forms.sql` → `migrations/20240101000010_public_forms_newsletter.sql`
Form intake: `form_submissions`, `newsletter_subscribers` (dedicated `forms` / `form_fields` tables not implemented)

#### ✅ `schema-integrations.sql` → `migrations/20240101000007_notifications_integrations.sql`
Third-party integrations: `integrations`, `webhooks`, `webhook_deliveries`

#### ✅ `schema-rbac-extended.sql` → `migrations/20240101000005_rbac_scheduling_reporting.sql`
Full RBAC: `custom_roles`, `role_assignments`, `permission_overrides` (extending existing `organization_members` roles)

#### ✅ `schema-content.sql` → `migrations/20240101000006_content_events_messaging_impact_finance.sql`
CMS: `content_pages`, `content_blocks`, `media_library` (`content_templates` not implemented)

#### ✅ `schema-events.sql` → `migrations/20240101000006_content_events_messaging_impact_finance.sql`
Organization events/calendar: `org_events`, `event_registrations` (`event_sessions` not implemented)

#### ✅ `schema-scheduling.sql` → `migrations/20240101000005_rbac_scheduling_reporting.sql`
Scheduler: `scheduled_jobs`, `job_executions` (backed by pg_cron)

#### ✅ `schema-reporting.sql` → `migrations/20240101000005_rbac_scheduling_reporting.sql`
Reports: `report_definitions`, `report_snapshots` (`report_executions` not implemented)

#### ✅ `schema-tags.sql` → `migrations/20240101000006_content_events_messaging_impact_finance.sql`
Tagging: `tags`, `tag_assignments`

#### ✅ `schema-messaging.sql` → `migrations/20240101000006_content_events_messaging_impact_finance.sql`
Internal messaging: `conversations`, `conversation_messages` (`message_attachments` not implemented)

#### ✅ `schema-impact.sql` → `migrations/20240101000006_content_events_messaging_impact_finance.sql`
Impact tracking: `impact_metrics`, `impact_measurements`, `impact_goals` (`impact_reports` not implemented)

#### ✅ `schema-financial-extended.sql` → `migrations/20240101000006_content_events_messaging_impact_finance.sql`
Financial: `budgets`, `budget_lines`, `expenses` (`income_sources`, `financial_periods` not implemented)

#### `schema-catalog.sql` — proposed, never implemented
Resource catalog: `catalog_items`, `catalog_categories`, `resource_requests`

---

### Component 2: Server Actions (Extended)

New action files in `apps/web/src/actions/`:

#### [NEW] `automations.ts`
- `getAutomationRules()` — list all automation rules
- `createAutomationRule(input)` — create IFTTT-style trigger/action pair
- `updateAutomationRule(id, input)` — update rule
- `toggleAutomationRule(id, enabled)` — enable/disable
- `deleteAutomationRule(id)` — delete
- `getAutomationExecutions(ruleId?)` — execution history
- `testAutomationRule(id)` — dry-run

#### [NEW] `workflows.ts`
- `getWorkflowDefinitions()` — list all workflow templates
- `createWorkflowDefinition(input)` — create multi-step workflow
- `getWorkflowInstances(filter?)` — running/completed instances
- `triggerWorkflow(definitionId, contextData)` — start instance
- `advanceWorkflowStep(instanceId, stepId, data)` — move to next step
- `getWorkflowInstance(id)` — full instance detail with step history

#### [NEW] `notifications.ts`
- `getNotifications(userId?)` — list notifications
- `markNotificationRead(id)` — mark read
- `getNotificationTemplates()` — manage templates
- `createNotificationTemplate(input)` — create template
- `sendNotification(input)` — send to user/org/role
- `getNotificationPreferences()` — user preferences
- `updateNotificationPreferences(prefs)` — update

#### [NEW] `forms.ts` (extends existing)
- `getForms()` — list all org forms
- `createForm(input)` — create custom form
- `updateForm(id, input)` — update form and fields
- `deleteForm(id)` — delete
- `getFormSubmissions(formId)` — all responses
- `getFormStats(formId)` — response analytics

#### [NEW] `integrations.ts`
- `getIntegrations()` — list connected integrations
- `connectIntegration(provider, config)` — connect OAuth/API key
- `disconnectIntegration(id)` — remove
- `getWebhooks()` — list webhook endpoints
- `createWebhook(input)` — register webhook
- `deleteWebhook(id)` — remove webhook
- `getWebhookDeliveries(webhookId)` — delivery history + status

#### [NEW] `rbac.ts`
- `getRoles()` — list all custom roles
- `createRole(input)` — create custom role
- `updateRole(id, input)` — modify permissions
- `deleteRole(id)` — delete
- `assignRole(userId, roleId)` — assign to user
- `getPermissions()` — full permission registry
- `getMemberPermissions(userId)` — effective permissions

#### [NEW] `scheduling.ts`
- `getScheduledJobs()` — list all scheduled jobs
- `createScheduledJob(input)` — cron or one-shot
- `updateScheduledJob(id, input)` — modify schedule
- `toggleScheduledJob(id, enabled)` — pause/resume
- `deleteScheduledJob(id)` — remove
- `getJobExecutions(jobId?)` — execution history

#### [NEW] `reporting.ts`
- `getReports()` — list report definitions
- `createReport(input)` — build custom report
- `runReport(id, params?)` — execute report
- `getReportSnapshots(reportId)` — saved results
- `exportReport(id, format)` — CSV/PDF export

#### [NEW] `content.ts`
- `getContentPages()` — CMS pages
- `createContentPage(input)` — new page
- `updateContentPage(id, input)` — edit
- `getContentTemplates()` — content templates
- `getMediaLibrary()` — org media assets
- `uploadMedia(file)` — to Supabase Storage

#### [NEW] `events.ts`
- `getEvents()` — org events
- `createEvent(input)` — create event
- `updateEvent(id, input)` — update
- `getEventRegistrations(eventId)` — attendee list
- `registerForEvent(eventId, data)` — register

#### [NEW] `tags.ts`
- `getTags()` — org tags
- `createTag(input)` — new tag
- `assignTags(entityType, entityId, tagIds)` — bulk tag
- `getTaggedEntities(tagId)` — entities with tag

#### [NEW] `messaging.ts`
- `getConversations()` — internal messages
- `createConversation(input)` — new thread
- `getMessages(conversationId)` — thread messages
- `sendMessage(conversationId, content)` — send

#### [NEW] `impact.ts`
- `getImpactMetrics()` — KPI metrics
- `createImpactMetric(input)` — define KPI
- `updateImpactMetric(id, value)` — log measurement
- `getImpactGoals()` — targets
- `getImpactSummary()` — public-facing summary

#### [NEW] `financial.ts` (extends donations)
- `getBudgets()` — budget plans
- `createBudget(input)` — new budget
- `getExpenses()` — expense records
- `createExpense(input)` — log expense
- `getFinancialSummary()` — P&L snapshot

#### [MODIFY] `index.ts`
Export all new action modules.

---

### Component 3: Admin Command Center Routes

New pages in `apps/web/src/app/[locale]/(admin)/`:

#### [NEW] `automations/page.tsx`
List of automation rules. Table with trigger/action/status/last-run. Enable/disable toggle. "New Rule" button.

#### [NEW] `automations/new/page.tsx`
Rule builder UI: Step 1 = Trigger (event, schedule, condition). Step 2 = Conditions (filters). Step 3 = Actions (send email, create task, update field, trigger webhook). Step 4 = Test & Save.

#### [NEW] `automations/[id]/page.tsx`
Rule detail: edit, execution history, stats.

#### [NEW] `workflows/page.tsx`
Workflow definitions list + active instances.

#### [NEW] `workflows/new/page.tsx`
Visual workflow builder (step-by-step form, not drag-and-drop for now).

#### [NEW] `workflows/[id]/page.tsx`
Definition detail + instance tracking.

#### [NEW] `scheduling/page.tsx`
Scheduler dashboard: all cron jobs, one-shot tasks, next run times, execution history.

#### [NEW] `scheduling/new/page.tsx`
Job builder: cron expression, action type, target, notifications.

#### [NEW] `reporting/page.tsx`
Report library. Saved reports + run history.

#### [NEW] `reporting/new/page.tsx`
Report builder: select entity, filters, grouping, metrics, date range.

#### [NEW] `reporting/[id]/page.tsx`
Report viewer: rendered results, export buttons, snapshot history.

#### [NEW] `integrations/page.tsx`
Integration marketplace. Available connectors (Stripe, Mailchimp, Twilio, Slack, etc.) + connected status.

#### [NEW] `integrations/webhooks/page.tsx`
Webhook manager: endpoints, events, delivery logs.

#### [NEW] `forms/page.tsx`
Form library: all org forms, response counts, status.

#### [NEW] `forms/new/page.tsx`
Form builder: add fields (text, number, select, file, signature, etc.), preview, publish.

#### [NEW] `forms/[id]/page.tsx`
Form detail: edit, submissions table, analytics.

#### [NEW] `notifications/page.tsx`
Notification center: templates, sent history, preferences.

#### [NEW] `notifications/templates/page.tsx`
Template manager: email/SMS/push templates, variables, preview.

#### [NEW] `content/page.tsx`
CMS: pages, blocks, templates, media library.

#### [NEW] `events/page.tsx`
Events calendar + list view.

#### [NEW] `events/new/page.tsx`
Event creation form.

#### [NEW] `impact/page.tsx`
Impact dashboard: KPIs, goals, progress bars, data entry.

#### [NEW] `rbac/page.tsx`
Permission management: roles list, permission matrix.

#### [NEW] `rbac/roles/[id]/page.tsx`
Role editor: assign permissions by module.

#### [NEW] `financial/page.tsx`
Financial overview: budgets, expenses, donations summary, P&L.

#### [NEW] `financial/budgets/page.tsx`
Budget management.

#### [NEW] `financial/expenses/page.tsx`
Expense tracker.

#### [NEW] `messaging/page.tsx`
Internal messaging center.

#### [NEW] `tags/page.tsx`
Tag manager.

#### [MODIFY] `settings/page.tsx`
Expand: org profile, branding, feature flags, security settings, billing.

---

### Component 4: Admin Sidebar & Navigation

#### [MODIFY] [`admin-sidebar.tsx`](file:///c:/Users/VENTIZ/apps/awe-system/apps/web/src/components/layout/admin/admin-sidebar.tsx)
Replace the current minimal 8-item icon sidebar with a **grouped, collapsible sidebar** with sections:
- **Overview** — Dashboard
- **People** — Workers, Volunteers, Partners, Donors
- **Programs** — Projects, Campaigns, Events, Impact
- **Operations** — Automations, Workflows, Scheduling, Forms
- **Finance** — Financial, Reporting
- **Communication** — Notifications, Messaging, Content
- **System** — Integrations, RBAC, Tags, Settings

#### [MODIFY] [`command-menu.tsx`](file:///c:/Users/VENTIZ/apps/awe-system/apps/web/src/components/layout/admin/command-menu.tsx)
Replace placeholder with full **cmdk**-powered command palette:
- Jump to any page
- Search workers/volunteers/donors/projects by name
- Run quick actions ("Create worker", "New campaign", etc.)
- Recent items

---

### Component 5: Shared Admin UI Components

New components in `apps/web/src/components/manage/` and `apps/web/src/components/admin/`:

#### [NEW] `automation-rule-builder.tsx`
Multi-step rule creation wizard with trigger/condition/action selectors.

#### [NEW] `workflow-builder.tsx`
Step-by-step workflow definition form.

#### [NEW] `cron-editor.tsx`
Human-readable cron expression editor with preview.

#### [NEW] `permission-matrix.tsx`
Role × Permission grid table.

#### [NEW] `report-builder.tsx`
Report query builder with field selector and filter builder.

#### [NEW] `form-builder.tsx`
Drag-and-drop (or ordered list) form field configurator.

#### [NEW] `notification-composer.tsx`
Template editor with variable insertion and channel selector.

#### [NEW] `impact-metric-card.tsx`
KPI card with sparkline, target, and update button.

#### [NEW] `integration-card.tsx`
Integration tile with connection status, configure/disconnect actions.

#### [NEW] `data-export-button.tsx`
Reusable export to CSV/JSON/PDF trigger.

---

### Component 6: Types & Lib

#### [NEW] `types/domain/automations.ts`
#### [NEW] `types/domain/workflows.ts`
#### [NEW] `types/domain/notifications.ts`
#### [NEW] `types/domain/forms.ts`
#### [NEW] `types/domain/integrations.ts`
#### [NEW] `types/domain/rbac.ts`
#### [NEW] `types/domain/scheduling.ts`
#### [NEW] `types/domain/reporting.ts`
#### [NEW] `types/domain/content.ts`
#### [NEW] `types/domain/events.ts`
#### [NEW] `types/domain/tags.ts`
#### [NEW] `types/domain/impact.ts`
#### [NEW] `types/domain/financial.ts`
#### [MODIFY] `types/index.ts` — export all new domain types

---

## Execution Order

1. **Database schema** — All new Supabase SQL files (run in sequence)
2. **Types** — Domain type definitions for new modules
3. **Server Actions** — All new action files (they depend on types)
4. **Admin Sidebar rebuild** — New navigation structure
5. **Command Palette upgrade** — Full cmdk implementation  
6. **Admin pages (wave 1)** — Automations, Workflows, Scheduling (highest-value)
7. **Admin pages (wave 2)** — RBAC, Forms, Notifications
8. **Admin pages (wave 3)** — Reporting, Integrations, Content, Events
9. **Admin pages (wave 4)** — Impact, Financial, Messaging, Tags
10. **Settings page expansion**

---

## Verification Plan

### Automated Tests
- `pnpm run build` — zero TypeScript errors
- `pnpm run lint` — zero lint warnings on new files

### Manual Verification
- Admin route guard: non-admin users redirect correctly
- Each new CRUD action tested in browser with real Supabase data
- Command palette searches return correct results
- Automation rule dry-run executes without error
- Role changes reflect in UI permissions immediately
- Scheduler UI correctly displays next-run times

---

## Key Design Principles

1. **Server Actions over API Routes** — All data operations use Next.js Server Actions for simplicity and type safety
2. **Supabase RLS everywhere** — Every table has Row Level Security policies tied to `organization_id`  
3. **No duplicate logic** — One source of truth per domain; admin and dashboard read from same actions
4. **Progressive disclosure** — Admin UI starts with essential info, advanced options behind expand/tabs
5. **Composable automations** — Triggers, conditions, and actions are separate entities that compose together
