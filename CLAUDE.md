# CLAUDE.md — Figma DS Diff Tool

## Project Overview

Web tool that compares two Figma design system libraries (constructor + fork) and generates visual diff reports showing upstream changes, local changes, and conflicts. Reports are self-contained HTML folders (no database).

## Architecture

pnpm monorepo with two packages:

- **`packages/core`** (`@figma-ds-diff/core`) — Figma client, normalizers, three-way diff engine, image downloader, HTML report generator. Pure TypeScript library, no framework dependency.
- **`packages/web`** (`@figma-ds-diff/web`) — Next.js 15 App Router UI. SSE-based comparison endpoint, report viewer, shadcn/ui components.

## Tech Stack

- **Runtime:** Node.js 20+, ESM everywhere (`"type": "module"`)
- **Language:** TypeScript 5.7+ with `strict`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax`
- **Package manager:** pnpm (path: `/opt/homebrew/bin/pnpm`)
- **Validation:** Zod v3 for all Figma API responses
- **Image processing:** sharp + pixelmatch (native deps)
- **Testing:** Vitest 3, tests in `packages/core/test/**/*.test.ts`
- **Web:** Next.js 15, React 19, Tailwind CSS 4, shadcn/ui
- **HTTP:** Node.js built-in `fetch` (no axios/node-fetch)

## Key Commands

```bash
# Always prefix with PATH or use full path
export PATH="/opt/homebrew/bin:$PATH"

# Install
pnpm install

# Type check
pnpm --filter @figma-ds-diff/core typecheck
pnpm --filter @figma-ds-diff/web typecheck

# Tests (189 tests, ~7s)
pnpm --filter @figma-ds-diff/core test

# Dev server (port 3000)
pnpm --filter @figma-ds-diff/web dev

# Smoke tests (require FIGMA_PAT in .env)
cd packages/core && npx tsx test/smoke.ts
```

## Project Structure

```
packages/core/src/
├── figma/          # API client, Zod types, fetcher, URL parser, quota tracker
├── baseline/       # Version history baseline resolver (three-way)
├── normalize/      # Components, styles, variables, filters
├── diff/           # Three-way engine, component/style/variable diff, visual diff, rename detection
├── images/         # Batch PNG downloader from Figma Images API
├── report/         # Self-contained HTML report generator
└── index.ts        # Barrel exports

packages/web/src/
├── app/
│   ├── api/compare/route.ts    # POST — SSE comparison orchestration
│   ├── api/reports/             # GET — list & serve reports
│   ├── api/quota/route.ts       # GET — Figma API quota stats
│   ├── api/settings/route.ts    # POST — runtime settings (FIGMA_PAT)
│   ├── new/page.tsx             # Comparison wizard (3-step form)
│   ├── report/[slug]/page.tsx   # Report viewer
│   └── settings/page.tsx        # Settings page (API token config)
├── components/
│   ├── home/       # Hero, report table, stat cards
│   ├── layout/     # NavBar
│   ├── new/        # Wizard steps, processing view, step indicator
│   ├── quota/      # Quota indicator + popover
│   ├── report/     # Shell, sidebar, visual comparison, lightbox, pixel diff, regenerate button
│   ├── settings/   # Settings form
│   └── shared/     # Stat card, status dot, type badge, prop status badge
├── hooks/          # useApiQuota, useKeyboardNav
└── lib/            # utils, reports-dir, runtime-config, data-mapper, change-types
```

## Critical Design Decisions

- **Three-way diff:** base (constructor at fork time) / upstream (constructor now) / local (fork now). Change attribution follows an 8-case table (see SPEC.md).
- **Two-way fallback:** When no common version history exists, uses empty base → everything shows as new_upstream or conflict.
- **Variables are two-way only:** Variable JSON files are uploaded by the user (not from Figma API versioning). The constructor vars serve as both base and upstream: `diffVariables(constructorVars, constructorVars, forkVars)`.
- **Figma Images API limitation:** `/v1/images/:key` does NOT support a `version` parameter. Visual diff is always two-way (current upstream vs current local renders).
- **Visual diff alignment:** Images are resized with `position: 'left top'` (not center) so pixel diffs align correctly when components differ in size.
- **Reports are filesystem-based:** Each report is a folder under `reports/` with `report.html`, `data.json`, and `images/`. Portable — works when opened directly in a browser.
- **Report slugs include timestamp:** `YYYY-MM-DD_HHmmss_Name_vs_Fork` to avoid overwrites.
- **Regeneration:** Reports store `constructorFileKey` and `forkFileKey` in `data.json`, allowing re-running comparisons without re-entering URLs. Variable diffs are skipped on regeneration (not stored in re-postable form).
- **Runtime config:** FIGMA_PAT is read directly from `.env` file (not `process.env`) with a 5s cache, so token updates via the Settings page take effect without server restart.

## Environment

- `FIGMA_PAT` in `.env` at project root (Figma Personal Access Token) — also configurable via Settings UI
- `.env.example` provided as template
- sharp requires: `pnpm.onlyBuiltDependencies: ["esbuild", "sharp"]` in root package.json
- `figma-data/api-quota.json` stores API call stats (auto-created, gitignored)

## Coding Conventions

- All imports use `.js` extension (ESM with TypeScript)
- `type` imports use `import type { ... }` (verbatimModuleSyntax)
- Zod schemas use `.passthrough()` on top-level API responses so new Figma fields don't break validation
- `Map<string, T>` for normalized data collections (not plain objects)
- Test files mirror source: `src/diff/three-way.ts` → `test/three-way.test.ts`
- Mocks use `vi.stubGlobal('fetch', ...)` for client tests
- No `console.log` in library code; progress callbacks via function params

## Test Data

- Constructor file: `36STB6Jnr3bI1t6ftuehLn` (Unsmoke_Library---V2)
- Fork file: `lzuGRHRDUsAYWGkcZZQoCp` (Unsmoke_Library---V2--copie-)
- Variable exports: `variables_main.json` (constructor), `variables.json` (fork) at project root

## Common Pitfalls

- **pnpm not in PATH:** Always `export PATH="/opt/homebrew/bin:$PATH"` before pnpm commands
- **Figma rate limit:** 30 req/min. Client has token bucket + exponential backoff. Image batches use `fetchImages` which batches in chunks of 50.
- **Figma render timeout:** Too many node IDs in one `/v1/images` call returns 400. The fetcher batches automatically.
- **Next.js + sharp:** Must be in `serverExternalPackages` in `next.config.ts`
- **Next.js + core package:** Needs `transpilePackages` and `.js` → `.ts` extension aliasing in webpack config
