import { NextResponse } from 'next/server';
import { readdir, readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getReportsDir } from '@/lib/reports-dir';

export interface ReportEntry {
  slug: string;
  name: string;
  fork: string;
  date: string;
  time: string;
  baseline: string;
  upstream: number;
  local: number;
  conflicts: number;
  total: number;
  hasData: boolean;
}

export async function GET() {
  try {
    const reportsDir = getReportsDir();

    let entries: string[];
    try {
      entries = await readdir(reportsDir);
    } catch {
      // Reports dir doesn't exist yet — return empty list
      return NextResponse.json({ reports: [] });
    }

    const reports: ReportEntry[] = [];

    for (const entry of entries) {
      const fullPath = join(reportsDir, entry);
      const stats = await stat(fullPath).catch(() => null);
      if (!stats?.isDirectory()) continue;

      // Check if report.html exists
      const htmlExists = await stat(join(fullPath, 'report.html'))
        .then(() => true)
        .catch(() => false);
      if (!htmlExists) continue;

      const dataPath = join(fullPath, 'data.json');
      const hasData = await stat(dataPath)
        .then(() => true)
        .catch(() => false);

      // Extract date from folder name (YYYY-MM-DD_HHmmss_Name_vs_Fork or legacy YYYY-MM-DD_Name)
      const dateMatch = entry.match(/^(\d{4}-\d{2}-\d{2})(?:_(\d{6}))?/);
      const date = dateMatch?.[1] ?? '';
      const time = dateMatch?.[2] ? `${dateMatch[2].slice(0,2)}:${dateMatch[2].slice(2,4)}` : '';
      const folderName = entry
        .replace(/^\d{4}-\d{2}-\d{2}(_\d{6})?_/, '')
        .replace(/_/g, ' ');

      // Read data.json for rich metadata
      let name = folderName;
      let fork = '';
      let baseline = '';
      let upstream = 0;
      let local = 0;
      let conflicts = 0;
      let total = 0;

      if (hasData) {
        try {
          const raw = await readFile(dataPath, 'utf-8');
          const data = JSON.parse(raw) as {
            constructorName?: string;
            forkName?: string;
            baselineVersionDate?: string;
            summary?: {
              total?: number;
              upstreamChanges?: number;
              localChanges?: number;
              conflicts?: number;
              newUpstream?: number;
              newLocal?: number;
            };
          };
          if (data.constructorName) name = data.constructorName;
          if (data.forkName) fork = data.forkName;
          if (data.baselineVersionDate) {
            const d = new Date(data.baselineVersionDate);
            baseline = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          }
          if (data.summary) {
            upstream = (data.summary.upstreamChanges ?? 0) + (data.summary.newUpstream ?? 0);
            local = (data.summary.localChanges ?? 0) + (data.summary.newLocal ?? 0);
            conflicts = data.summary.conflicts ?? 0;
            total = data.summary.total ?? 0;
          }
        } catch {
          // Failed to parse data.json — use folder name fallback
        }
      }

      // Fallback: extract fork from folder name pattern "X vs Y"
      if (!fork) {
        const vsMatch = folderName.match(/^(.+?)\s+vs\s+(.+)$/i);
        if (vsMatch?.[1] && vsMatch[2]) {
          name = vsMatch[1];
          fork = vsMatch[2];
        }
      }

      reports.push({ slug: entry, name, fork, date, time, baseline, upstream, local, conflicts, total, hasData });
    }

    // Sort by slug descending (newest first — slug starts with YYYY-MM-DD_HHmmss)
    reports.sort((a, b) => b.slug.localeCompare(a.slug));

    return NextResponse.json({ reports });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to list reports' },
      { status: 500 },
    );
  }
}
