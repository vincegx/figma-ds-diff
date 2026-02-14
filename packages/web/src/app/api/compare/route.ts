import { join } from 'node:path';
import { mkdir } from 'node:fs/promises';
import {
  parseFigmaUrl,
  createFigmaClient,
  QuotaTracker,
  resolveBaseline,
  fetchFile,
  fetchNodes,
  normalizeComponents,
  extractStyleMetadata,
  enrichStylesWithNodeData,
  normalizeVariables,
  diffComponents,
  diffStyles,
  diffVariables,
  computeSummary,
  downloadComponentImages,
  generateReport,
  FigmaApiError,
  type DiffReport,
  type DiffEntry,
  type NormalizedStyleMap,
} from '@figma-ds-diff/core';
import { getReportsDir } from '@/lib/reports-dir';
import { getQuotaFilePath } from '@/lib/quota-path';

export const maxDuration = 300; // 5 minutes for long comparisons

export async function POST(request: Request) {
  const encoder = new TextEncoder();
  let aborted = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (aborted) return;
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
        );
      }

      function progress(step: string) {
        send('progress', { step });
      }

      try {
        // Parse request body
        const body = await request.json() as {
          constructorUrl: string;
          forkUrl: string;
          constructorVariablesJson?: string;
          forkVariablesJson?: string;
        };

        const { constructorUrl, forkUrl, constructorVariablesJson, forkVariablesJson } = body;

        // Validate PAT
        const pat = process.env['FIGMA_PAT'];
        if (!pat) {
          send('error', { message: 'FIGMA_PAT not configured. Set it in the .env file.' });
          controller.close();
          return;
        }

        // Step 1: Parse URLs
        progress('Parsing Figma URLs...');
        let constructorFileKey: string;
        let forkFileKey: string;
        try {
          constructorFileKey = parseFigmaUrl(constructorUrl).fileKey;
          forkFileKey = parseFigmaUrl(forkUrl).fileKey;
        } catch (err) {
          send('error', { message: `Invalid Figma URL: ${err instanceof Error ? err.message : String(err)}` });
          controller.close();
          return;
        }

        const tracker = new QuotaTracker(getQuotaFilePath());
        const client = createFigmaClient({
          personalAccessToken: pat,
          onRequest: (endpoint, status) => { void tracker.trackCall(endpoint, status); },
        });

        // Step 2: Resolve baseline
        progress('Resolving baseline version...');
        const baseline = await resolveBaseline(client, constructorFileKey, forkFileKey);

        if (baseline.isTwoWayFallback) {
          for (const warning of baseline.warnings) {
            send('progress', { step: `Warning: ${warning}` });
          }
          send('progress', { step: 'Using two-way diff (upstream vs local only, no change attribution).' });
        } else {
          send('progress', {
            step: `Baseline found: ${baseline.versionId} (${baseline.versionDate})`,
          });
          for (const warning of baseline.warnings) {
            send('progress', { step: `Warning: ${warning}` });
          }
        }

        // Step 3: Fetch files
        progress(baseline.isTwoWayFallback
          ? 'Fetching Figma files (2 versions)...'
          : 'Fetching Figma files (3 versions)...',
        );

        const [upstreamFile, localFile] = await Promise.all([
          fetchFile(client, constructorFileKey),
          fetchFile(client, forkFileKey),
        ]);

        // Fetch base file only for three-way diff
        const baseFile = baseline.isTwoWayFallback
          ? null
          : await fetchFile(client, constructorFileKey, { version: baseline.versionId });

        // Step 4: Normalize components
        progress('Normalizing components...');
        const baseComponents = baseFile ? normalizeComponents(baseFile) : new Map();
        const upstreamComponents = normalizeComponents(upstreamFile);
        const localComponents = normalizeComponents(localFile);

        // Step 5: Normalize styles (requires node data fetch)
        progress('Fetching style node data...');

        let baseStyles: NormalizedStyleMap = new Map();

        if (baseFile) {
          const baseMeta = extractStyleMetadata(baseFile);
          const baseNodes = baseMeta.nodeIdsToFetch.length > 0
            ? await fetchNodes(client, constructorFileKey, baseMeta.nodeIdsToFetch, { version: baseline.versionId })
            : { name: '', nodes: {} };
          enrichStylesWithNodeData(baseMeta.styles, baseNodes);
          baseStyles = baseMeta.styles;
        }

        const upstreamMeta = extractStyleMetadata(upstreamFile);
        const localMeta = extractStyleMetadata(localFile);

        const [upstreamNodes, localNodes] = await Promise.all([
          upstreamMeta.nodeIdsToFetch.length > 0
            ? fetchNodes(client, constructorFileKey, upstreamMeta.nodeIdsToFetch)
            : Promise.resolve({ name: '', nodes: {} }),
          localMeta.nodeIdsToFetch.length > 0
            ? fetchNodes(client, forkFileKey, localMeta.nodeIdsToFetch)
            : Promise.resolve({ name: '', nodes: {} }),
        ]);

        progress('Normalizing styles...');
        enrichStylesWithNodeData(upstreamMeta.styles, upstreamNodes);
        enrichStylesWithNodeData(localMeta.styles, localNodes);

        // Step 6: Normalize variables (if provided)
        // Variables come from user-uploaded JSON — no historical baseline exists.
        // Use constructor as both base and upstream for a two-way diff (constructor vs fork).
        let variableDiffs: DiffEntry<unknown>[] = [];
        if (constructorVariablesJson && forkVariablesJson) {
          progress('Normalizing variables...');
          try {
            const constructorVars = normalizeVariables(JSON.parse(constructorVariablesJson));
            const forkVars = normalizeVariables(JSON.parse(forkVariablesJson));
            variableDiffs = diffVariables(constructorVars, constructorVars, forkVars);
          } catch (err) {
            send('progress', {
              step: `Warning: Variable parsing failed: ${err instanceof Error ? err.message : String(err)}`,
            });
          }
        }

        // Step 7: Run diffs
        progress(baseline.isTwoWayFallback
          ? 'Running two-way diff on components...'
          : 'Running three-way diff on components...',
        );
        const componentDiffs = diffComponents(baseComponents, upstreamComponents, localComponents);

        progress(baseline.isTwoWayFallback
          ? 'Running two-way diff on styles...'
          : 'Running three-way diff on styles...',
        );
        const styleDiffs = diffStyles(baseStyles, upstreamMeta.styles, localMeta.styles);

        const allDiffs = [...componentDiffs, ...styleDiffs, ...variableDiffs];
        const summary = computeSummary(allDiffs);

        send('progress', {
          step: `Diff complete: ${summary.total} changes (${summary.upstreamChanges} upstream, ${summary.localChanges} local, ${summary.conflicts} conflicts)`,
        });

        // Step 8: Create report directory (with HHmmss to avoid overwrites)
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toISOString().slice(11, 19).replace(/:/g, '');
        const safeName = (name: string) =>
          name.replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 50);
        const slug = `${date}_${time}_${safeName(upstreamFile.name)}_vs_${safeName(localFile.name)}`;
        const reportsDir = getReportsDir();
        const reportDir = join(reportsDir, slug);
        const imagesDir = join(reportDir, 'images');

        await mkdir(reportsDir, { recursive: true });
        await mkdir(imagesDir, { recursive: true });

        // Step 9: Download component images
        progress(`Downloading images for ${componentDiffs.length} changed components...`);
        const downloadResult = await downloadComponentImages(
          client,
          componentDiffs,
          constructorFileKey,
          forkFileKey,
          imagesDir,
          {
            scale: 2,
            format: 'png',
            onProgress: (step) => progress(step),
          },
        );

        if (downloadResult.warnings.length > 0) {
          for (const warning of downloadResult.warnings) {
            send('progress', { step: `Warning: ${warning}` });
          }
        }

        // Step 10: Generate report
        progress('Generating report...');
        const report: DiffReport = {
          constructorName: upstreamFile.name,
          forkName: localFile.name,
          constructorFileKey,
          forkFileKey,
          baselineVersionId: baseline.versionId || '(two-way fallback)',
          baselineVersionDate: baseline.versionDate || 'N/A',
          generatedAt: new Date().toISOString(),
          components: componentDiffs,
          styles: styleDiffs,
          variables: variableDiffs,
          summary,
        };

        await generateReport(report, downloadResult, {
          outputDir: reportDir,
        });

        // Done!
        send('complete', {
          slug,
          summary,
          imageCount: downloadResult.images.length,
          diffCount: downloadResult.diffs.length,
        });
      } catch (err) {
        let message: string;
        if (err instanceof FigmaApiError) {
          message = `Figma API error (${err.status}): ${err.body}`;
        } else {
          message = err instanceof Error ? err.message : String(err);
        }
        send('error', { message });
      } finally {
        if (!aborted) {
          controller.close();
        }
      }
    },
    cancel() {
      aborted = true;
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
