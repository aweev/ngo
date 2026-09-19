I’ll scope this to the Programs surface only: overview, category pages, project detail pages, localization, CMS/data contracts, UX, SEO, accessibility, security, testing, and deployment. I’m first tracing the existing Programs routes and their data sources so the result distinguishes what already exists from what must still be built.

Searched for files matching `**/src/app/[locale]/public/programs/**`, no matches

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Read , lines 1 to 260

Read , lines 1 to 80

The Programs surface already has a three-level product shape in the type layer: overview, category, and project detail. The main risk is that the UI model is richer than the current public data contract, so I’m checking each route and component now to identify where the “advanced” experience is only represented as types or static copy rather than backed by production data.

Read 

Read 

Read 

Read 

Read 

Searched for text `getPublicProjectsByCategory|getPublicProjectBySlug` (`**/src/actions/public.ts`), 2 results

No matches found. Your search pattern might be excluded completely by either the search.exclude settings or .*ignore files.
If you believe that it should have results, you can check into the .*ignore files and the exclude setting (here are some excluded patterns for reference:[**/node_modules,**/bower_components,**/*.code-search]).
Then if you want to include those files you can call the tool again by setting "includeIgnoredFiles" to true.

Read 

Read 

Read 

Read 

The audit found several concrete blockers specific to Programs: internal links omit the `public` route prefix in key components, category stats are still development-only placeholders, project detail fields such as lead/updates/volunteer needs are fabricated or empty, and project descriptions are rendered with unsanitized HTML. I’m checking the public project projection once more, then I’ll give you the full build sequence and release gates.

Searched for regex `CREATE VIEW public_projects|public_projects` (`**/supabase/migrations/**`), 3 results

Searched for regex ``href={`/programs|href="/programs|href={`/get-involved|href="/get-involved`` (`**/src/components/programs/**`), 10 results

Read 

Read 

Read 

# Programs Production Plan

Scope: `/[locale]/public/programs`, category pages, and project detail pages only.

Current implementation already has:

- Programs overview page
- Four categories
- Category project grids
- Project detail route
- Donation, volunteer, and application CTAs
- Progress and funding UI
- Five supported locales
- Supabase public project queries

However, several parts are still placeholders or unsafe for production.

## 1. Fix the route foundation first

### Current blockers

Several Programs links point to routes without the `public` prefix:

- `pillars-grid.tsx`
- `projects-grid.tsx`
- `category-hero.tsx`
- `project-header.tsx`
- `category-cta.tsx`
- `action-sidebar.tsx`

Examples currently generated:

```text
/en/programs/education
/en/programs/education/project
/en/get-involved/donate
```

Actual routes are under:

```text
/en/public/programs/education
/en/public/programs/education/project
/en/public/get-involved/donate
```

### Required work

- Standardize all Programs links.
- Use route helpers instead of manually concatenating paths.
- Add typed helpers such as:
  - `programsPath(locale)`
  - `programCategoryPath(locale, category)`
  - `projectPath(locale, category, slug)`
  - `donationPath(locale, projectId)`
  - `volunteerPath(locale, category)`
- Add tests that every CTA resolves to an existing route.
- Add redirects if old URLs may already be indexed.

### Acceptance criteria

- Every breadcrumb works.
- Every project card opens the correct detail page.
- Donate and volunteer CTAs open valid localized routes.
- Language switching preserves the current Programs page.
- No `/en/programs/*` links remain unless intentionally supported.

---

# 2. Define the Programs information architecture

## Overview page

Route:

```text
/[locale]/public/programs
```

Purpose:

- Explain the overall program model.
- Introduce the four program pillars.
- Show organization-wide impact.
- Direct visitors into categories and projects.

Required sections:

1. Hero
2. Program model introduction
3. Four program pillars
4. Theory of change
5. Organization-wide impact
6. Featured projects
7. Stories or evidence
8. Volunteer/donate CTA
9. Breadcrumbs and related navigation

## Category page

Routes:

```text
/[locale]/public/programs/education
/[locale]/public/programs/health
/[locale]/public/programs/economic-empowerment
/[locale]/public/programs/social-integration
```

Purpose:

- Explain the problem.
- Describe the intervention.
- Show category-level results.
- List projects.
- Provide category-specific calls to action.

Required sections:

1. Breadcrumb
2. Category hero
3. Challenge/problem statement
4. AWE solution/intervention
5. Category impact metrics
6. Active projects
7. Completed projects
8. Coordinator or program lead
9. Related stories
10. Volunteer/donate CTA

## Project detail page

Route:

```text
/[locale]/public/programs/[category]/[slug]
```

Purpose:

- Explain one project clearly.
- Show measurable progress.
- Give visitors meaningful actions.
- Provide transparency and updates.

Required sections:

1. Breadcrumb
2. Project hero
3. Status and location
4. Project summary
5. Objectives
6. Beneficiary information
7. Timeline
8. Funding/progress
9. Results and indicators
10. Updates
11. Project lead
12. Volunteer action
13. Donation action
14. Related projects
15. Related stories
16. Share metadata

---

# 3. Establish the data model

The current `domain-adapters.ts` defines a rich project model, but the public Supabase projection currently does not provide enough information to populate it reliably.

The current detail page fabricates or defaults several fields:

- Project lead
- Lead avatar
- Volunteer needs
- Updates
- End date
- Funding
- Description structure

This happens in the project route and must be removed before launch.

## Required project fields

Every public project should support:

- `id`
- `organization_id`
- `name`
- `slug`
- `category`
- `status`
- `visibility`
- `summary`
- `description`
- `objectives`
- `location`
- `city`
- `country`
- `cover_image_url`
- `gallery_urls`
- `start_date`
- `end_date`
- `application_deadline`
- `beneficiaries_target`
- `beneficiaries_reached`
- `progress`
- `budget`
- `spent`
- `currency`
- `is_public`
- `published_at`
- `updated_at`

## Additional related data

Create or expose safe public projections for:

### Project objectives

```text
project_objectives
```

Fields:

- title
- description
- target
- current value
- unit
- status
- sort order

### Project updates

```text
project_updates
```

Fields:

- project ID
- title
- slug
- body
- cover image
- published date
- author
- locale
- status

### Project team

Either use an existing worker/team relationship or add:

```text
project_team_members
```

Fields:

- project ID
- person ID
- role
- public visibility
- sort order

### Project indicators

```text
project_indicators
project_indicator_measurements
```

Fields:

- indicator name
- baseline
- target
- current value
- unit
- measurement date
- verification status
- public visibility

### Project applications

If applications are supported:

```text
project_applications
```

Fields:

- project ID
- applicant information
- consent
- locale
- status
- created date
- reviewer
- audit history

---

# 4. Create public-safe Supabase projections

The current project projection is in `20240101000018_public_views.sql`.

Create separate views or RPCs for:

- `public_program_categories`
- `public_projects`
- `public_project_details`
- `public_project_updates`
- `public_project_indicators`
- `public_project_team`
- `public_related_projects`

Every public view must:

- Scope data to `public_default_org_id()`.
- Expose published/public records only.
- Hide private notes.
- Hide internal IDs where unnecessary.
- Hide unpublished projects.
- Hide donor and beneficiary personal data.
- Hide internal budget notes.
- Hide private staff details.
- Avoid exposing storage internals.
- Have explicit grants for `anon` and `authenticated`.

## Required query behavior

### Overview

Return:

- Category summaries
- Featured projects
- Aggregate metrics
- Published stories

### Category

Return:

- Projects by normalized category
- Category metrics
- Category coordinator
- Category stories

### Detail

Return:

- One published project
- Objectives
- Indicators
- Updates
- Public team members
- Related projects
- Related stories

---

# 5. Replace development fallbacks

The following are not production-ready:

- Development-only fake metrics in `page.tsx`
- Development-only fake projects in `page.tsx`
- Development-only fake project details in `page.tsx`
- Unsplash images used as real program imagery
- Hardcoded coordinator data
- Empty updates arrays
- Default “Program Manager” lead
- Default dates
- Default funding values

Required replacement:

- Use real CMS or database records.
- Display an intentional empty state when data is missing.
- Do not show fictional statistics.
- Do not show stock images as if they represent actual beneficiaries or projects.
- Fail safely if the database is unavailable.

---

# 6. Build the CMS authoring workflow

Programs need an admin workflow for content editors.

## Program category management

The admin must be able to manage:

- Category title
- Hero image
- Hero lead
- Challenge statement
- Solution statement
- Category color/theme
- Category ordering
- Coordinator
- Category SEO
- Translations
- Publication state

## Project management

The admin must be able to:

- Create a project
- Edit project content
- Select its category
- Set status
- Set public visibility
- Upload images
- Add objectives
- Add indicators
- Add updates
- Assign a lead
- Assign team members
- Set funding details
- Set volunteer needs
- Set application deadline
- Preview the public page
- Publish/unpublish
- Archive the project

## Editorial states

Use a real state machine:

```text
draft
in_review
changes_requested
approved
published
archived
```

For each locale:

```text
translation_missing
translation_draft
translation_in_review
translation_approved
translation_published
```

Publishing a project must not automatically publish incomplete translations.

---

# 7. Implement CMS localization properly

The current public localization logic in `public.ts` reads ad hoc `content.translations` JSON. That is not enough for a production CMS.

## Required translation behavior

Each category and project needs localized:

- Name
- Summary
- Description
- Objectives
- Challenge
- Solution
- CTA labels
- Location labels where appropriate
- Image alt text
- SEO title
- SEO description
- Updates
- Indicators
- Coordinator biography
- Volunteer requirements

## Locale support

Current supported locales:

- `en`
- `de`
- `fr`
- `es`
- `ar`

Add:

- Translation completeness status
- Fallback locale
- Per-locale publishing
- Translation review
- Missing-content warnings
- Import/export
- AI translation draft generation
- Human approval

## Translation fallback policy

Define and document:

1. Requested locale content
2. Base English content
3. Approved fallback content
4. Empty state

Do not silently mix languages within one page without indicating that fallback occurred.

---

# 8. Improve the overview design

The current overview is in:

- `page.tsx`
- `holistic-hero.tsx`
- `pillars-grid.tsx`
- `theory-strip.tsx`
- `impact-dashboard.tsx`

## Design requirements

### Hero

- Use an approved organization-owned image or video.
- Add a meaningful alt/fallback strategy.
- Avoid presenting stock photography as documentary evidence.
- Keep the main CTA visible without scrolling.
- Add a secondary CTA to browse categories.
- Support reduced motion.
- Ensure text works in Arabic and German.
- Add visible focus states.

### Pillars

- Use CMS-managed category images.
- Make all cards accessible by keyboard.
- Do not rely on hover to reveal essential information.
- Show descriptions by default on mobile.
- Keep cards equal height.
- Add category status or project count.
- Use localized category names.
- Add a clear selected/active state where relevant.

### Impact

- Use verified metrics only.
- Show metric definitions.
- Include measurement date.
- Include data source or verification label.
- Avoid showing zero values as if they were meaningful.
- Format numbers by locale.
- Add a “last updated” value.

### Theory of change

- Make it CMS-editable.
- Include accessible semantic structure.
- Provide a text equivalent for visual diagrams.
- Ensure it does not rely solely on animation.

---

# 9. Improve category pages

The current category route is `page.tsx`.

## Required changes

- Replace hardcoded hero image mappings with CMS data.
- Replace `getStats()` development fallback.
- Add real category-level aggregation.
- Include only published projects.
- Support project filtering:
  - active
  - recruiting
  - completed
  - planning
- Add sorting:
  - newest
  - recently updated
  - location
  - status
- Add pagination or cursor loading for large project sets.
- Add clear empty states.
- Add “load more” behavior if needed.
- Add related stories.
- Add category-specific metadata.
- Add breadcrumbs with correct localized URLs.
- Add canonical URL.
- Add alternate locale links.

## Category statistics

Compute from real data:

- Active projects
- Completed projects
- Beneficiaries reached
- Beneficiaries targeted
- Countries or locations
- Funds deployed
- Volunteers involved
- Completion rate
- Last updated date

Every metric needs:

- Definition
- Unit
- Time period
- Data source
- Verification status

---

# 10. Improve project detail pages

The current detail route is `page.tsx`.

## Required changes

### Routing

- Confirm the project exists.
- Confirm it belongs to the requested category.
- Return `notFound()` if the category does not match.
- Return `notFound()` for drafts and archived projects.
- Prevent slug collisions across organizations.
- Add localized slug strategy if required.

### Header

The project header should show:

- Project title
- Category
- Status
- Location
- Start/end dates
- Last updated date
- Cover image
- Share actions
- Breadcrumbs

### Description

Do not render raw database HTML with:

```tsx
dangerouslySetInnerHTML
```

Sanitize rich text using an allowlist or render structured blocks/Markdown safely.

Allow only approved:

- Headings
- Paragraphs
- Lists
- Links
- Quotes
- Images
- Tables
- Embeds

Reject:

- Scripts
- Inline event handlers
- Unsafe URLs
- Arbitrary iframes
- Inline styles

### Progress

The current progress tracker in `progress-tracker.tsx` needs:

- Localized phase labels
- Correct handling of zero goals
- Correct handling of overfunding
- Currency formatting
- Accessible progress semantics
- Text equivalent for visual progress
- Measurement date
- Funding source label
- Verified/unverified status
- Real project phases instead of fixed phases where needed

### Objectives and results

Add:

- Objective cards
- Target versus current values
- Measurement dates
- Progress percentages
- Notes and methodology
- Data verification status

### Updates

Replace the current empty `updates: []` with real CMS updates.

Each update should support:

- Title
- Date
- Body
- Image
- Author
- Locale
- Related indicator
- Published state
- Share metadata

### Related projects

Replace:

```tsx
projects={[]}
```

with an actual related-project query.

Related-project rules should consider:

- Same category
- Similar location
- Shared tags
- Similar beneficiaries
- Exclude current project
- Only published records

### Lead and team

Replace default lead data with real public staff records.

Required:

- Name
- Role
- Photo
- Biography
- Public contact method or contact form
- LinkedIn only when approved
- Privacy controls

---

# 11. Complete the action flows

## Donation

Project donations must:

- Preserve project ID
- Preserve category
- Use a payment provider
- Support one-time and recurring donations
- Show project-specific confirmation
- Prevent duplicate submissions
- Support failed payments
- Support refunds
- Send receipts
- Track attribution
- Respect donor privacy

## Volunteer

Project volunteer actions must:

- Preserve project ID
- Preserve category
- Show current requirements
- Validate availability
- Support locale
- Confirm submission
- Notify the correct program team
- Prevent spam
- Store consent
- Provide a privacy notice

## Project application

The `/apply` route should not exist only as a link. Implement:

- Application form
- Eligibility requirements
- Deadline validation
- File upload rules
- Consent
- Confirmation email
- Review queue
- Duplicate application prevention
- Status tracking
- Admin review permissions
- Audit trail

If applications are not ready, hide the CTA instead of linking to an incomplete route.

---

# 12. SEO implementation

## Overview

Add:

- Localized title
- Localized description
- Canonical URL
- `hreflang`
- Open Graph image
- Twitter metadata
- Organization JSON-LD
- WebSite JSON-LD

## Category

Add:

- Category-specific title
- Category-specific description
- Breadcrumb JSON-LD
- Category image metadata
- Published project count
- Canonical URL
- `hreflang`

## Project detail

Add:

- Project title and summary
- `Article` or `WebPage` JSON-LD
- Image metadata
- Published date
- Updated date
- Breadcrumb JSON-LD
- Canonical URL
- `hreflang`
- `noindex` for drafts and archived content

## Sitemap

Update `sitemap.ts` to include:

- Overview page
- Category pages
- Published project pages
- Published project updates if routable
- Every supported locale
- Actual `updated_at` values

---

# 13. Accessibility requirements

Test all Programs routes for:

- WCAG 2.2 AA compliance
- Keyboard-only navigation
- Visible focus states
- Skip link
- Correct heading hierarchy
- Semantic landmarks
- Accessible breadcrumbs
- Accessible cards
- Accessible status badges
- Accessible progress bars
- Screen-reader-friendly metrics
- Form labels
- Error summaries
- Reduced motion
- Touch target sizes
- Color contrast
- No hover-only information
- Arabic RTL behavior

Specific fixes likely needed:

- Pillar descriptions cannot appear only on hover.
- Scroll control should be a real button, not a clickable `div`.
- Progress bars need `role="progressbar"`.
- Status labels need localized accessible text.
- Icon-only controls need labels.
- External links need appropriate announcements.

---

# 14. Responsive and international UX

Test:

- 320px mobile width
- 375px mobile width
- Tablet
- Desktop
- Large desktop
- Long German text
- Arabic RTL
- Missing images
- Very long project names
- Large funding numbers
- Projects with no updates
- Projects with many updates
- Projects with no funding
- Projects with zero beneficiaries
- Completed projects
- Recruiting projects
- Archived projects

Verify:

- No horizontal overflow
- No clipped headings
- No overlapping CTA buttons
- Correct RTL icon placement
- Correct breadcrumb direction
- Correct card heights
- Stable image dimensions
- Stable loading layouts

---

# 15. Error, loading, and empty states

Add Programs-specific:

- `loading.tsx`
- `error.tsx`
- `not-found.tsx`

Handle:

- Supabase unavailable
- Missing project
- Missing category
- Missing translation
- Missing image
- No projects
- No metrics
- No updates
- Failed form submission
- Failed donation
- Expired application deadline

Do not silently convert all failures into empty content.

Display useful but non-sensitive messages, and log technical details server-side.

---

# 16. Performance and caching

Define caching intentionally.

Recommended approach:

- ISR for overview and category pages.
- ISR for published project detail pages.
- On-demand revalidation after CMS publication.
- Revalidate only the affected locale and route.
- Cache public Supabase queries where appropriate.
- Avoid `force-dynamic` unless required.
- Use `generateStaticParams()` for known categories and published projects if practical.
- Use responsive image sizes.
- Lazy-load below-the-fold media.
- Avoid loading all project updates on the first request.
- Add pagination for large datasets.

---

# 17. Security and privacy

Verify:

- Anonymous users only see published projects.
- Organization scoping is enforced at database level.
- Draft projects cannot be fetched by slug.
- Archived projects are excluded.
- Private staff information is not exposed.
- Beneficiary personal data never reaches public views.
- Project budget notes remain private.
- Public forms are rate-limited.
- Uploaded media is validated.
- Rich content is sanitized.
- External links are validated.
- Application files use private storage and signed URLs.
- Public financial values are intentionally disclosed.

Run cross-organization RLS tests specifically for:

- Projects
- Project updates
- Project indicators
- Team assignments
- Applications
- Media

---

# 18. Analytics and observability

Track:

- Programs overview viewed
- Category viewed
- Project viewed
- Project CTA clicked
- Donation CTA clicked
- Volunteer CTA clicked
- Application started
- Application submitted
- Language selected
- Project share clicked
- Search/filter usage
- Translation fallback usage
- CMS publish failures
- Public query failures
- Broken image errors

Monitor:

- Page response times
- Core Web Vitals
- 404s
- Missing project slugs
- Donation errors
- Form errors
- Translation completeness
- Broken links
- Database query latency

Do not send sensitive application or beneficiary data to analytics.

---

# 19. Testing plan

## Unit tests

Test:

- Category validation
- Status mapping
- Funding percentage calculation
- Zero funding goal
- Overfunding
- Date formatting
- Locale fallback
- Related project selection
- Public content sanitization
- Slug validation

## Integration tests

Test:

- Public project view
- Category filtering
- Published-only filtering
- Organization isolation
- Project update retrieval
- Translation retrieval
- Donation attribution
- Volunteer attribution
- Application submission
- Revalidation after publication

## End-to-end tests

For every locale:

- Open Programs overview.
- Open each category.
- Open a project.
- Switch locale.
- Use breadcrumbs.
- Click donation CTA.
- Click volunteer CTA.
- Submit a valid form.
- Submit invalid data.
- Verify missing project returns 404.
- Verify draft project is unavailable.
- Verify mobile navigation.
- Verify Arabic RTL.
- Verify keyboard navigation.
- Verify metadata and canonical URLs.

## Visual regression tests

Capture:

- Overview desktop/mobile
- Category desktop/mobile
- Project detail desktop/mobile
- Empty category
- Long project title
- Arabic project page
- Completed project
- Recruiting project
- No-image project
- Large funding number

---

# 20. Production content checklist

Before launch, populate and approve:

## Overview

- Hero copy
- Hero image
- Program model
- Four category descriptions
- Theory of change
- Verified impact metrics
- Overview SEO metadata

## Each category

- Category title
- Hero image
- Challenge
- Solution
- Metrics
- Coordinator
- At least one published project
- Category SEO metadata
- All supported translations

## Each project

- Title
- Summary
- Description
- Objectives
- Location
- Status
- Dates
- Cover image
- Alt text
- Beneficiary information
- Funding information
- Lead
- Updates
- CTA configuration
- SEO metadata
- All supported translations

---

# Recommended implementation order

1. Fix `public` route links.
2. Define the final Programs content model.
3. Add database migrations and public views.
4. Generate updated Supabase types.
5. Replace fake development data.
6. Build category CMS management.
7. Build project CMS management.
8. Build project objectives, indicators, updates, and team data.
9. Implement proper localization and approval workflow.
10. Replace unsafe HTML rendering.
11. Implement real related-project queries.
12. Implement donation, volunteer, and application flows.
13. Add loading, error, empty, and not-found states.
14. Add localized metadata and structured data.
15. Expand the sitemap.
16. Add accessibility and RTL fixes.
17. Add caching and revalidation.
18. Add unit, integration, E2E, and visual tests.
19. Seed and approve production content.
20. Run live Supabase, RLS, storage, payment, and deployment checks.

## Final production gate

Programs is production-ready only when:

- All links resolve under the correct localized `public` routes.
- No fake metrics, stock project claims, or development fallbacks remain.
- Every public project comes from approved CMS/database data.
- Project details are category-correct and published-only.
- Rich content is sanitized.
- Translations are editable, reviewed, and independently publishable.
- Donations, volunteering, and applications work end to end.
- Metadata, sitemap, canonical URLs, and structured data are complete.
- Arabic RTL and accessibility tests pass.
- RLS and public views pass live isolation tests.
- Caching and CMS revalidation are verified.
- Monitoring, backups, and rollback procedures are configured.