/**
 * Report generator — produces a self-contained HTML report + data.json
 * from a DiffReport and downloaded images.
 *
 * The HTML works offline: all CSS is embedded, JS is inline,
 * images are referenced via relative paths to ./images/.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import type { DiffReport, DiffEntry, DiffSummary, ChangeType } from '../diff/types.js';
import type { DownloadResult, ImageEntry, DiffImageEntry } from '../images/downloader.js';
import { sanitizeFilename } from '../images/downloader.js';

// ── Types ────────────────────────────────────────────────────────────────

export interface ReportOptions {
  /** Report output directory (will create if needed) */
  outputDir: string;
  /** Optional: report title override */
  title?: string;
}

export interface GenerateReportResult {
  /** Path to the generated report.html */
  htmlPath: string;
  /** Path to the generated data.json */
  dataPath: string;
}

// ── Main function ────────────────────────────────────────────────────────

/**
 * Generate a complete report: report.html + data.json.
 *
 * @param report - The diff report data
 * @param downloadResult - Downloaded images and diffs
 * @param options - Output options
 */
export async function generateReport(
  report: DiffReport,
  downloadResult: DownloadResult,
  options: ReportOptions,
): Promise<GenerateReportResult> {
  const { outputDir, title } = options;

  await mkdir(outputDir, { recursive: true });

  // Save data.json
  const dataPath = join(outputDir, 'data.json');
  await writeFile(dataPath, JSON.stringify(report, null, 2), 'utf-8');

  // Generate and save report.html
  const reportTitle =
    title ?? `${report.constructorName} vs ${report.forkName}`;
  const html = buildHtml(report, downloadResult, reportTitle);
  const htmlPath = join(outputDir, 'report.html');
  await writeFile(htmlPath, html, 'utf-8');

  return { htmlPath, dataPath };
}

// ── HTML Builder ────────────────────────────────────────────────────────

function buildHtml(
  report: DiffReport,
  downloadResult: DownloadResult,
  title: string,
): string {
  // Build image lookup maps
  const imagesByComponent = new Map<string, ImageEntry[]>();
  for (const img of downloadResult.images) {
    const existing = imagesByComponent.get(img.componentKey) ?? [];
    existing.push(img);
    imagesByComponent.set(img.componentKey, existing);
  }

  const diffsByComponent = new Map<string, DiffImageEntry[]>();
  for (const diff of downloadResult.diffs) {
    const existing = diffsByComponent.get(diff.componentKey) ?? [];
    existing.push(diff);
    diffsByComponent.set(diff.componentKey, existing);
  }

  const hasChanges = report.summary.total > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)}</title>
${buildStyles()}
</head>
<body>
<div id="app">
  ${buildHeader(title, report)}
  ${hasChanges ? `
  ${buildSummaryBar(report.summary)}
  ${buildFilters()}
  <main id="main-content">
    ${buildComponentSection(report.components, imagesByComponent, diffsByComponent)}
    ${buildStyleSection(report.styles)}
    ${buildVariableSection(report.variables)}
  </main>` : buildEmptyState()}
  ${buildFooter(report)}
</div>
${buildScript()}
</body>
</html>`;
}

// ── Header ──────────────────────────────────────────────────────────────

function buildHeader(title: string, report: DiffReport): string {
  return `
  <header class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="header-meta">
      <span>Baseline: ${escapeHtml(report.baselineVersionDate)}</span>
      <span>Generated: ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</span>
    </div>
  </header>`;
}

// ── Summary Bar ─────────────────────────────────────────────────────────

function buildSummaryBar(summary: DiffSummary): string {
  const items = [
    { label: 'Upstream Changes', value: summary.upstreamChanges, color: '#3b82f6' },
    { label: 'Local Changes', value: summary.localChanges, color: '#22c55e' },
    { label: 'Conflicts', value: summary.conflicts, color: '#ef4444' },
    { label: 'New Upstream', value: summary.newUpstream, color: '#8b5cf6' },
    { label: 'New Local', value: summary.newLocal, color: '#06b6d4' },
    { label: 'Deleted Upstream', value: summary.deletedUpstream, color: '#f97316' },
    { label: 'Deleted Local', value: summary.deletedLocal, color: '#eab308' },
    { label: 'Renamed Upstream', value: summary.renamedUpstream, color: '#d946ef' },
    { label: 'Renamed Local', value: summary.renamedLocal, color: '#14b8a6' },
  ];

  const cards = items
    .filter((i) => i.value > 0)
    .map(
      (i) => `
    <div class="stat-card" style="border-left: 4px solid ${i.color}">
      <div class="stat-value">${i.value}</div>
      <div class="stat-label">${i.label}</div>
    </div>`,
    )
    .join('');

  return `
  <section class="summary-bar">
    <div class="stat-total">
      <span class="stat-value">${summary.total}</span>
      <span class="stat-label">Total Changes</span>
    </div>
    <div class="stat-cards">${cards}</div>
  </section>`;
}

// ── Filters ─────────────────────────────────────────────────────────────

function buildFilters(): string {
  return `
  <section class="filters">
    <input type="text" id="search-input" placeholder="Search by name..." class="search-input">
    <div class="filter-buttons">
      <button class="filter-btn active" data-filter="all">All</button>
      <button class="filter-btn" data-filter="upstream_changed">Upstream</button>
      <button class="filter-btn" data-filter="local_changed">Local</button>
      <button class="filter-btn" data-filter="conflict">Conflicts</button>
      <button class="filter-btn" data-filter="new_upstream">New Upstream</button>
      <button class="filter-btn" data-filter="new_local">New Local</button>
      <button class="filter-btn" data-filter="deleted_upstream">Del. Upstream</button>
      <button class="filter-btn" data-filter="deleted_local">Del. Local</button>
      <button class="filter-btn" data-filter="renamed_upstream">Ren. Upstream</button>
      <button class="filter-btn" data-filter="renamed_local">Ren. Local</button>
    </div>
    <div class="section-filter-buttons">
      <button class="section-btn active" data-section="all">All Sections</button>
      <button class="section-btn" data-section="components">Components</button>
      <button class="section-btn" data-section="styles">Styles</button>
      <button class="section-btn" data-section="variables">Variables</button>
    </div>
  </section>`;
}

// ── Component Section ───────────────────────────────────────────────────

function buildComponentSection(
  entries: DiffEntry<unknown>[],
  imagesByComponent: Map<string, ImageEntry[]>,
  diffsByComponent: Map<string, DiffImageEntry[]>,
): string {
  if (entries.length === 0) return '';

  const cards = entries
    .map((entry) =>
      buildComponentCard(
        entry,
        imagesByComponent.get(entry.key) ?? [],
        diffsByComponent.get(entry.key) ?? [],
      ),
    )
    .join('');

  return `
  <section class="section" data-section-type="components">
    <h2 class="section-title">Components <span class="count">(${entries.length})</span></h2>
    <div class="card-grid">${cards}</div>
  </section>`;
}

function buildComponentCard(
  entry: DiffEntry<unknown>,
  images: ImageEntry[],
  diffs: DiffImageEntry[],
): string {
  const badge = buildBadge(entry.changeType);
  const imageHtml = buildImageComparison(entry, images, diffs);
  const detailsHtml = buildDetails(entry);

  return `
    <div class="card" data-change-type="${entry.changeType}" data-name="${escapeHtml(entry.key.toLowerCase())}">
      <div class="card-header">
        <h3 class="card-title">${escapeHtml(entry.key)}</h3>
        ${badge}
      </div>
      ${imageHtml}
      <div class="card-details" style="display:none">
        ${detailsHtml}
      </div>
      <button class="toggle-details" onclick="toggleDetails(this)">Show details</button>
    </div>`;
}

function buildImageComparison(
  entry: DiffEntry<unknown>,
  images: ImageEntry[],
  diffs: DiffImageEntry[],
): string {
  if (images.length === 0) return '';

  const imgMap = new Map(images.map((i) => [i.label, i]));
  const diffMap = new Map(diffs.map((d) => [d.comparison, d]));

  const upstreamImg = imgMap.get('upstream');
  const localImg = imgMap.get('local');
  const upLocalDiff = diffMap.get('upstream_vs_local');

  let html = '<div class="image-comparison">';

  // For deletions, only one side exists
  if (entry.changeType === 'deleted_upstream' || entry.changeType === 'new_local') {
    // Only local exists (upstream was deleted, or item is new in local)
    if (localImg) {
      html += '<div class="image-row two-way">';
      html += `<div class="image-col"><div class="image-label">Local (Fork)</div><img src="./images/${escapeHtml(localImg.filename)}" alt="Local" loading="lazy"></div>`;
      html += '</div>';
    }
  } else if (entry.changeType === 'deleted_local' || entry.changeType === 'new_upstream') {
    // Only upstream exists (local was deleted, or item is new upstream)
    if (upstreamImg) {
      html += '<div class="image-row two-way">';
      html += `<div class="image-col"><div class="image-label">Upstream (Constructor)</div><img src="./images/${escapeHtml(upstreamImg.filename)}" alt="Upstream" loading="lazy"></div>`;
      html += '</div>';
    }
  } else {
    // Both sides exist — show side-by-side
    html += '<div class="image-row two-way">';
    if (upstreamImg) {
      html += `<div class="image-col"><div class="image-label">Upstream (Constructor)</div><img src="./images/${escapeHtml(upstreamImg.filename)}" alt="Upstream" loading="lazy"></div>`;
    }
    if (localImg) {
      html += `<div class="image-col"><div class="image-label">Local (Fork)</div><img src="./images/${escapeHtml(localImg.filename)}" alt="Local" loading="lazy"></div>`;
    }
    html += '</div>';

    // Diff overlay toggle
    if (upLocalDiff) {
      html += `<div class="diff-overlays" style="display:none">`;
      html += `<div class="image-col full-width"><div class="image-label">Pixel Diff (${upLocalDiff.diffPercent.toFixed(1)}%)</div><img src="./images/${escapeHtml(upLocalDiff.filename)}" alt="Diff overlay" loading="lazy"></div>`;
      html += '</div>';
      html += '<button class="toggle-overlay" onclick="toggleOverlay(this)">Show pixel diff</button>';
    }
  }

  html += '</div>';
  return html;
}

// ── Style Section ───────────────────────────────────────────────────────

function buildStyleSection(entries: DiffEntry<unknown>[]): string {
  if (entries.length === 0) return '';

  const rows = entries.map((entry) => buildStyleRow(entry)).join('');

  return `
  <section class="section" data-section-type="styles">
    <h2 class="section-title">Styles <span class="count">(${entries.length})</span></h2>
    <table class="diff-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Change</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function buildStyleRow(entry: DiffEntry<unknown>): string {
  const style = (entry.upstream ?? entry.local ?? entry.base) as Record<string, unknown> | undefined;
  const styleType = (style?.['type'] as string) ?? 'UNKNOWN';
  const badge = buildBadge(entry.changeType);
  const details = entry.details.map((d) => escapeHtml(d)).join('<br>');

  // Color swatch for fill styles
  let swatch = '';
  if (styleType === 'FILL') {
    const fills = (style?.['fills'] as Array<{ hex?: string }>) ?? [];
    swatch = fills
      .filter((f) => f.hex)
      .map(
        (f) =>
          `<span class="color-swatch" style="background:${f.hex}" title="${f.hex}"></span>`,
      )
      .join('');
  }

  return `
    <tr class="diff-row" data-change-type="${entry.changeType}" data-name="${escapeHtml(entry.key.toLowerCase())}">
      <td class="name-cell">${swatch}${escapeHtml(entry.key)}</td>
      <td>${styleType}</td>
      <td>${badge}</td>
      <td class="details-cell">${details}</td>
    </tr>`;
}

// ── Variable Section ────────────────────────────────────────────────────

function buildVariableSection(entries: DiffEntry<unknown>[]): string {
  if (entries.length === 0) return '';

  const rows = entries.map((entry) => buildVariableRow(entry)).join('');

  return `
  <section class="section" data-section-type="variables">
    <h2 class="section-title">Variables <span class="count">(${entries.length})</span></h2>
    <table class="diff-table">
      <thead>
        <tr>
          <th>Name</th>
          <th>Collection</th>
          <th>Type</th>
          <th>Change</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function buildVariableRow(entry: DiffEntry<unknown>): string {
  const variable = (entry.upstream ?? entry.local ?? entry.base) as Record<string, unknown> | undefined;
  const collection = (variable?.['collection'] as string) ?? '';
  const varType = (variable?.['type'] as string) ?? '';
  const badge = buildBadge(entry.changeType);
  const details = entry.details.map((d) => escapeHtml(d)).join('<br>');

  // Color swatch for color variables
  let swatch = '';
  if (varType === 'color') {
    const valuesByMode = (variable?.['valuesByMode'] as Record<string, unknown>) ?? {};
    const firstValue = Object.values(valuesByMode)[0];
    if (typeof firstValue === 'string' && firstValue.startsWith('#')) {
      swatch = `<span class="color-swatch" style="background:${firstValue}" title="${firstValue}"></span>`;
    }
  }

  return `
    <tr class="diff-row" data-change-type="${entry.changeType}" data-name="${escapeHtml(entry.key.toLowerCase())}">
      <td class="name-cell">${swatch}${escapeHtml(entry.key)}</td>
      <td>${escapeHtml(collection)}</td>
      <td>${escapeHtml(varType)}</td>
      <td>${badge}</td>
      <td class="details-cell">${details}</td>
    </tr>`;
}

// ── Shared UI ───────────────────────────────────────────────────────────

function buildBadge(changeType: ChangeType): string {
  const labels: Record<ChangeType, string> = {
    unchanged: 'Unchanged',
    upstream_changed: 'Upstream',
    local_changed: 'Local',
    conflict: 'Conflict',
    new_upstream: 'New Upstream',
    new_local: 'New Local',
    deleted_upstream: 'Del. Upstream',
    deleted_local: 'Del. Local',
    renamed_upstream: 'Ren. Upstream',
    renamed_local: 'Ren. Local',
  };
  return `<span class="badge badge-${changeType}">${labels[changeType]}</span>`;
}

function buildDetails(entry: DiffEntry<unknown>): string {
  if (entry.details.length === 0) return '<p>No details available.</p>';
  return `<ul class="detail-list">${entry.details.map((d) => `<li>${escapeHtml(d)}</li>`).join('')}</ul>`;
}

function buildEmptyState(): string {
  return `
  <section class="empty-state">
    <div class="empty-icon">&#10003;</div>
    <h2>No changes detected</h2>
    <p>The constructor library and your fork are identical.</p>
    <p class="empty-hint">Both component structures, styles, and properties match perfectly.</p>
  </section>`;
}

function buildFooter(report: DiffReport): string {
  return `
  <footer class="footer">
    <p>Report generated on ${escapeHtml(new Date(report.generatedAt).toLocaleString())}</p>
    <p>Baseline version: ${escapeHtml(report.baselineVersionId)} (${escapeHtml(report.baselineVersionDate)})</p>
  </footer>`;
}

// ── Styles (CSS) ────────────────────────────────────────────────────────

function buildStyles(): string {
  return `<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #0f172a;
  color: #e2e8f0;
  line-height: 1.5;
}

#app { max-width: 1400px; margin: 0 auto; padding: 24px; }

/* Header */
.header { padding: 24px 0; border-bottom: 1px solid #1e293b; margin-bottom: 24px; }
.header h1 { font-size: 24px; font-weight: 700; color: #f8fafc; }
.header-meta { display: flex; gap: 16px; margin-top: 8px; font-size: 13px; color: #94a3b8; }

/* Summary */
.summary-bar { display: flex; align-items: center; gap: 24px; padding: 16px 0; margin-bottom: 24px; flex-wrap: wrap; }
.stat-total { text-align: center; padding: 12px 24px; background: #1e293b; border-radius: 8px; }
.stat-value { font-size: 28px; font-weight: 700; color: #f8fafc; }
.stat-label { font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-cards { display: flex; gap: 12px; flex-wrap: wrap; }
.stat-card { background: #1e293b; border-radius: 8px; padding: 12px 16px; min-width: 120px; }
.stat-card .stat-value { font-size: 20px; }
.stat-card .stat-label { font-size: 11px; }

/* Filters */
.filters { display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px; }
.search-input {
  width: 100%; padding: 10px 16px; background: #1e293b; border: 1px solid #334155;
  border-radius: 8px; color: #e2e8f0; font-size: 14px; outline: none;
}
.search-input:focus { border-color: #3b82f6; }
.filter-buttons, .section-filter-buttons { display: flex; gap: 8px; flex-wrap: wrap; }
.filter-btn, .section-btn {
  padding: 6px 14px; background: #1e293b; border: 1px solid #334155; border-radius: 6px;
  color: #94a3b8; font-size: 13px; cursor: pointer; transition: all 0.15s;
}
.filter-btn:hover, .section-btn:hover { background: #334155; color: #e2e8f0; }
.filter-btn.active, .section-btn.active { background: #3b82f6; border-color: #3b82f6; color: #fff; }

/* Sections */
.section { margin-bottom: 32px; }
.section-title { font-size: 18px; font-weight: 600; padding-bottom: 12px; border-bottom: 1px solid #1e293b; margin-bottom: 16px; }
.section-title .count { color: #64748b; font-weight: 400; }

/* Card grid */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(500px, 1fr)); gap: 16px; }
.card {
  background: #1e293b; border-radius: 12px; overflow: hidden;
  border: 1px solid #334155; transition: border-color 0.15s;
}
.card:hover { border-color: #475569; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding: 14px 16px; }
.card-title { font-size: 14px; font-weight: 600; color: #f8fafc; word-break: break-word; }

/* Badges */
.badge {
  display: inline-block; padding: 2px 10px; border-radius: 12px;
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.03em; white-space: nowrap;
}
.badge-upstream_changed { background: #1e3a5f; color: #60a5fa; }
.badge-local_changed { background: #14532d; color: #4ade80; }
.badge-conflict { background: #7f1d1d; color: #f87171; }
.badge-new_upstream { background: #2e1065; color: #a78bfa; }
.badge-new_local { background: #083344; color: #22d3ee; }
.badge-deleted_upstream { background: #431407; color: #fb923c; }
.badge-deleted_local { background: #422006; color: #facc15; }
.badge-renamed_upstream { background: #4a044e; color: #e879f9; }
.badge-renamed_local { background: #042f2e; color: #2dd4bf; }
.badge-unchanged { background: #1e293b; color: #64748b; }

/* Images */
.image-comparison { padding: 0 16px 12px; }
.image-row { display: flex; gap: 8px; }
.image-row.three-way .image-col { flex: 1; }
.image-row.two-way .image-col { flex: 1; }
.image-col { text-align: center; }
.image-col.full-width { width: 100%; }
.image-label { font-size: 11px; color: #94a3b8; padding: 4px 0; text-transform: uppercase; letter-spacing: 0.05em; }
.image-col img { max-width: 100%; height: auto; border-radius: 6px; background: #fff; }
.diff-overlays { display: flex; gap: 8px; margin-top: 8px; }

.toggle-overlay, .toggle-details {
  display: block; width: 100%; padding: 8px; background: transparent;
  border: none; border-top: 1px solid #334155; color: #64748b;
  font-size: 12px; cursor: pointer; transition: color 0.15s;
}
.toggle-overlay:hover, .toggle-details:hover { color: #e2e8f0; }

/* Detail panel */
.card-details { padding: 12px 16px; border-top: 1px solid #334155; }
.detail-list { list-style: none; padding: 0; }
.detail-list li {
  padding: 4px 0; font-size: 13px; color: #cbd5e1;
  border-bottom: 1px solid rgba(51,65,85,0.5);
}
.detail-list li:last-child { border-bottom: none; }

/* Tables */
.diff-table { width: 100%; border-collapse: collapse; }
.diff-table th {
  text-align: left; padding: 10px 12px; background: #1e293b;
  font-size: 12px; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em;
  border-bottom: 2px solid #334155;
}
.diff-table td { padding: 10px 12px; border-bottom: 1px solid #1e293b; font-size: 13px; }
.diff-row:hover td { background: rgba(51,65,85,0.3); }
.name-cell { font-weight: 500; color: #f8fafc; }
.details-cell { color: #94a3b8; max-width: 400px; }

/* Color swatch */
.color-swatch {
  display: inline-block; width: 14px; height: 14px; border-radius: 3px;
  border: 1px solid rgba(255,255,255,0.2); vertical-align: middle; margin-right: 6px;
}

/* Empty state */
.empty-state {
  text-align: center; padding: 80px 24px; margin: 48px 0;
  background: #1e293b; border-radius: 16px; border: 1px solid #334155;
}
.empty-icon { font-size: 64px; color: #22c55e; margin-bottom: 16px; }
.empty-state h2 { font-size: 24px; font-weight: 700; color: #f8fafc; margin-bottom: 8px; }
.empty-state p { font-size: 16px; color: #94a3b8; margin-top: 4px; }
.empty-hint { font-size: 13px; color: #64748b; margin-top: 12px; }

/* Footer */
.footer { padding: 24px 0; border-top: 1px solid #1e293b; margin-top: 32px; font-size: 12px; color: #64748b; }

/* Responsive */
@media (max-width: 768px) {
  #app { padding: 12px; }
  .header h1 { font-size: 18px; }
  .card-grid { grid-template-columns: 1fr; }
  .image-row.three-way, .image-row.two-way { flex-direction: column; }
  .summary-bar { flex-direction: column; align-items: stretch; }
  .stat-total { text-align: center; }
  .stat-cards { width: 100%; justify-content: center; }
  .filter-buttons, .section-filter-buttons { flex-wrap: wrap; }
  .diff-table { font-size: 12px; }
  .diff-table th, .diff-table td { padding: 6px 8px; }
  .details-cell { max-width: 200px; }
  .empty-state { padding: 48px 16px; }
}

/* Hidden state for filtering */
.hidden { display: none !important; }
</style>`;
}

// ── Script (JS) ─────────────────────────────────────────────────────────

function buildScript(): string {
  return `<script>
// Filter by change type
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
});

// Filter by section
document.querySelectorAll('.section-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.section-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    applyFilters();
  });
});

// Search
document.getElementById('search-input').addEventListener('input', applyFilters);

function applyFilters() {
  const changeFilter = document.querySelector('.filter-btn.active')?.dataset.filter ?? 'all';
  const sectionFilter = document.querySelector('.section-btn.active')?.dataset.section ?? 'all';
  const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();

  // Section visibility
  document.querySelectorAll('.section').forEach(section => {
    const sectionType = section.dataset.sectionType;
    if (sectionFilter === 'all' || sectionType === sectionFilter) {
      section.classList.remove('hidden');
    } else {
      section.classList.add('hidden');
    }
  });

  // Card & row filtering
  document.querySelectorAll('.card, .diff-row').forEach(item => {
    const type = item.dataset.changeType;
    const name = item.dataset.name ?? '';
    let visible = true;

    if (changeFilter !== 'all' && type !== changeFilter) visible = false;
    if (searchTerm && !name.includes(searchTerm)) visible = false;

    if (visible) {
      item.classList.remove('hidden');
    } else {
      item.classList.add('hidden');
    }
  });
}

// Toggle details
function toggleDetails(btn) {
  const details = btn.previousElementSibling;
  if (details.style.display === 'none') {
    details.style.display = 'block';
    btn.textContent = 'Hide details';
  } else {
    details.style.display = 'none';
    btn.textContent = 'Show details';
  }
}

// Toggle overlay
function toggleOverlay(btn) {
  const overlays = btn.previousElementSibling;
  const imageRow = overlays.previousElementSibling;
  if (overlays.style.display === 'none') {
    overlays.style.display = 'flex';
    imageRow.style.display = 'none';
    btn.textContent = 'Show side-by-side';
  } else {
    overlays.style.display = 'none';
    imageRow.style.display = 'flex';
    btn.textContent = 'Show pixel diff';
  }
}
</script>`;
}

// ── Utilities ───────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
