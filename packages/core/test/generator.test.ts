import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateReport } from '../src/report/generator.js';
import type { DiffReport, DiffEntry } from '../src/diff/types.js';
import type { DownloadResult } from '../src/images/downloader.js';

function makeReport(overrides: Partial<DiffReport> = {}): DiffReport {
  return {
    constructorName: 'DesignLib',
    forkName: 'MyFork',
    baselineVersionId: 'v123',
    baselineVersionDate: '2025-01-15T10:00:00Z',
    generatedAt: new Date().toISOString(),
    components: [],
    styles: [],
    variables: [],
    summary: {
      total: 0,
      unchanged: 0,
      upstreamChanges: 0,
      localChanges: 0,
      conflicts: 0,
      newUpstream: 0,
      newLocal: 0,
      deletedUpstream: 0,
      deletedLocal: 0,
    },
    ...overrides,
  };
}

function makeDownloadResult(overrides: Partial<DownloadResult> = {}): DownloadResult {
  return {
    images: [],
    diffs: [],
    warnings: [],
    ...overrides,
  };
}

describe('generateReport', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'report-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('creates report.html and data.json', async () => {
    const report = makeReport();
    const result = await generateReport(report, makeDownloadResult(), {
      outputDir: tmpDir,
    });

    // Check files exist
    await expect(access(result.htmlPath)).resolves.toBeUndefined();
    await expect(access(result.dataPath)).resolves.toBeUndefined();
  });

  it('data.json contains the full report', async () => {
    const report = makeReport({
      constructorName: 'TestLib',
      forkName: 'TestFork',
    });

    const result = await generateReport(report, makeDownloadResult(), {
      outputDir: tmpDir,
    });

    const data = JSON.parse(await readFile(result.dataPath, 'utf-8'));
    expect(data.constructorName).toBe('TestLib');
    expect(data.forkName).toBe('TestFork');
    expect(data.baselineVersionId).toBe('v123');
  });

  it('report.html is valid HTML with title', async () => {
    const report = makeReport();
    const result = await generateReport(report, makeDownloadResult(), {
      outputDir: tmpDir,
    });

    const html = await readFile(result.htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>DesignLib vs MyFork</title>');
    expect(html).toContain('</html>');
  });

  it('respects custom title', async () => {
    const report = makeReport();
    const result = await generateReport(report, makeDownloadResult(), {
      outputDir: tmpDir,
      title: 'My Custom Report',
    });

    const html = await readFile(result.htmlPath, 'utf-8');
    expect(html).toContain('<title>My Custom Report</title>');
  });

  it('includes summary stats in HTML', async () => {
    const report = makeReport({
      summary: {
        total: 5,
        unchanged: 0,
        upstreamChanges: 2,
        localChanges: 1,
        conflicts: 1,
        newUpstream: 1,
        newLocal: 0,
        deletedUpstream: 0,
        deletedLocal: 0,
      },
    });

    const result = await generateReport(report, makeDownloadResult(), {
      outputDir: tmpDir,
    });

    const html = await readFile(result.htmlPath, 'utf-8');
    expect(html).toContain('5'); // total
    expect(html).toContain('Upstream Changes');
    expect(html).toContain('Conflicts');
  });

  it('includes component cards with images', async () => {
    const entry: DiffEntry<unknown> = {
      key: 'Page/Button',
      changeType: 'upstream_changed',
      base: { name: 'Button' },
      upstream: { name: 'Button' },
      local: { name: 'Button' },
      details: ['Description changed'],
    };

    const report = makeReport({
      components: [entry],
      summary: { total: 1, unchanged: 0, upstreamChanges: 1, localChanges: 0, conflicts: 0, newUpstream: 0, newLocal: 0, deletedUpstream: 0, deletedLocal: 0 },
    });

    const dl = makeDownloadResult({
      images: [
        { componentKey: 'Page/Button', filename: 'page_button_upstream.png', label: 'upstream', nodeId: '1:1' },
        { componentKey: 'Page/Button', filename: 'page_button_local.png', label: 'local', nodeId: '1:2' },
      ],
      diffs: [
        { componentKey: 'Page/Button', filename: 'page_button_diff.png', comparison: 'upstream_vs_local', diffPercent: 12.5, diffPixels: 500, totalPixels: 4000 },
      ],
    });

    const result = await generateReport(report, dl, { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    expect(html).toContain('Page/Button');
    expect(html).toContain('page_button_upstream.png');
    expect(html).toContain('page_button_local.png');
    expect(html).toContain('page_button_diff.png');
    expect(html).toContain('12.5%');
    expect(html).toContain('Show pixel diff');
  });

  it('includes style diff table', async () => {
    const entry: DiffEntry<unknown> = {
      key: 'Primary/500',
      changeType: 'upstream_changed',
      base: { type: 'FILL', name: 'Primary/500', fills: [{ hex: '#ff0000' }] },
      upstream: { type: 'FILL', name: 'Primary/500', fills: [{ hex: '#0000ff' }] },
      local: { type: 'FILL', name: 'Primary/500', fills: [{ hex: '#ff0000' }] },
      details: ['Upstream fill: #ff0000 → #0000ff'],
    };

    const report = makeReport({
      styles: [entry],
      summary: { total: 1, unchanged: 0, upstreamChanges: 1, localChanges: 0, conflicts: 0, newUpstream: 0, newLocal: 0, deletedUpstream: 0, deletedLocal: 0 },
    });

    const result = await generateReport(report, makeDownloadResult(), { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    expect(html).toContain('Primary/500');
    expect(html).toContain('FILL');
    expect(html).toContain('#ff0000');
    expect(html).toContain('#0000ff');
    expect(html).toContain('color-swatch');
  });

  it('includes variable diff table', async () => {
    const entry: DiffEntry<unknown> = {
      key: 'Colors/primary',
      changeType: 'upstream_changed',
      base: { collection: 'Colors', name: 'primary', type: 'color', valuesByMode: { default: '#6459ea' } },
      upstream: { collection: 'Colors', name: 'primary', type: 'color', valuesByMode: { default: '#ff0000' } },
      local: { collection: 'Colors', name: 'primary', type: 'color', valuesByMode: { default: '#6459ea' } },
      details: ['Upstream [default]: "#6459ea" → "#ff0000"'],
    };

    const report = makeReport({
      variables: [entry],
      summary: { total: 1, unchanged: 0, upstreamChanges: 1, localChanges: 0, conflicts: 0, newUpstream: 0, newLocal: 0, deletedUpstream: 0, deletedLocal: 0 },
    });

    const result = await generateReport(report, makeDownloadResult(), { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    expect(html).toContain('Colors/primary');
    expect(html).toContain('Colors');
    expect(html).toContain('color');
  });

  it('includes interactive JS for filters and search', async () => {
    const report = makeReport();
    const result = await generateReport(report, makeDownloadResult(), { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    expect(html).toContain('search-input');
    expect(html).toContain('filter-btn');
    expect(html).toContain('applyFilters');
    expect(html).toContain('toggleDetails');
    expect(html).toContain('toggleOverlay');
  });

  it('includes embedded CSS', async () => {
    const report = makeReport();
    const result = await generateReport(report, makeDownloadResult(), { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    expect(html).toContain('<style>');
    expect(html).toContain('.card-grid');
    expect(html).toContain('.badge');
    expect(html).toContain('@media');
  });

  it('escapes HTML in component names', async () => {
    const entry: DiffEntry<unknown> = {
      key: '<script>alert("xss")</script>',
      changeType: 'new_upstream',
      base: undefined,
      upstream: { name: '<script>alert("xss")</script>' },
      local: undefined,
      details: ['New component'],
    };

    const report = makeReport({
      components: [entry],
      summary: { total: 1, unchanged: 0, upstreamChanges: 0, localChanges: 0, conflicts: 0, newUpstream: 1, newLocal: 0, deletedUpstream: 0, deletedLocal: 0 },
    });

    const result = await generateReport(report, makeDownloadResult(), { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    // Should NOT contain raw script tag
    expect(html).not.toContain('<script>alert');
    // Should contain escaped version
    expect(html).toContain('&lt;script&gt;');
  });

  it('handles conflict with upstream and local images', async () => {
    const entry: DiffEntry<unknown> = {
      key: 'Page/Card',
      changeType: 'conflict',
      base: { name: 'Card' },
      upstream: { name: 'Card' },
      local: { name: 'Card' },
      details: ['Both changed'],
    };

    const report = makeReport({
      components: [entry],
      summary: { total: 1, unchanged: 0, upstreamChanges: 0, localChanges: 0, conflicts: 1, newUpstream: 0, newLocal: 0, deletedUpstream: 0, deletedLocal: 0 },
    });

    const dl = makeDownloadResult({
      images: [
        { componentKey: 'Page/Card', filename: 'card_upstream.png', label: 'upstream', nodeId: '1:2' },
        { componentKey: 'Page/Card', filename: 'card_local.png', label: 'local', nodeId: '1:3' },
      ],
      diffs: [
        { componentKey: 'Page/Card', filename: 'card_diff.png', comparison: 'upstream_vs_local', diffPercent: 5.0, diffPixels: 200, totalPixels: 4000 },
      ],
    });

    const result = await generateReport(report, dl, { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    expect(html).toContain('card_upstream.png');
    expect(html).toContain('card_local.png');
    expect(html).toContain('card_diff.png');
    expect(html).toContain('Upstream (Constructor)');
    expect(html).toContain('Local (Fork)');
  });

  it('shows "no changes" message when report is empty', async () => {
    const report = makeReport();
    const result = await generateReport(report, makeDownloadResult(), { outputDir: tmpDir });
    const html = await readFile(result.htmlPath, 'utf-8');

    expect(html).toContain('No changes detected');
  });
});
