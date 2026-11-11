---
name: AWE System
description: NGO operating system — donor money to proven community impact, with full transparency
colors:
  primary: "#D95D39"
  secondary: "#1D2129"
  accent: "#F0A202"
  neutral-bg: "#F9F8F6"
  neutral-fg: "#1D2129"
  card-bg: "#FFFFFF"
  muted-bg: "#F2F2F0"
  muted-fg: "#65676B"
  destructive: "#dc2626"
  destructive-fg: "#FFFFFF"
  border: "#e5e7eb"
  input: "#e5e7eb"
  ring: "#D95D39"
typography:
  display:
    fontFamily: "Georgia, \"Times New Roman\", \"Noto Serif\", serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: "1.1"
    letterSpacing: "0em"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "1.5"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, \"Segoe UI\", Roboto, \"Helvetica Neue\", Arial, \"Noto Sans\", sans-serif"
    fontSize: "14px"
    fontWeight: 500
    lineHeight: "1.5"
    letterSpacing: "0em"
rounded:
  sm: "0.375rem"
  md: "0.5rem"
  lg: "0.75rem"
spacing:
  sm: "0.5rem"
  md: "1rem"
  lg: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.md}"
    padding: "0.6875rem 1rem"
    size: "h-11 px-4 py-2"
  button-destructive:
    backgroundColor: "{colors.destructive}"
    textColor: "{colors.destructive-fg}"
    rounded: "{rounded.md}"
    padding: "0.6875rem 1rem"
  button-outline:
    backgroundColor: "{colors.neutral-bg}"
    textColor: "{colors.neutral-fg}"
    border: "{colors.border}"
    rounded: "{rounded.md}"
    padding: "0.6875rem 1rem"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.neutral-fg}"
    border: "{colors.input}"
    rounded: "{rounded.md}"
    padding: "0.25rem 0.75rem"
    size: "h-11"
  card:
    backgroundColor: "{colors.card-bg}"
    textColor: "{colors.neutral-fg}"
    border: "{colors.border}"
    rounded: "{rounded.lg}"
    padding: "1.5rem"
---

# Design System: AWE System

## Overview

**Creative North Star: "Ntum"**

Ntum is an earthy, textured design system built for field officers working on shared low-end Android devices with intermittent signal, and for admin staff running programs from the command center. The visual language draws on African material culture — bogolan mud-cloth patterns, recycled paper grain, and woven overlays — rendered as lightweight inline SVG textures that require zero external image requests. The palette is anchored in two brand themes: sunset (default, earth-orange and amber-gold) and ocean (teal and sand), each with light and dark variants. System font stacks (sans-serif for UI, serif for display headings) replace webfonts entirely, keeping the build and the offline field app independent of external network calls.

The aesthetic philosophy is restraint with warmth: flat surfaces by default, subtle shadows only where they communicate state, generous tap targets, icons always paired with labels, and plain language throughout. Motion is minimized and gated by `prefers-reduced-motion`. The system is usable in five languages (en, de, fr, es, ar, including RTL) and designed for low digital literacy — every destructive action confirms, every empty state explains, every error offers a next step.

**Key Characteristics:**
- Earth-orange primary (#D95D39) and amber-gold accent (#F0A202) used sparingly, never dominant
- Dual brand themes (sunset default, ocean alternative) with light/dark mode, four combinations total
- Inline SVG textures (bogolan, paper, woven) as subtle overlays, never competing with content
- System font stacks only — Georgia serif for display, sans-serif system stack for body and labels
- Flat-by-default surfaces with shadow-sm on cards and focus-ring states on interactive elements
- Honest offline, empty, and error states in all five supported locales

## Colors

The palette is warm and earth-derived, with a single accent used for calls to action and focus states. Colors are grouped by role: primary brand, secondary brand, accent, neutral backgrounds and foregrounds, muted surfaces, destructive states, borders, inputs, and focus rings.

### Primary
- **Laterite Earth** (#D95D39): Primary brand color. Used on primary buttons, focus rings, and the sunset brand theme's `--primary` and `--ring` tokens. Reserved for the most important action on any screen.

### Secondary
- **Night Charcoal** (#1D2129): Secondary brand color. Used on secondary buttons, card backgrounds in dark mode, body text, and foreground text. The darkest neutral in the system.

### Accent
- **Harvest Gold** (#F0A202): Accent brand color. Used on ghost/outline button hovers, accent text, and the sunset brand theme's `--accent` token. A high-visibility warm yellow for secondary emphasis.

### Neutral
- **Warm Paper** (#F9F8F6) (#F9F8F6): Page and app background. The default `--background` token in both sunset and ocean light themes.
- **Night Charcoal** (#1D2129) (#1D2129): Primary text and foreground color. Used on `--foreground`, `--card-foreground`, `--popover-foreground`.
- **Pure White** (#FFFFFF) (#FFFFFF): Card, popover, and destructive-text backgrounds. Used on `--card`, `--popover`, `--primary-foreground`, `--secondary-foreground`, `--destructive-foreground`.
- **Soft Ash** (#F2F2F0) (#F2F2F0): Muted surface background. Used on `--muted` for secondary panels and subtle containers.
- **Slate Gray** (#65676B) (#65676B): Muted text color. Used on `--muted-foreground` for captions, helper text, and de-emphasized labels.

### Destructive
- **Alert Red** (#dc2626): Destructive action color. Used on destructive buttons and invalid input borders/rings.

### Border & Input
- **Pale Border** (#e5e7eb): Border and input stroke color. Used on `--border` and `--input` tokens in light mode; dark mode substitutes #333740.

### Focus Ring
- **Laterite Earth** (#D95D39): Focus ring color. Matches primary; applied as `--ring` on focused interactive elements.

**The One Accent Rule.** Laterite Earth (primary) and Harvest Gold (accent) together cover no more than 10% of any given screen. Their rarity is what makes them legible; covering more than a tenth of a surface dilutes both meaning and contrast.

## Typography

**Display Font:** Georgia (with Times New Roman, Noto Serif fallbacks) — a serif face for display headings only.
**Body Font:** System sans-serif stack (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica Neue, Arial, Noto Sans) — used for all body text, labels, and UI.
**Label/Mono Font:** Same system sans-serif stack, at smaller sizes with medium weight.

**Character:** The pairing is deliberately quiet. Georgia brings warmth and authority to display headings; the system sans-serif keeps body text legible at small sizes on low-end screens and readable in all five locales including Arabic RTL.

### Hierarchy
- **Display** (400, 36px, leading 1.1; md: 56px): Section headings and page titles. Set in Georgia serif. Appears on page heroes and major section breaks.
- **Headline** (600, 18px, leading 1.5): Card titles and subsection headers. System sans-serif, semibold.
- **Title** (500, 16px, leading 1.5): List item titles and form field labels. System sans-serif, medium.
- **Body** (400, 16px, leading 1.5): Paragraph text, descriptions, helper copy. Max line length 65–75 characters where layout permits. System sans-serif, regular.
- **Label** (500, 14px, letter-spacing 0em, sentence case): Button text, chip text, navigation labels. System sans-serif, medium, never uppercase by default.

## Layout

The system uses Tailwind's default spacing scale with no custom breakpoints beyond the standard sm/md/lg/xl/2xl. Containers are full-width on mobile, with content constrained by grid columns and gutters on desktop. The admin command center (`/admin`) uses a sidebar + main panel split; the field app (`/field`) uses a single-column, full-bleed layout optimized for touch; the dashboard (`/dashboard`) uses a card grid. Spacing rhythm follows the spacing scale: sm (0.5rem), md (1rem), lg (1.5rem). Cards use gap-6 internal spacing; page sections use md or lg padding. Density is comfortable, not compact — tap targets are at least 44px, and form controls use h-11 (2.75rem) height.

## Elevation & Depth

The system is flat by default. Surfaces do not cast shadows at rest. Depth is communicated through tonal layering (background vs card vs muted), borders (Pale Border #e5e7eb), and focus rings (Laterite Earth #D95D39) rather than ambient shadow.

Shadow vocabulary is minimal:
- **Card lift** (`shadow-sm`): Applied to Card components only. A subtle lift that separates a card from its background without pretending to be a physical object.

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, elevation) and never as permanent decoration. If a component does not need to communicate layering, it does not receive a shadow.

## Shapes

The form language is gently rounded, never sharp and never pill-shaped. The radius scale comes from the CSS `--radius` variable (0.5rem / 8px) and its Tailwind neighbors:

- **sm** (0.375rem / 6px): Buttons, inputs, chips, badges — small interactive elements where a tight radius keeps them crisp.
- **md** (0.5rem / 8px): The base radius from `--radius`. Applied to primary buttons and default component corners.
- **lg** (0.75rem / 12px): Cards and containers — larger surfaces benefit from a softer corner.

Borders are 1px Pale Border (#e5e7eb) on cards, inputs, and outlines. Clipping is not used as a design device. No circular avatars or fully rounded silhouettes appear as a system-wide motif; corners stay within the sm–lg range.

## Components

### Buttons
- **Shape:** Gently rounded (md, 0.5rem) for default and secondary; sm (0.375rem) for icon buttons.
- **Primary:** Laterite Earth (#D95D39) background, white text, 0.5rem 1rem padding. Hover darkens to 90% opacity. Focus ring in Laterite Earth at 50% opacity, 3px width.
- **Destructive:** Alert Red (#dc2626) background, white text. Hover darkens to 90% opacity. Dark mode uses 60% opacity red.
- **Outline:** Warm Paper (#F9F8F6) background, 1px Pale Border (#e5e7eb) stroke, Night Charcoal (#1D2129) text. Hover shifts to Harvest Gold (#F0A202) background with Harvest Gold text.
- **Secondary:** Night Charcoal (#1D2129) background, white text. Hover darkens to 80% opacity.
- **Ghost:** Transparent background. Hover shifts to Harvest Gold (#F0A202) background with Night Charcoal text.
- **Link:** Laterite Earth (#D95D39) text with underline; hover underlines more strongly.

### Inputs / Fields
- **Style:** Transparent background, 1px Pale Border (#e5e7eb) stroke, gently rounded (md, 0.5rem), 0.25rem 0.75rem padding, 2.75rem height (h-11). Selection color uses Laterite Earth.
- **Focus:** Focus ring in Laterite Earth (#D95D39) at 50% opacity, 3px width; border shifts to Laterite Earth.
- **Error / Disabled:** Invalid state uses Alert Red (#dc2626) border and ring. Disabled state reduces opacity to 50% and disables pointer events.

### Cards / Containers
- **Corner Style:** Gently rounded (lg, 0.75rem).
- **Background:** Pure White (#FFFFFF) in light mode, Night Charcoal (#1D2129) in dark mode.
- **Shadow Strategy:** shadow-sm (card lift) only; flat by default otherwise.
- **Border:** 1px Pale Border (#e5e7eb) in light mode; #333740 in dark mode.
- **Internal Padding:** 1.5rem on all sides; gap-6 between header, content, and footer sections.

### Navigation
- Sidebar navigation uses text labels with icons; active state uses Laterite Earth (#D95D39) text and background tint. Mobile treatment collapses to a bottom or overlay menu with large tap targets. No hover-only affordances — every navigation item has a visible active state.

**The Label-With-Icon Rule.** Icons never appear without an accompanying text label. This is non-negotiable for low-digital-literacy users and for Arabic RTL locales where icon directionality alone is insufficient.

## Do's and Don'ts

### Do:
- **Do** use Laterite Earth (#D95D39) for primary actions only; keep it under 10% of screen area (The One Accent Rule).
- **Do** pair every icon with a text label (The Label-With-Icon Rule).
- **Do** keep surfaces flat at rest; use shadow-sm only on cards (The Flat-By-Default Rule).
- **Do** use system font stacks only — no webfont downloads, ever (offline-first constraint).
- **Do** keep touch targets at least 44px; form controls use h-11 (2.75rem) height minimum.

### Don't:
- **Don't** use Harvest Gold (#F0A202) as a background on large surfaces; it is an accent, not a field color.
- **Don't** apply rounded corners beyond the sm–lg scale (0.375rem–0.75rem); no pill-shaped buttons.
- **Don't** add ambient shadows for decoration; shadows communicate state only.
- **Don't** use all-caps for labels or button text; sentence case throughout.
- **Don't** load external images or fonts; textures are inline SVG data URIs and fonts are system stacks.
