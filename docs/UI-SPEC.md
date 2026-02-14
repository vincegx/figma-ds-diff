# Figma DS Diff Tool — UI Redesign Plan

## Context

The core tool is built and functional (Phases 1–7 of SPEC.md). The current web UI in `packages/web` was scaffolded with basic shadcn/ui components during Phase 6 — functional but generic. This plan replaces the entire frontend with a production-grade UI: master-detail report layout, conflict-first workflow, three-way property diff tables, pixel diff overlays, and a consistent dark theme with a proper design token system.

The reference mockup is `figma-ds-diff-app.jsx` — a fully interactive React prototype with all screens, components, data structures, and interactions. It is the single source of truth for visual decisions. The implementation extracts this design into the existing Next.js codebase, wires it to real data from `packages/core`, and replaces the current pages.

**API routes and backend logic (`packages/core`) are not touched by this plan.** Only `packages/web` changes.

---

## Design System

### Design Tokens

All visual values are centralized in a single token file. No hardcoded colors, fonts, spacings, or radii anywhere in components. Every component consumes tokens via Tailwind CSS custom properties.

**File: `packages/web/src/styles/tokens.css`**

```css
:root {
  /* ── Backgrounds ── */
  --bg-base:          #06060b;
  --bg-panel:         #0a0a11;
  --bg-surface:       rgba(255, 255, 255, 0.025);
  --bg-surface-hover: rgba(255, 255, 255, 0.05);
  --bg-surface-active:rgba(99, 102, 241, 0.08);

  /* ── Borders ── */
  --border-default:   rgba(255, 255, 255, 0.06);
  --border-hover:     rgba(255, 255, 255, 0.12);
  --border-active:    rgba(99, 102, 241, 0.3);

  /* ── Text ── */
  --text-primary:     #ffffff;
  --text-secondary:   rgba(255, 255, 255, 0.6);
  --text-tertiary:    rgba(255, 255, 255, 0.35);
  --text-muted:       rgba(255, 255, 255, 0.15);

  /* ── Semantic: change types ── */
  --color-upstream:       #60A5FA;
  --color-upstream-deep:  #3B82F6;
  --color-upstream-bg:    rgba(59, 130, 246, 0.08);
  --color-upstream-bd:    rgba(59, 130, 246, 0.2);

  --color-local:          #4ADE80;
  --color-local-deep:     #22C55E;
  --color-local-bg:       rgba(34, 197, 94, 0.08);
  --color-local-bd:       rgba(34, 197, 94, 0.2);

  --color-conflict:       #FB923C;
  --color-conflict-deep:  #F97316;
  --color-conflict-bg:    rgba(249, 115, 22, 0.08);
  --color-conflict-bd:    rgba(249, 115, 22, 0.2);

  --color-new:            #C084FC;
  --color-new-bg:         rgba(168, 85, 247, 0.08);
  --color-new-bd:         rgba(168, 85, 247, 0.2);

  --color-removed:        #F87171;
  --color-removed-bg:     rgba(239, 68, 68, 0.08);
  --color-removed-bd:     rgba(239, 68, 68, 0.2);

  --color-diff-highlight: #EC4899;

  /* ── Accent (gradient stops) ── */
  --accent-from:      #6366F1;
  --accent-to:        #8B5CF6;

  /* ── Typography ── */
  --font-sans:        'Outfit', system-ui, sans-serif;
  --font-mono:        'JetBrains Mono', monospace;

  /* ── Radii ── */
  --radius-sm:        6px;
  --radius-md:        10px;
  --radius-lg:        14px;
  --radius-pill:      9999px;

  /* ── Spacing scale ── */
  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;

  /* ── Shadows ── */
  --shadow-card-hover: 0 12px 40px rgba(0, 0, 0, 0.3);

  /* ── Transitions ── */
  --ease-default: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast: 120ms;
  --duration-normal: 200ms;

  /* ── Layout ── */
  --nav-height:     52px;
  --sidebar-width:  250px;
  --max-content:    1100px;
}
```

### Tailwind Extension

Tokens are mapped into Tailwind via `tailwind.config.ts` so they're usable as utility classes:

```ts
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        base:       'var(--bg-base)',
        panel:      'var(--bg-panel)',
        surface:    'var(--bg-surface)',

        upstream:   'var(--color-upstream)',
        local:      'var(--color-local)',
        conflict:   'var(--color-conflict)',
        'new':      'var(--color-new)',
        removed:    'var(--color-removed)',
        diff:       'var(--color-diff-highlight)',
      },
      fontFamily: {
        sans:  'var(--font-sans)',
        mono:  'var(--font-mono)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        pill: 'var(--radius-pill)',
      },
      borderColor: {
        default: 'var(--border-default)',
        hover:   'var(--border-hover)',
        active:  'var(--border-active)',
      },
      height: {
        nav: 'var(--nav-height)',
      },
      width: {
        sidebar: 'var(--sidebar-width)',
      },
      maxWidth: {
        content: 'var(--max-content)',
      },
    }
  }
}
```

Usage example: `className="bg-surface border border-default rounded-lg text-secondary font-mono"` — no raw values.

### Animations

Defined as Tailwind keyframes, consumed as utilities. Four animations cover the entire app:

```ts
// tailwind.config.ts — extend.keyframes + extend.animation
keyframes: {
  'fade-up':  { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
  'fade-in':  { from: { opacity: 0 }, to: { opacity: 1 } },
  'pulse-soft': { '0%,100%': { opacity: 0.4 }, '50%': { opacity: 0.9 } },
  'scanline': { '0%': { top: '-2px' }, '100%': { top: 'calc(100% + 2px)' } },
},
animation: {
  'fade-up':    'fade-up 0.3s var(--ease-default) both',
  'fade-in':    'fade-in 0.2s var(--ease-default)',
  'pulse-soft': 'pulse-soft 2.5s ease infinite',
  'scanline':   'scanline 3s linear infinite',
}
```

### Change Type Config

A single map used across all components (badges, dots, sidebar groups, filters). Stored as a shared constant, not repeated per component:

**File: `packages/web/src/lib/change-types.ts`**

```ts
export const CHANGE_TYPES = {
  conflict:         { label: 'Conflict', icon: '⚡', colorVar: 'conflict' },
  upstream:         { label: 'Upstream', icon: '↑',  colorVar: 'upstream' },
  new_upstream:     { label: 'New',      icon: '★',  colorVar: 'new'      },
  local:            { label: 'Local',    icon: '↓',  colorVar: 'local'    },
  deleted_upstream: { label: 'Removed',  icon: '✕',  colorVar: 'removed'  },
} as const;

export type ChangeType = keyof typeof CHANGE_TYPES;
```

Every component that needs to render a change type color reads from this map and resolves the CSS variable. Zero duplication.

---

## Component Architecture

### Shared Primitives

These small components are used across all pages. They depend only on tokens and `change-types.ts`:

| Component | Props | Purpose |
|---|---|---|
| `TypeBadge` | `type: ChangeType`, `size?: 'sm' \| 'md'` | Pill badge: "Upstream", "Conflict", etc. |
| `StatusDot` | `type: ChangeType`, `size?: number` | Colored dot with glow |
| `PropStatusBadge` | `status: 'upstream' \| 'local' \| 'conflict'` | Tiny inline label: UP / YOU / BOTH |
| `StatCard` | `label, value, color, sub?` | Stat box with colored top bar |
| `Pill` | `active, children, onClick` | Toggle button inside pill groups |

### Layout Components

| Component | Purpose |
|---|---|
| `NavBar` | Sticky top bar. Logo + "DiffLib" + beta badge. Context-aware right side: "New" button on home, "Export" on report. |
| `AppShell` | `layout.tsx` wrapper. Full height, flex column, dark background. Loads fonts + tokens. |

### Page: Home

| Component | Purpose |
|---|---|
| `Hero` | Title with gradient text, description paragraph |
| `StatCards` | Row of 4 `StatCard` — Reports / Latest Changes / Conflicts / Coverage. Data from API. |
| `ReportTable` | Searchable table of reports. Columns: name (+ baseline), date, upstream count, local count, conflict count, arrow. Hover highlight. Click navigates to report. |

### Page: New Comparison

| Component | Purpose |
|---|---|
| `StepIndicator` | 3-step progress bar: Library URLs → Variables → Generate. Gradient fill on completed steps. |
| `UrlStep` | Two inputs (constructor URL, fork URL) with labels and helper text. Mono font. Continue button. |
| `VariablesStep` | Dropzone with drag-over highlight. Back + Skip buttons. |
| `GenerateStep` | Confirm text + Generate button. |
| `ProcessingView` | Animated checklist of pipeline steps with ✓ / spinner / dot states. Progress bar at bottom. |

### Page: Report

This is the most complex screen. Master-detail layout that takes full viewport height below the nav.

| Component | Purpose |
|---|---|
| `ReportSidebar` | Left panel (250px). Report info block (back link, name, vs, baseline). Components/Styles tabs. Search input. Grouped item list. J/K keyboard hints at bottom. |
| `SidebarItem` | Single row: status dot, name, diff%. Active state with left border accent. |
| `ComponentDetail` | Main area content for selected component. Contains all sub-sections below. |
| `ConflictAlert` | Orange banner shown only when the selected component is a conflict. Shows count of conflicting properties. |
| `ComponentHeader` | Name + TypeBadge + Next→ button. Metadata line: group, variant counts, prop change count. |
| `ChangeSummaryChips` | Inline row of small chips: "3 Upstream", "2 Local", "1 Conflicts". Only shows non-zero. |
| `VisualComparison` | Toggle between side-by-side and pixel diff. Side-by-side: 2 or 3 columns (base, upstream, local) with labeled render placeholders. Wired to real PNGs from report images folder. |
| `PixelDiffOverlay` | Shows the pixelmatch overlay image with checkerboard background, animated scanline, and diff% indicator. |
| `PropertyDiffTable` | Three-way table: Property / Base (toggle) / Upstream / Local / Status badge. Conflict rows highlighted with orange left border, sorted first. Toggle for base column visibility. |
| `PropertyDiffRow` | Single row: property name (mono), three value cells with optional color swatches, status badge. |
| `StylesTable` | Full three-way table: Token / Type / Base / Upstream / Local / Status. Color swatches inline. Used when Styles tab is active. |
| `VariablesEmpty` | Empty state with icon + message for when no variable JSON was uploaded. |

---

## Data Flow

### Home → API

```
page.tsx → fetch GET /api/reports → ReportTable renders list
```

The API already returns report metadata (name, date, stats). No backend change needed. If the current response is missing `upstream`/`local`/`conflicts` counts, read them from each report's `data.json`.

### Report → data.json

```
report/[slug]/page.tsx → fetch GET /api/reports/[slug] → parse data.json → render sidebar + detail
```

The `data.json` generated by `packages/core` already contains the full diff data. The report page reads it and maps to the component tree. The shape expected by the UI:

```ts
interface ReportData {
  meta: {
    constructorName: string;
    forkName: string;
    baseline: string;
    date: string;
    summary: { upstream: number; local: number; conflicts: number; total: number };
  };
  components: ComponentDiff[];
  styles: StyleDiff[];
  variables?: VariableDiff[];
}

interface ComponentDiff {
  id: string;
  name: string;
  group: string;           // extracted from path: "Actions", "Forms", etc.
  type: ChangeType;
  diffPct: number;         // from pixelmatch
  variants: { base: number; upstream: number; local: number };
  props: PropertyDiff[];
  images: {                // relative paths to report images/ folder
    base?: string;
    upstream?: string;
    local?: string;
    diff?: string;
  };
}

interface PropertyDiff {
  name: string;
  base: string;
  upstream: string;
  local: string;
  status: 'upstream' | 'local' | 'conflict';
}

interface StyleDiff {
  name: string;
  type: 'color' | 'text' | 'effect';
  base: string;
  upstream: string;
  local: string;
  status: 'upstream' | 'local' | 'conflict';
}
```

If `data.json` doesn't match this shape exactly, add a `mapReportData()` adapter function in `packages/web/src/lib/data-mapper.ts`. Do NOT change `packages/core` output.

### Images

Component renders (base, upstream, local, diff overlays) are already saved as PNGs in each report's `images/` folder. The existing `api/reports/[slug]/images/[file]/route.ts` serves them. Components reference images via `<img src={/api/reports/${slug}/images/${filename}} />`.

---

## File Structure — Target

```
packages/web/src/
├── app/
│   ├── layout.tsx                            # AppShell: html + body + fonts + tokens.css
│   ├── page.tsx                              # Home page
│   ├── new/page.tsx                          # New comparison page
│   ├── report/[slug]/page.tsx                # Report page (master-detail)
│   └── api/                                  # ← UNCHANGED
│       ├── compare/route.ts
│       ├── reports/route.ts
│       └── reports/[slug]/...
├── components/
│   ├── shared/
│   │   ├── type-badge.tsx
│   │   ├── status-dot.tsx
│   │   ├── prop-status-badge.tsx
│   │   ├── stat-card.tsx
│   │   └── pill.tsx
│   ├── layout/
│   │   └── nav-bar.tsx
│   ├── home/
│   │   ├── hero.tsx
│   │   ├── stat-cards.tsx
│   │   └── report-table.tsx
│   ├── report/
│   │   ├── report-sidebar.tsx
│   │   ├── sidebar-item.tsx
│   │   ├── component-detail.tsx
│   │   ├── conflict-alert.tsx
│   │   ├── component-header.tsx
│   │   ├── change-summary-chips.tsx
│   │   ├── visual-comparison.tsx
│   │   ├── pixel-diff-overlay.tsx
│   │   ├── property-diff-table.tsx
│   │   ├── property-diff-row.tsx
│   │   ├── styles-table.tsx
│   │   └── variables-empty.tsx
│   └── new/
│       ├── step-indicator.tsx
│       ├── url-step.tsx
│       ├── variables-step.tsx
│       ├── generate-step.tsx
│       └── processing-view.tsx
├── lib/
│   ├── change-types.ts                       # CHANGE_TYPES constant + ChangeType type
│   ├── data-mapper.ts                        # data.json → UI types adapter
│   └── utils.ts                              # cn() helper (existing)
├── styles/
│   └── tokens.css                            # All design tokens
├── hooks/
│   └── use-keyboard-nav.ts                   # J/K navigation hook
└── types/
    └── report.ts                             # ReportData, ComponentDiff, etc.
```

---

## Implementation Phases

### Phase UI-1 — Design System Foundation

Tasks:

- [ ] Create `styles/tokens.css` with all CSS custom properties as specified in the Design System section
- [ ] Update `tailwind.config.ts`: extend colors, fontFamily, borderRadius, borderColor, keyframes, animations using token variables
- [ ] Update `app/layout.tsx`: import tokens.css, load Google Fonts (Outfit + JetBrains Mono) via `next/font/google`, set `bg-base text-primary font-sans` on body, set full viewport height
- [ ] Create `lib/change-types.ts`: `CHANGE_TYPES` map + `ChangeType` type
- [ ] Create `lib/utils.ts`: ensure `cn()` exists (clsx + tailwind-merge)
- [ ] Create `types/report.ts`: `ReportData`, `ComponentDiff`, `PropertyDiff`, `StyleDiff`, `VariableDiff` interfaces

Verify: `pnpm --filter @figma-ds-diff/web dev` starts. Page renders with correct background, fonts load, no hydration errors. Tailwind classes using token variables resolve correctly (test: add a temp div with `bg-surface text-upstream rounded-lg` and confirm visuals).

### Phase UI-2 — Shared Primitives

Tasks:

- [ ] Build `components/shared/type-badge.tsx` — reads from `CHANGE_TYPES`, renders pill with dynamic colors. Two sizes. All colors via CSS variables, no hardcoded hex.
- [ ] Build `components/shared/status-dot.tsx` — small circle with box-shadow glow. Color from change type.
- [ ] Build `components/shared/prop-status-badge.tsx` — UP / YOU / BOTH mini label. Color by status.
- [ ] Build `components/shared/stat-card.tsx` — surface background, border, colored top bar (2px), label + large value + optional sub text. Color passed as CSS variable name.
- [ ] Build `components/shared/pill.tsx` — toggle button with active/inactive states. Used for tabs, filters, view modes.
- [ ] Build `components/layout/nav-bar.tsx` — sticky, backdrop blur, border bottom. Left: logo (gradient div with Δ) + "DiffLib" + beta badge. Right: slot for page-specific actions (passed as children or prop).

Verify: create a test page `/test` that renders every primitive with all variants. Visual match against mockup. No hardcoded colors — inspect DOM and confirm all color values resolve from CSS variables.

### Phase UI-3 — Home Page

Tasks:

- [ ] Build `components/home/hero.tsx` — h1 with "Design System" + gradient "Diff Reports", paragraph below. Fade-up animation.
- [ ] Build `components/home/stat-cards.tsx` — fetch report summary data (from API or computed from report list). Row of 4 `StatCard` components. Staggered fade-up animation (animation-delay per card).
- [ ] Build `components/home/report-table.tsx` — search input (top right). Table with header row (uppercase, small text, muted). Data rows with: report name + "vs" + fork name (bold) + baseline (muted below), date + time, upstream count (blue), local count (green), conflict count (orange or muted if 0), arrow. Hover highlights row. Click navigates to `/report/[slug]`.
- [ ] Rewrite `app/page.tsx` — compose Hero + StatCards + ReportTable. Max-width container. Passes data from `GET /api/reports`.
- [ ] NavBar right slot: renders "New" button with gradient background.
- [ ] Delete old `components/report-list.tsx`

Verify: home page loads with real report data from filesystem. Reports are clickable. Search filters the list. Visual match with mockup. Responsive: cards stack on narrow viewports.

### Phase UI-4 — New Comparison Page

Tasks:

- [ ] Build `components/new/step-indicator.tsx` — 3-step bar. Completed steps filled with gradient, pending steps with border color. Step labels below.
- [ ] Build `components/new/url-step.tsx` — two input fields (mono font) with labels + helper text. Continue button (gradient). Validates Figma URL format on blur (calls `parseFigmaUrl` from core or reimplements regex client-side).
- [ ] Build `components/new/variables-step.tsx` — dashed border dropzone. Drag-over highlights border color. Back + "Skip & Generate" buttons.
- [ ] Build `components/new/generate-step.tsx` — centered confirm text + "Generate Report" button.
- [ ] Build `components/new/processing-view.tsx` — list of pipeline steps. Each step: icon (✓ done / spinner active / dot pending) + label. Progress bar at bottom with gradient fill animation. Steps update via SSE or polling from `POST /api/compare`.
- [ ] Rewrite `app/new/page.tsx` — compose StepIndicator + conditional step content. Local state: `step` (1/2/3), `running` boolean. On submit: POST to `/api/compare`, switch to ProcessingView, on complete redirect to `/report/[slug]`.
- [ ] NavBar right slot: empty or back button on this page.
- [ ] Delete old `components/input-form.tsx` and `components/progress-display.tsx`

Verify: full wizard flow works. URL validation catches bad inputs. Dropzone accepts JSON files. Processing view shows real pipeline progress. Redirect lands on new report.

### Phase UI-5 — Report Page: Sidebar + Layout

Tasks:

- [ ] Build `hooks/use-keyboard-nav.ts` — custom hook. Takes item list + selected ID. Returns `selectedId`, `setSelectedId`, `selectNext`, `selectPrev`. Registers `keydown` listeners for J/K (skips when input focused).
- [ ] Build `lib/data-mapper.ts` — `mapReportData(raw: unknown): ReportData` function. Reads `data.json` shape from core, maps to UI types. Extracts `group` from component path. Normalizes any missing fields.
- [ ] Build `components/report/report-sidebar.tsx` — fixed width (sidebar token), full height, flex column. Sections from top to bottom:
  1. Report info block: back link ("← Back to reports"), report name, "vs" fork name, baseline text
  2. Tabs: Components / Styles (underline active indicator)
  3. Search input
  4. Scrollable grouped list (components tab) or flat list (styles tab)
  5. Keyboard hints footer (J next / K prev)
- [ ] Build `components/report/sidebar-item.tsx` — StatusDot + name + diff%. Active state: surfaceActive bg, left border colored by change type. Hover state.
- [ ] Sidebar grouping logic: items sorted into groups by change type (Conflicts first, then Upstream, Local, Removed). Each group has a colored header: icon + label + count.
- [ ] Rewrite `app/report/[slug]/page.tsx` — full viewport height layout (below nav). Flex row: ReportSidebar (fixed width) + main area (flex-1, overflow-y auto). Fetch `data.json` via API route. Pass mapped data to sidebar + detail area.
- [ ] NavBar right slot: "Export" button on this page.

Verify: sidebar renders with real grouped components. Click selects item. J/K navigation works. Search filters within groups. Styles tab shows flat list. Layout fills viewport, no double scrollbar.

### Phase UI-6 — Report Page: Component Detail

Tasks:

- [ ] Build `components/report/conflict-alert.tsx` — orange banner at top of detail area. Only rendered when `selected.type === 'conflict'`. Shows count of conflicting properties.
- [ ] Build `components/report/component-header.tsx` — component name (h2) + TypeBadge + "Next →" button (right-aligned). Second line: group, variant counts (base → upstream / local), property change count.
- [ ] Build `components/report/change-summary-chips.tsx` — inline flex row of small chips. Each chip: dot + count + label ("Upstream" / "Local" / "Conflicts"). Only non-zero counts shown.
- [ ] Build `components/report/visual-comparison.tsx` — two sub-modes toggled by a pill group:
  - **Side by side**: grid of 2 columns (upstream-only or local-only changes) or 3 columns (conflicts). Each column: label (uppercase, colored) + image. Image loaded from report `images/` folder via API route. Fallback: styled placeholder div matching mockup (gradient + wireframe shapes) when image fails to load.
  - **Pixel diff**: renders `PixelDiffOverlay` component.
- [ ] Build `components/report/pixel-diff-overlay.tsx` — loads the diff PNG from images folder. Checkerboard background (CSS repeating-conic-gradient). Animated scanline (CSS gradient bar, `scanline` animation). Diff% indicator (top right corner, mono font, pink color, pulsing dot).
- [ ] Build `components/report/component-detail.tsx` — composed wrapper: ConflictAlert (conditional) + ComponentHeader + ChangeSummaryChips + VisualComparison + PropertyDiffTable. Padded, with fade-up animation on selection change (key on `selectedId`).
- [ ] Wire main area of report page to render `ComponentDetail` for components tab.

Verify: selecting different components updates the detail area with animation. Visual comparison shows real PNGs from report folder (or graceful placeholders). Toggle between side-by-side and pixel diff works. Conflict alert only appears for conflict items. "Next →" advances selection.

### Phase UI-7 — Report Page: Property Diff + Styles

Tasks:

- [ ] Build `components/report/property-diff-row.tsx` — grid row. Cells: property name (mono), base value (optional, strikethrough), upstream value, local value, PropStatusBadge. Color swatch inline when value is a hex color. Conflict rows: orange-tinted background + 2px left border orange.
- [ ] Build `components/report/property-diff-table.tsx` — border + rounded container. Header row: Property / Base (toggle) / Upstream (blue label) / Local (green label) / empty. Toggle switch: "Base column" on/off (changes grid-template-columns). Rows sorted: conflicts first, then upstream, then local.
- [ ] Build `components/report/styles-table.tsx` — full three-way table for styles tab. Columns: Token (mono) / Type (uppercase badge) / Base (swatch + value) / Upstream (swatch + value, bold if changed) / Local (swatch + value, bold if changed) / PropStatusBadge. Data from `ReportData.styles`.
- [ ] Build `components/report/variables-empty.tsx` — centered empty state: icon (floating animation) + "No variable files uploaded" + helper text about Tokens Studio export.
- [ ] Wire styles tab in report page: when sidebar tab = "styles", main area renders StylesTable.
- [ ] Wire variables tab (if present in sidebar): when active, renders VariablesEmpty (Phase 1 of SPEC.md excludes variables via API, so this is the expected state for now).

Verify: property table renders correctly for all change types. Toggle base column works (columns adjust). Conflict rows highlighted and sorted first. Color swatches render for hex values. Styles table shows all style diffs with correct three-way layout.

### Phase UI-8 — Polish + Integration Tests

Tasks:

- [ ] Remove all old Phase 6 components that were replaced (old `report-list.tsx`, `input-form.tsx`, `progress-display.tsx`, any remnants)
- [ ] Responsive check: home page works down to 768px. Report sidebar collapses to a drawer below 1024px (hamburger toggle).
- [ ] Staggered animations: sidebar items, table rows, stat cards all have `animation-delay` based on index
- [ ] Loading states: skeleton shimmer on home table while fetching, skeleton on report detail while loading data.json
- [ ] Error states: report not found (404 page), comparison failed (error in processing view with retry button)
- [ ] Empty state on home: "No reports yet" with arrow pointing to New button
- [ ] Verify all token usage: grep for hardcoded hex values in components — should find zero
- [ ] Test full flow end-to-end: home → new → process → redirect → report → navigate components → switch tabs → export
- [ ] Verify standalone report HTML still works (this plan doesn't change the generated `report.html`, only the web app)

Verify: no hardcoded color values in any component file. All animations smooth, no jank. Full flow works with real Figma files. Responsive layout functional. Loading/error/empty states all handled.

---

## Key Decisions

**Why CSS custom properties instead of Tailwind theme only?** CSS variables cascade and can be overridden at any level (e.g., future light theme toggle). They're also readable from JS when needed (`getComputedStyle`). Tailwind maps them for DX.

**Why not keep the generated report.html UI?** The standalone report HTML (from `packages/core/report/generator.ts`) stays as-is — it's designed for offline sharing. The web app UI is a separate, richer experience with navigation, filtering, keyboard shortcuts, and real-time data. They coexist: the web app is the primary interface, the HTML file is the portable export.

**Why `data.json` adapter instead of changing core output?** The core diff engine has its own stable data format. The UI may evolve faster than the engine. An adapter layer (`data-mapper.ts`) isolates UI concerns from engine concerns. If the core adds fields later, the adapter handles backward compatibility.

**Why Outfit + JetBrains Mono?** Outfit: geometric sans with wide weight range, distinctive enough to avoid "generic AI app" look, excellent for numeric data (tabular figures). JetBrains Mono: the standard for code/technical UI, ligature support, clear at small sizes. Both loaded via `next/font/google` with `display: 'swap'`.

---

## Usage with Claude Code

Place `UI-SPEC.md` at project root alongside `SPEC.md`. Use directive prompt:

```
The file UI-SPEC.md contains the complete UI redesign specification and implementation plan.
Do not research, do not create a new plan.
Execute Phase UI-1 tasks exactly as listed in UI-SPEC.md.
Start now.
```

Phase-by-phase. Validate each phase before proceeding to the next.
