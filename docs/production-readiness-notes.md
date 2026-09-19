**Production readiness status**

The home and About pages are structurally wired, but they are not production-ready yet. The largest gap is that the CMS currently claims multilingual publishing and approvals without implementing the underlying workflow.

## P0: Must be implemented

### 1. CMS localization model

Current state: translations are inferred from `content.translations` or `content.locales` inside JSON content. There is no schema, validation, editor, or lifecycle management.

Implement:

- A defined translation model, either:
  - `content_page_translations` table with one row per locale, or
  - a strictly typed JSON schema.
- Supported locale configuration from one source of truth.
- Per-locale fields for:
  - title
  - body/content blocks
  - metadata
  - alt text
  - CTA labels and links
  - taxonomy/category values
- Locale fallback rules.
- Missing-translation status.
- Translation completeness indicators.
- Draft/published state per locale.
- Translation versioning and audit history.
- Locale-aware preview.
- Locale-aware publish and unpublish.
- Protection against publishing untranslated or partially translated content.
- Validation of required fields and content shapes.
- Translation import/export.
- Translation ownership and assignment.
- Translation update timestamps.

Relevant files: `public.ts`, `content.ts`, `content.ts`, `20240101000006_content_events_messaging_impact_finance.sql`.

### 2. Implement the advertised CMS workflow

The admin page currently advertises:

- AI translation
- EN, DE, FR, ES, AR support
- Executive Director approval

But the visible AI translation button is not wired to an action, and the content model has no translation or approval fields.

Implement:

- AI translation action and provider configuration.
- Human review before publication.
- Approval states such as:
  - draft
  - translation_pending
  - in_review
  - changes_requested
  - approved
  - published
  - archived
- Approval history and approver identity.
- Permission checks for translation, review, and publishing.
- Notifications for review requests.
- Clear UI showing which locales are approved and published.
- Error handling for failed translations.
- Explicit warning that AI-generated text requires review.

Relevant file: content/page.tsx.

### 3. Localize all CMS-driven public data

Only `content_pages` currently receive locale resolution. These remain effectively untranslated:

- Campaigns
- Projects
- Partners
- Impact metrics
- Events
- Organization profile
- Financial document metadata
- Team categories and roles
- Any CMS links or CTA URLs containing text

The homepage currently mixes localized CMS content with nonlocalized database content in `page.tsx`.

Implement localized fields or translation records for every public entity used on the home/About pages.

### 4. Seed and verify production content

Production needs complete approved content for every locale:

- Homepage hero
- Homepage mission
- Homepage calls to action
- Testimonials
- Stories
- News
- Impact metrics
- Events
- About hero
- Mission and vision
- Values
- Theory of change
- Milestones
- Team members
- Board members
- Partners
- Financial documents
- Organization profile
- Legal and safeguarding content

Currently, many sections intentionally disappear when the database is empty. That is useful for development but not acceptable without verified production seed data.

### 5. Complete public content editing

The CMS list page exists, but production editing needs:

- Page creation
- Page editing
- Block editing
- Rich text support
- Image/media selection
- Alt text editing
- Page preview
- Draft preview links
- Publish/unpublish controls
- Archive/delete safeguards
- Slug validation
- Duplicate slug handling
- Content schema validation
- Per-page SEO fields
- Translation editing
- Revision history
- Restore previous version

The database includes `content_blocks` and `media_library`, but the public homepage currently reads mostly from the `content` JSON field rather than a real composable block system.

## P0: Data and workflow correctness

### 6. Verify public database projections in the live Supabase environment

The public pages depend on:

- `public_content_pages`
- `public_impact_metrics`
- `public_events`
- `public_partners`
- `public_organization`
- `public_impact_stats()`
- `public_financial_summary()`

These need live verification for:

- Correct organization scoping
- Published-only filtering
- Anonymous access
- No private columns exposed
- Correct financial totals
- Correct event filtering
- Correct impact metric visibility
- Correct default organization selection

The repository’s own task notes still show live RLS testing and remote migration reconciliation as pending.

### 7. Finish donation and form production flows

The public donation action currently creates a pending donation record. It does not constitute a complete payment flow.

Implement and verify:

- Payment provider integration
- Payment intent creation
- Webhook verification
- Idempotency
- Failed and refunded payments
- Receipts
- Tax receipt handling
- Recurring donations
- Donor consent
- Fraud/rate-limit protections
- Confirmation emails

Also complete:

- Newsletter double opt-in
- Unsubscribe handling
- Contact form notification routing
- Safeguarding escalation
- Spam protection
- Rate limiting
- Submission retention policy
- Success and failure states in every locale

Relevant file: `public.ts`.

## P1: Localization and internationalization

### 8. Complete and validate all locale files

The configured locales are:

- English
- German
- French
- Spanish
- Arabic

Implement automated checks for:

- Missing translation keys
- Extra unused keys
- Placeholder mismatches
- Interpolation mismatches
- Empty translations
- Accidental English fallback
- Invalid ICU syntax

Also verify all home/About components use translations instead of hardcoded text.

### 9. Complete Arabic and RTL support

The root layout sets `dir="rtl"` for Arabic, but production testing is still required for:

- Header and mobile navigation
- Hero layouts
- Timeline direction
- Carousels
- Icon placement
- Button ordering
- Forms
- Tables and financial figures
- Spacing and alignment
- Horizontal overflow
- Arabic font rendering

Relevant file: `layout.tsx`.

### 10. Locale-aware metadata

Implement:

- Localized page titles
- Localized descriptions
- CMS-provided `meta_title`
- CMS-provided `meta_description`
- Canonical URLs
- `hreflang` alternates
- Open Graph metadata
- Twitter metadata
- Locale-specific social images
- Correct organization/site metadata

The About page currently reads CMS content for metadata, but does not consistently use `meta_title`, canonical URLs, or alternate-language metadata.

### 11. Locale-aware formatting

Verify localized:

- Dates
- Numbers
- Currencies
- Percentages
- Financial ratios
- Event times and time zones
- Pluralization
- Decimal separators
- Currency display rules

The homepage currently uses fixed `en-US` formatting in `page.tsx`.

## P1: SEO and discoverability

### 12. Expand the sitemap

The sitemap currently contains only static routes in `sitemap.ts`.

Add localized entries for:

- CMS news pages
- Stories
- Team profiles
- Financial documents
- Campaigns
- Projects
- Program categories
- Program detail pages
- Any other published public content

Use actual `updated_at` values instead of the current date for every entry.

### 13. Add structured data

Implement appropriate JSON-LD for:

- Organization
- WebSite
- WebPage
- Article/news pages
- Event pages
- Breadcrumbs
- Donate/action pages

### 14. Fix public route and canonical strategy

Verify whether `public` should be part of the public URL or whether production URLs should be:

- `/en`
- `/en/about`
- `/en/about/team`

Then ensure navigation, sitemap, canonical URLs, redirects, and metadata all use the same strategy.

### 15. Add proper 404 and unpublished-content handling

Verify that:

- Missing CMS pages return `notFound()`
- Draft pages are never publicly accessible
- Archived pages are removed from sitemap
- Invalid locale routes return 404
- Missing translated content follows the documented fallback policy

## P1: Performance and resilience

### 16. Replace blanket `force-dynamic` where appropriate

The home and About routes currently use dynamic rendering. Define a deliberate strategy for:

- Static generation
- ISR
- On-demand revalidation after publishing
- Cache invalidation per locale
- Stale content behavior during CMS outages

Relevant routes include:

- public/page.tsx
- about/page.tsx
- team/page.tsx
- financials/page.tsx
- partners/page.tsx

### 17. Add loading and error states

Add route-level:

- `loading.tsx`
- `error.tsx`
- CMS outage fallback
- Partial-section failure handling
- Retry behavior
- Empty state messaging
- Monitoring for failed public queries

At present, many failed queries silently produce empty sections.

### 18. Validate image and media handling

Implement:

- CMS-managed image selection
- Image dimension validation
- Alt text requirements
- Focal point/crop handling
- Responsive image sizes
- Broken-image fallback
- Video poster images
- File type and file size restrictions
- Secure upload policies
- CDN configuration

The current image configuration only permits a small set of remote hosts in `next.config.ts`.

## P1: Accessibility and UX

### 19. Complete accessibility verification

Test every home/About route for:

- Keyboard navigation
- Focus visibility
- Screen-reader labels
- Heading hierarchy
- Landmark structure
- Form labels and error messages
- Carousel controls
- Mobile menu semantics
- Color contrast
- Reduced-motion behavior
- Alt text
- External-link announcements
- Arabic screen-reader behavior

### 20. Test responsive behavior

Verify:

- Small mobile widths
- Large desktop widths
- Long translated strings
- German compound words
- Arabic RTL layouts
- Empty and populated CMS states
- Many team members
- Many partners
- Long financial document titles
- Missing images
- Slow network conditions

## P1: Security, privacy, and governance

### 21. Sanitize CMS-rendered content

If rich text or HTML is introduced, sanitize it server-side and client-side. Define allowed tags, attributes, links, embeds, and media sources.

### 22. Complete public endpoint protections

Add:

- Rate limits
- Bot protection
- Abuse monitoring
- Request size limits
- Input validation with schemas
- Strict URL validation
- Submission throttling
- Audit logging for public submissions

### 23. Verify storage security

Confirm:

- Public and private buckets are separated
- Uploads are organization-scoped
- File extensions cannot spoof MIME types
- Private documents use signed URLs
- Financial documents are intentionally public
- Deleted CMS records do not leave unintended public files

### 24. Document privacy and retention

Define retention and access policies for:

- Donations
- Newsletter subscribers
- Contact forms
- Safeguarding reports
- Corporate inquiries
- Analytics
- Cookies
- Financial records

## P2: Testing and operational readiness

### 25. Add automated end-to-end tests

Cover every locale for:

- Homepage rendering
- About page rendering
- Team page
- Financials page
- Partners page
- Language switching
- Arabic RTL
- CMS fallback behavior
- Missing translations
- Published versus draft content
- Form submission
- Donation flow
- Mobile navigation
- Sitemap generation
- Metadata generation

### 26. Add content contract tests

Test that every CMS-managed page has valid content for its expected schema:

- `homepage-hero`
- `homepage-mission`
- `homepage-get-involved`
- `about-hero`
- `about-mission-vision`
- `about-values`
- `about-theory`
- `team_member`
- `milestone`
- `document`

### 27. Add production monitoring

Monitor:

- Public page errors
- CMS query failures
- Translation failures
- Missing translation rate
- Broken images
- Form failures
- Payment failures
- Slow server responses
- Core Web Vitals
- 404 rates
- Sitemap generation failures

### 28. Complete deployment verification

Before release:

- Apply and verify all Supabase migrations
- Run RLS isolation tests
- Reconcile the remote database
- Generate current database types
- Deploy Supabase Edge Functions
- Configure `CRON_SECRET`
- Configure payment and email secrets
- Configure production app URL
- Configure storage and CDN
- Configure domain and TLS
- Verify backups and rollback procedures

## Recommended release gate

The home and About pages should not be marked production-ready until these are complete:

1. CMS translations are modeled and editable.
2. Translation approval and publishing are real workflows.
3. Every supported locale has approved production content.
4. Public views and RLS have been tested against the live database.
5. Donation, newsletter, contact, and safeguarding flows work end to end.
6. Sitemap, metadata, canonical URLs, and structured data are complete.
7. Arabic RTL and accessibility testing pass.
8. Dynamic rendering, caching, revalidation, and outage behavior are defined.
9. E2E tests cover all supported locales.
10. Monitoring and production deployment configuration are in place.