/**
 * E2E test: full pipeline from normalization through diff to report generation.
 * Uses realistic fixture data to exercise the complete flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFile, rm, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { mkdtemp } from 'node:fs/promises';
import type { GetFileResponse } from '../src/figma/types.js';
import {
  normalizeComponents,
  extractStyleMetadata,
  enrichStylesWithNodeData,
  normalizeVariables,
  diffComponents,
  diffStyles,
  diffVariables,
  computeSummary,
  generateReport,
  type DiffReport,
  type DiffEntry,
  type NormalizedStyleMap,
  type DownloadResult,
} from '../src/index.js';

// ── Fixture builders ────────────────────────────────────────────────

/** Create a minimal Figma file response with components and styles */
function makeFileResponse(overrides: {
  name?: string;
  components?: Record<string, { key: string; name: string; description: string; componentSetId?: string }>;
  componentSets?: Record<string, { key: string; name: string; description: string }>;
  styles?: Record<string, { key: string; name: string; description: string; styleType: string }>;
  nodes?: Array<{ id: string; name: string; type: string; children?: unknown[] }>;
}): GetFileResponse {
  const { name = 'TestLib', components = {}, componentSets = {}, styles = {}, nodes = [] } = overrides;
  return {
    name,
    version: '123',
    lastModified: '2024-06-01T00:00:00Z',
    thumbnailUrl: '',
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [
        {
          id: '1:0',
          name: 'Page',
          type: 'CANVAS',
          children: nodes,
        },
      ],
    },
    components,
    componentSets,
    styles,
  } as GetFileResponse;
}

// ── Tests ───────────────────────────────────────────────────────────

describe('E2E pipeline', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'e2e-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('full three-way diff pipeline: components + styles → report generation', async () => {
    // ── Base file (at fork time) ──
    const baseFile = makeFileResponse({
      name: 'Constructor',
      componentSets: {
        '10:1': { key: 'cs1', name: 'Button', description: 'A button' },
      },
      components: {
        '10:2': { key: 'c1', name: 'Type=Primary', description: '', componentSetId: '10:1' },
        '10:3': { key: 'c2', name: 'Type=Secondary', description: '', componentSetId: '10:1' },
      },
      styles: {
        '20:1': { key: 's1', name: 'Primary/500', description: '', styleType: 'FILL' },
      },
      nodes: [
        {
          id: '10:1', name: 'Button', type: 'COMPONENT_SET',
          children: [
            { id: '10:2', name: 'Type=Primary', type: 'COMPONENT' },
            { id: '10:3', name: 'Type=Secondary', type: 'COMPONENT' },
          ],
        },
      ],
    });

    // ── Upstream file (constructor now — added a variant) ──
    const upstreamFile = makeFileResponse({
      name: 'Constructor',
      componentSets: {
        '10:1': { key: 'cs1', name: 'Button', description: 'A button - updated' },
      },
      components: {
        '10:2': { key: 'c1', name: 'Type=Primary', description: '', componentSetId: '10:1' },
        '10:3': { key: 'c2', name: 'Type=Secondary', description: '', componentSetId: '10:1' },
        '10:4': { key: 'c3', name: 'Type=Tertiary', description: '', componentSetId: '10:1' },
      },
      styles: {
        '20:1': { key: 's1', name: 'Primary/500', description: '', styleType: 'FILL' },
        '20:2': { key: 's2', name: 'Primary/600', description: '', styleType: 'FILL' },
      },
      nodes: [
        {
          id: '10:1', name: 'Button', type: 'COMPONENT_SET',
          children: [
            { id: '10:2', name: 'Type=Primary', type: 'COMPONENT' },
            { id: '10:3', name: 'Type=Secondary', type: 'COMPONENT' },
            { id: '10:4', name: 'Type=Tertiary', type: 'COMPONENT' },
          ],
        },
      ],
    });

    // ── Local file (fork now — renamed variant, modified description) ──
    const localFile = makeFileResponse({
      name: 'MyFork',
      componentSets: {
        '10:1': { key: 'cs1', name: 'Button', description: 'My custom button' },
      },
      components: {
        '10:2': { key: 'c1', name: 'Type=Primary', description: '', componentSetId: '10:1' },
        '10:3': { key: 'c2', name: 'Type=Secondary', description: '', componentSetId: '10:1' },
      },
      styles: {
        '20:1': { key: 's1', name: 'Primary/500', description: '', styleType: 'FILL' },
      },
      nodes: [
        {
          id: '10:1', name: 'Button', type: 'COMPONENT_SET',
          children: [
            { id: '10:2', name: 'Type=Primary', type: 'COMPONENT' },
            { id: '10:3', name: 'Type=Secondary', type: 'COMPONENT' },
          ],
        },
      ],
    });

    // ── Normalize ──
    const baseComponents = normalizeComponents(baseFile);
    const upstreamComponents = normalizeComponents(upstreamFile);
    const localComponents = normalizeComponents(localFile);

    expect(baseComponents.size).toBeGreaterThan(0);
    expect(upstreamComponents.size).toBeGreaterThan(0);
    expect(localComponents.size).toBeGreaterThan(0);

    // Styles: extract metadata + enrich with empty nodes (no node data in this test)
    const baseMeta = extractStyleMetadata(baseFile);
    const upstreamMeta = extractStyleMetadata(upstreamFile);
    const localMeta = extractStyleMetadata(localFile);

    enrichStylesWithNodeData(baseMeta.styles, { name: '', nodes: {} });
    enrichStylesWithNodeData(upstreamMeta.styles, { name: '', nodes: {} });
    enrichStylesWithNodeData(localMeta.styles, { name: '', nodes: {} });

    // ── Diff ──
    const componentDiffs = diffComponents(baseComponents, upstreamComponents, localComponents);
    const styleDiffs = diffStyles(baseMeta.styles, upstreamMeta.styles, localMeta.styles);

    // Component should have changes (upstream added variant + changed description; local changed description)
    expect(componentDiffs.length).toBeGreaterThan(0);
    const buttonDiff = componentDiffs.find(d => d.key.includes('Button'));
    expect(buttonDiff).toBeDefined();
    expect(buttonDiff!.changeType).toBe('conflict'); // both sides changed description

    // Style diff: upstream added Primary/600
    const newStyleDiff = styleDiffs.find(d => d.key.includes('600'));
    expect(newStyleDiff).toBeDefined();
    expect(newStyleDiff!.changeType).toBe('new_upstream');

    // ── Summary ──
    const allDiffs = [...componentDiffs, ...styleDiffs];
    const summary = computeSummary(allDiffs);
    expect(summary.total).toBeGreaterThan(0);

    // ── Generate report ──
    const downloadResult: DownloadResult = {
      images: [],
      diffs: [],
      warnings: [],
    };

    const report: DiffReport = {
      constructorName: 'Constructor',
      forkName: 'MyFork',
      baselineVersionId: 'ver_002',
      baselineVersionDate: '2024-03-10T08:00:00Z',
      generatedAt: new Date().toISOString(),
      components: componentDiffs,
      styles: styleDiffs,
      variables: [],
      summary,
    };

    const result = await generateReport(report, downloadResult, {
      outputDir: tempDir,
    });

    // Verify report.html exists and contains expected content
    const html = await readFile(result.htmlPath, 'utf-8');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Constructor vs MyFork');
    expect(html).toContain('Button');
    expect(html).toContain('Primary/600');
    expect(html).toContain('Conflict'); // badge for the Button component

    // Verify data.json exists and is valid
    const dataJson = await readFile(result.dataPath, 'utf-8');
    const data = JSON.parse(dataJson);
    expect(data.constructorName).toBe('Constructor');
    expect(data.forkName).toBe('MyFork');
    expect(data.components.length).toBeGreaterThan(0);
    expect(data.summary.total).toBe(summary.total);
  });

  it('two-way diff pipeline (empty base) produces report', async () => {
    // Simulate fallback: empty base maps
    const upstreamFile = makeFileResponse({
      name: 'LibA',
      componentSets: {
        '10:1': { key: 'cs1', name: 'Card', description: '' },
      },
      components: {
        '10:2': { key: 'c1', name: 'Size=Small', description: '', componentSetId: '10:1' },
      },
      nodes: [
        {
          id: '10:1', name: 'Card', type: 'COMPONENT_SET',
          children: [{ id: '10:2', name: 'Size=Small', type: 'COMPONENT' }],
        },
      ],
    });

    const localFile = makeFileResponse({
      name: 'LibB',
      componentSets: {
        '10:1': { key: 'cs1', name: 'Card', description: 'Modified' },
      },
      components: {
        '10:2': { key: 'c1', name: 'Size=Small', description: '', componentSetId: '10:1' },
        '10:3': { key: 'c2', name: 'Size=Large', description: '', componentSetId: '10:1' },
      },
      nodes: [
        {
          id: '10:1', name: 'Card', type: 'COMPONENT_SET',
          children: [
            { id: '10:2', name: 'Size=Small', type: 'COMPONENT' },
            { id: '10:3', name: 'Size=Large', type: 'COMPONENT' },
          ],
        },
      ],
    });

    // Two-way diff: empty base
    const emptyBase = new Map();
    const upstreamComponents = normalizeComponents(upstreamFile);
    const localComponents = normalizeComponents(localFile);

    const componentDiffs = diffComponents(emptyBase, upstreamComponents, localComponents);

    // With empty base, everything should be "new" or "conflict" (both added)
    expect(componentDiffs.length).toBeGreaterThan(0);
    // Both upstream and local have Card, so it should be detected as new_upstream (both added, same key)
    // or conflict if different
    const cardDiff = componentDiffs.find(d => d.key.includes('Card'));
    expect(cardDiff).toBeDefined();

    const summary = computeSummary(componentDiffs);
    const report: DiffReport = {
      constructorName: 'LibA',
      forkName: 'LibB',
      baselineVersionId: '(two-way fallback)',
      baselineVersionDate: 'N/A',
      generatedAt: new Date().toISOString(),
      components: componentDiffs,
      styles: [],
      variables: [],
      summary,
    };

    const downloadResult: DownloadResult = { images: [], diffs: [], warnings: [] };
    const result = await generateReport(report, downloadResult, { outputDir: tempDir });

    const html = await readFile(result.htmlPath, 'utf-8');
    expect(html).toContain('LibA vs LibB');
    expect(html).toContain('Card');
  });

  it('empty diff produces empty state in report', async () => {
    // Two identical files → no changes
    const file = makeFileResponse({
      name: 'Identical',
      componentSets: { '10:1': { key: 'cs1', name: 'X', description: '' } },
      components: { '10:2': { key: 'c1', name: 'V=1', description: '', componentSetId: '10:1' } },
      nodes: [
        {
          id: '10:1', name: 'X', type: 'COMPONENT_SET',
          children: [{ id: '10:2', name: 'V=1', type: 'COMPONENT' }],
        },
      ],
    });

    const components = normalizeComponents(file);
    const diffs = diffComponents(components, components, components);
    expect(diffs).toHaveLength(0);

    const summary = computeSummary(diffs);
    expect(summary.total).toBe(0);

    const report: DiffReport = {
      constructorName: 'Lib',
      forkName: 'Lib',
      baselineVersionId: 'v1',
      baselineVersionDate: '2024-01-01',
      generatedAt: new Date().toISOString(),
      components: diffs,
      styles: [],
      variables: [],
      summary,
    };

    const downloadResult: DownloadResult = { images: [], diffs: [], warnings: [] };
    const result = await generateReport(report, downloadResult, { outputDir: tempDir });

    const html = await readFile(result.htmlPath, 'utf-8');
    expect(html).toContain('No changes detected');
    expect(html).toContain('empty-state');
    // Should NOT contain the filter UI elements or card grid HTML when there are no changes
    expect(html).not.toContain('id="search-input"');
    expect(html).not.toContain('class="card-grid"');
  });

  it('variables pipeline works end-to-end', async () => {
    // Simulate Tokens Studio W3C format
    const constructorJson = {
      colors: {
        $type: 'color',
        primary: { $value: '#3B82F6', $type: 'color' },
        secondary: { $value: '#22C55E', $type: 'color' },
      },
    };

    const forkJson = {
      colors: {
        $type: 'color',
        primary: { $value: '#EF4444', $type: 'color' },  // changed
        secondary: { $value: '#22C55E', $type: 'color' }, // same
        tertiary: { $value: '#8B5CF6', $type: 'color' },  // new
      },
    };

    const constructorVars = normalizeVariables(constructorJson);
    const forkVars = normalizeVariables(forkJson);
    const emptyBase = new Map();

    const variableDiffs = diffVariables(emptyBase, constructorVars, forkVars);
    expect(variableDiffs.length).toBeGreaterThan(0);

    // primary changed between upstream and local → conflict (both added since no base)
    const primaryDiff = variableDiffs.find(d => d.key.includes('primary'));
    expect(primaryDiff).toBeDefined();

    const summary = computeSummary(variableDiffs);
    expect(summary.total).toBeGreaterThan(0);

    const report: DiffReport = {
      constructorName: 'Lib',
      forkName: 'Fork',
      baselineVersionId: 'v1',
      baselineVersionDate: '2024-01-01',
      generatedAt: new Date().toISOString(),
      components: [],
      styles: [],
      variables: variableDiffs,
      summary,
    };

    const downloadResult: DownloadResult = { images: [], diffs: [], warnings: [] };
    const result = await generateReport(report, downloadResult, { outputDir: tempDir });

    const html = await readFile(result.htmlPath, 'utf-8');
    expect(html).toContain('Variables');
    expect(html).toContain('primary');
  });

  it('rename detection works through the full component pipeline', async () => {
    // Base has "OldButton"
    const baseFile = makeFileResponse({
      name: 'Lib',
      componentSets: {
        '10:1': { key: 'cs1', name: 'OldButton', description: '' },
      },
      components: {
        '10:2': { key: 'c1', name: 'State=Default', description: '', componentSetId: '10:1' },
      },
      nodes: [
        {
          id: '10:1', name: 'OldButton', type: 'COMPONENT_SET',
          children: [{ id: '10:2', name: 'State=Default', type: 'COMPONENT' }],
        },
      ],
    });

    // Upstream renamed to "NewButton" (same structure)
    const upstreamFile = makeFileResponse({
      name: 'Lib',
      componentSets: {
        '11:1': { key: 'cs2', name: 'NewButton', description: '' },
      },
      components: {
        '11:2': { key: 'c2', name: 'State=Default', description: '', componentSetId: '11:1' },
      },
      nodes: [
        {
          id: '11:1', name: 'NewButton', type: 'COMPONENT_SET',
          children: [{ id: '11:2', name: 'State=Default', type: 'COMPONENT' }],
        },
      ],
    });

    // Local still has "OldButton" (unchanged from base)
    const localFile = baseFile;

    const baseComponents = normalizeComponents(baseFile);
    const upstreamComponents = normalizeComponents(upstreamFile);
    const localComponents = normalizeComponents(localFile);

    const diffs = diffComponents(baseComponents, upstreamComponents, localComponents);

    // Should detect rename instead of delete+add
    const renameDiff = diffs.find(d =>
      d.changeType === 'renamed_upstream',
    );
    expect(renameDiff).toBeDefined();
    expect(renameDiff!.details[0]).toContain('Renamed');
    expect(renameDiff!.details[0]).toContain('OldButton');
    expect(renameDiff!.details[0]).toContain('NewButton');
  });
});
