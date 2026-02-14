# Figma Design System Diff Tool — SPEC.md

## Problem

A designer works with a vendor/constructor Design System (DS) in Figma but has no edit access to the original library. They duplicate it to make local modifications. Over time, the constructor updates the original. The designer has no efficient way to know what changed upstream vs what they modified locally. Manual checking is painful and error-prone.

## Goal

A web tool where a designer pastes two Figma library URLs (constructor + their fork) and gets a visual diff report showing upstream changes, local changes, and conflicts — with component renders front and center. Each report is saved as a folder (HTML + images) that can be browsed in the app or shared standalone.

---

## User Flow

1. Designer opens the web app
2. Sees a list of previously generated reports (read from `reports/` directory)
3. Clicks "New comparison"
4. Pastes constructor library URL + forked copy URL
5. Optionally uploads two variable JSON files (one per lib)
6. Clicks "Compare"
7. Tool fetches files, resolves baseline, runs diff, fetches all images for changed components, generates report folder
8. Designer is redirected to the report
9. Report folder is portable: zip it, send it, open `report.html` in any browser

---

## Functional Requirements

### Input

- Two Figma file URLs (constructor library + designer's forked copy)
- Figma PAT stored in `.env` server-side (`FIGMA_PAT=figd_xxxxx`), not entered per session
- Optional: two JSON files for variable diff (designer exports variables from each lib manually via Tokens Studio, Export/Import Variables plugin, or any other tool)

### Report Storage

No database. Filesystem is the source of truth.

Each comparison generates a folder:

```
reports/
├── 2026-02-13_MaterialUI_vs_MyFork/
│   ├── report.html              # Self-contained report, refs images via relative paths
│   ├── data.json                # Raw diff data (for potential re-rendering)
│   └── images/
│       ├── button_base.png      # Base version render
│       ├── button_upstream.png  # Current constructor render
│       ├── button_local.png     # Current fork render
│       ├── button_diff.png      # Pixel diff overlay
│       ├── input_upstream.png
│       ├── input_local.png
│       ├── input_diff.png
│       └── ...
```

- Folder name convention: `{YYYY-MM-DD}_{constructor-file-name}_vs_{fork-file-name}`
- The web app home page reads the `reports/` directory and lists all generated reports
- Images are fetched via `GET /v1/images/:key?ids=x,y,z&format=png&scale=2` for every component that has a diff
- For upstream-only or local-only changes: two images (base + changed version) + pixel diff overlay
- For conflicts: three images (base, upstream, local) + two pixel diff overlays (base vs upstream, base vs local)

### Baseline Reconstruction (Three-Way Diff)

The fork was identical to the constructor lib at duplication time. To attribute changes:

1. Fetch the fork file metadata to get its creation date
2. Fetch the constructor's version history (`GET /v1/files/:key/versions`)
3. Find the constructor version closest to the fork creation date
4. Fetch the constructor file at that version (`GET /v1/files/:key?version=:id`)

This produces three states automatically:

- **Base** — constructor at fork time
- **Upstream** — constructor now
- **Local** — designer's fork now

### Change Attribution

| Base vs Upstream | Base vs Local | Result |
|---|---|---|
| Same | Same | No change |
| Different | Same | **Upstream change** |
| Same | Different | **Local change** |
| Different | Different | **Conflict** |
| Not in Base | Exists in Upstream | **New upstream** |
| Not in Base | Exists in Local | **New local** |
| In Base | Not in Upstream | **Deleted upstream** |
| In Base | Not in Local | **Deleted local** |

### Diff Scope

**Components:**

- Inventory: added, removed, renamed
- Variants: added, removed, modified
- Component properties: name, type, default value changes
- Visual render: PNG side-by-side via Figma image API

**Styles:**

- Color styles: fill values (hex, rgba)
- Text styles: font family, size, weight, line-height
- Effect styles: shadows, blurs, spreads

**Variables (via uploaded JSON only):**

- Inventory: added, removed, renamed
- Value changes per mode
- Type changes
- Format-agnostic: the tool normalizes whatever JSON structure is uploaded (Tokens Studio W3C DTCG format, native Figma export format, or other common formats)

### Report UI — Visual First

The report is designed for designers. Images first, data second.

**Overview section:**

- Summary stats: X upstream changes, Y local changes, Z conflicts
- Filterable by change type (upstream / local / conflict) and asset type (component / style / variable)
- Searchable by component/style/variable name

**Component diff cards (main view):**

- Grid of cards, one per changed component
- Each card shows:
  - Component name + change type badge (upstream / local / conflict)
  - Two rendered PNGs side-by-side: before → after (from `images/` folder)
  - For conflicts: three PNGs (base / upstream / local)
- Cards are the primary view — the designer scans visually

**Pixel diff overlay:**

- Toggle per card switching from side-by-side to overlay mode
- Shows the pixelmatch diff image highlighting changed pixels in red/magenta
- Catches micro-changes invisible in side-by-side view

**Detail panel (on card click):**

- Expandable section or modal showing:
  - Property changes: old value → new value
  - Variant diff: added/removed/modified variants
  - Style value changes: color swatches with hex, typography specs
- Second level of information, not the landing view

**Styles diff section:**

- Color styles: swatches side-by-side with hex values
- Text styles: typography specs side-by-side
- Effect styles: visual representation of shadows/blurs

**Variables diff section (when JSON was uploaded):**

- Table: variable name, type, old value, new value, change type
- Grouped by collection
- Color variables show swatches inline

---

## Figma REST API — Reference

### Endpoints used

| Endpoint | Returns | Use |
|---|---|---|
| `GET /v1/files/:key` | Full doc tree, components map, componentSets map, styles map | Component structure, variants, props |
| `GET /v1/files/:key?version=:id` | File at a specific version | Baseline reconstruction |
| `GET /v1/files/:key/versions` | Version history with timestamps | Finding baseline version |
| `GET /v1/files/:key/components` | Published component metadata | Component inventory |
| `GET /v1/files/:key/styles` | Style metadata (name, type, node_id) — no values | Style inventory |
| `GET /v1/files/:key/nodes?ids=x,y,z` | Full node data for specific IDs | Style values (fills, typo) |
| `GET /v1/images/:key?ids=x,y,z&format=png&scale=2` | Rendered PNG of nodes | Component visual renders |

### API constraints

- **Rate limits**: batch `nodes?ids=` calls, max ~50 IDs per request. Batch `images` calls similarly.
- **Large files**: `GET /files/:key` can return 50-100MB+ for big DS. Use `depth` parameter to limit tree depth where possible.
- **Style values require 2 calls**: `/styles` gives metadata only. Collect `node_id` values then fetch actual values via `/nodes?ids=`.
- **Image URLs expire**: 30 days. Download PNGs immediately to `images/` folder, do not store Figma URLs.
- **Image rendering**: `GET /images` may return null for some nodes (not renderable). Handle gracefully.
- **Version fetch**: same file size concerns as `GET /files/:key`.

### DO NOT USE

- `GET /v1/files/:key/variables/local` — Enterprise only, will 403
- `GET /v1/files/:key/variables/published` — Enterprise only + missing values
- Plugin API `figma.teamLibrary` — cannot access external file components

---

## Tech Stack

| Layer | Choice |
|---|---|
| Runtime | Node.js 20+ |
| Language | TypeScript strict, no `any` |
| Web framework | Next.js 15 (App Router) |
| UI components | shadcn/ui |
| Styling | Tailwind CSS |
| Validation | Zod |
| Image diff | pixelmatch |
| Image processing | sharp |
| Testing | Vitest |
| Package manager | pnpm workspaces |

---

## Project Structure

```
figma-ds-diff/
├── SPEC.md
├── CLAUDE.md
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env                          # FIGMA_PAT=figd_xxxxx
├── reports/                      # Generated report folders (gitignored)
├── packages/
│   ├── core/                     # Diff engine, Figma client, report generator
│   │   ├── src/
│   │   │   ├── figma/
│   │   │   │   ├── client.ts            # REST API wrapper, rate limiting, auth
│   │   │   │   ├── types.ts             # Zod schemas for all API responses
│   │   │   │   ├── fetcher.ts           # fetchFile, fetchVersions, fetchNodes, fetchImages
│   │   │   │   └── url-parser.ts        # Extract fileKey from Figma URL
│   │   │   ├── baseline/
│   │   │   │   └── resolver.ts          # Find closest version to fork date
│   │   │   ├── normalize/
│   │   │   │   ├── components.ts        # Normalize component/componentSet data
│   │   │   │   ├── styles.ts            # Normalize styles with resolved values
│   │   │   │   ├── variables.ts         # Normalize uploaded JSON (multi-format)
│   │   │   │   └── filters.ts           # Strip noise: IDs, positions, timestamps
│   │   │   ├── diff/
│   │   │   │   ├── three-way.ts         # Generic three-way diff algorithm
│   │   │   │   ├── component-diff.ts    # Component-specific comparison
│   │   │   │   ├── style-diff.ts        # Style-specific comparison
│   │   │   │   ├── variable-diff.ts     # Variable comparison on normalized JSON
│   │   │   │   ├── visual-diff.ts       # Pixel diff via pixelmatch + sharp
│   │   │   │   └── types.ts            # DiffResult, ChangeType, DiffEntry
│   │   │   ├── images/
│   │   │   │   └── downloader.ts        # Batch fetch + save PNGs from Figma API
│   │   │   ├── report/
│   │   │   │   └── generator.ts         # Generate HTML report + images folder
│   │   │   └── index.ts
│   │   ├── test/
│   │   │   ├── fixtures/                # Sample Figma API responses
│   │   │   ├── three-way.test.ts
│   │   │   ├── component-diff.test.ts
│   │   │   ├── style-diff.test.ts
│   │   │   ├── variable-diff.test.ts
│   │   │   ├── url-parser.test.ts
│   │   │   └── baseline-resolver.test.ts
│   │   └── package.json
│   └── web/                      # Next.js web UI
│       ├── src/
│       │   ├── app/
│       │   │   ├── page.tsx                     # Home: list reports + new comparison button
│       │   │   ├── new/
│       │   │   │   └── page.tsx                 # Input form: 2 URLs + optional JSON upload
│       │   │   ├── report/[slug]/
│       │   │   │   └── page.tsx                 # Serve/display a generated report
│       │   │   └── api/
│       │   │       ├── compare/route.ts         # POST: orchestrate comparison + generate report
│       │   │       ├── reports/route.ts          # GET: list reports from filesystem
│       │   │       └── reports/[slug]/
│       │   │           ├── route.ts             # GET: serve report HTML
│       │   │           └── images/[file]/route.ts # GET: serve report images
│       │   ├── components/
│       │   │   ├── report-list.tsx               # Table of existing reports
│       │   │   ├── input-form.tsx                # URL inputs + JSON dropzone
│       │   │   └── progress-display.tsx          # Comparison progress steps
│       │   └── lib/
│       │       └── utils.ts
│       └── package.json
```

---

## Implementation Phases

### Phase 1 — Figma Client + URL Parsing

Tasks:

- [ ] Set up monorepo: `pnpm-workspace.yaml`, `tsconfig.base.json`, `packages/core`, `packages/web`
- [ ] Implement `url-parser.ts`: extract `fileKey` from Figma URL (handle `figma.com/design/`, `figma.com/file/`, branch URLs)
- [ ] Define Zod schemas in `types.ts` for: File response, Version response, Component metadata, Style metadata, Node response, Image response
- [ ] Implement `client.ts`: REST API wrapper with PAT from `process.env.FIGMA_PAT`, rate limiting, error handling, retries
- [ ] Implement `fetcher.ts`: `fetchFile(fileKey, version?)`, `fetchVersions(fileKey)`, `fetchNodes(fileKey, nodeIds)`, `fetchImages(fileKey, nodeIds, scale, format)`
- [ ] Write tests: URL parser edge cases, client with mocked API responses

Verify: URL parser handles all Figma URL formats. Client fetches a real file with valid PAT. All tests pass.

### Phase 2 — Baseline Resolver

Tasks:

- [ ] Implement `resolver.ts`: takes fork fileKey + constructor fileKey, fetches fork metadata for creation date, fetches constructor version history, returns closest version ID
- [ ] Handle edge case: fork date before first available version → use earliest
- [ ] Handle edge case: truncated version history → warn user baseline is approximate
- [ ] Write tests with fixture version history data

Verify: resolver returns correct version ID for known fork dates. Edge cases return appropriate warnings.

### Phase 3 — Normalization

Tasks:

- [ ] Implement `components.ts`: extract components and componentSets from file JSON, normalize to `{ name, path, variants[], properties[] }`, keyed by path
- [ ] Implement `styles.ts`: map style metadata → node IDs → fetch node data → extract values (fills→hex, typography→font specs, effects→shadow specs), normalize to flat comparable structure
- [ ] Implement `variables.ts`: detect uploaded JSON format (Tokens Studio DTCG / native Figma / flat), normalize to `{ collection, name, type, valuesByMode }`
- [ ] Implement `filters.ts`: strip volatile fields (node IDs, absolute positions, timestamps, user metadata)
- [ ] Write tests: each normalizer with fixture data, deterministic output

Verify: normalizers produce stable output. Same input = same output. No false diffs from noise.

### Phase 4 — Three-Way Diff Engine

Tasks:

- [ ] Implement `three-way.ts`: generic three-way diff takes base/upstream/local maps, returns `DiffEntry[]` with change attribution per the attribution table above
- [ ] Implement `component-diff.ts`: three-way on normalized components, deep-compare variants and properties
- [ ] Implement `style-diff.ts`: three-way on normalized styles, compare fill/typo/effect values
- [ ] Implement `variable-diff.ts`: three-way on normalized variables when JSON provided
- [ ] Implement `visual-diff.ts`: take two PNGs, run pixelmatch, output overlay image + diff percentage
- [ ] Define `types.ts`: `ChangeType` enum, `DiffEntry`, `DiffReport`
- [ ] Write tests: three-way with known inputs, component-diff with fixtures

Verify: correct attribution on test data. Visual diff produces visible overlay image.

### Phase 5 — Image Downloader + Report Generator

Tasks:

- [ ] Implement `downloader.ts`: takes a list of node IDs per file (base, upstream, local), batch-fetches PNGs via Figma image API, saves to report `images/` folder with consistent naming (`{componentName}_{version}.png`)
- [ ] Handle null renders (node not renderable) → skip with warning
- [ ] Implement `generator.ts`: takes `DiffReport` + images folder path, generates `report.html` with:
  - Embedded CSS (Tailwind standalone or inline styles) — the HTML must work offline
  - JavaScript for interactivity (filters, search, overlay toggle, detail expand)
  - Relative image paths to `./images/`
  - Summary stats, cards grid, style diffs, variable table
- [ ] Save `data.json` alongside for potential re-rendering

Verify: generated report opens in a browser standalone. Images load. Filters and search work. Pixel overlay toggles.

### Phase 6 — Web UI: Home + Input Form

Tasks:

- [ ] Set up Next.js 15 in `packages/web` with Tailwind + shadcn/ui
- [ ] Install shadcn components: Button, Input, Card, Badge, Table, Skeleton, Separator
- [ ] Build home page (`page.tsx`): read `reports/` folder, list reports in a table (name, date, link). "New comparison" button.
- [ ] Build `api/reports/route.ts`: GET endpoint listing report folders from filesystem
- [ ] Build new comparison page (`new/page.tsx`): two URL inputs with Figma URL validation, dropzone for two variable JSON files, Compare button
- [ ] Build `api/compare/route.ts`: POST endpoint orchestrating full pipeline (parse → baseline → fetch → normalize → diff → download images → generate report → save to `reports/`)
- [ ] Build `progress-display.tsx`: step-by-step progress during comparison (Fetching files… Resolving baseline… Comparing… Downloading images… Generating report…)
- [ ] Build report serving routes: `report/[slug]/page.tsx` renders the HTML, image routes serve from report folder
- [ ] Error handling: invalid URL, 403, rate limit, timeout

Verify: full flow works. Report appears in listing. Opens correctly. Images load.

### Phase 7 — Polish + Edge Cases

Tasks:

- [ ] Detect renamed components (same structure, different name) vs delete+add
- [ ] Handle large DS files: chunked processing, progress feedback, timeout handling
- [ ] Handle missing access: clear error when PAT lacks read access
- [ ] Handle no version history: fallback two-way diff with warning (no attribution)
- [ ] Handle image download failures: retry logic, skip with placeholder on persistent failure
- [ ] Report HTML responsive layout
- [ ] Empty state: "No changes detected"
- [ ] E2E test: full flow with two fixture files

Verify: no crashes on malformed input. Edge cases handled gracefully. Report works on mobile.

---

## Out of Scope

- Variables via Figma REST API (Enterprise-only)
- Deep structural diff of component internals (every layer, every auto-layout prop)
- User accounts / multi-user
- CI/CD integration / scheduled diffs
- Figma plugin version
