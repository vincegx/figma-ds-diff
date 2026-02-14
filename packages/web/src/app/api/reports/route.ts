import { NextResponse } from 'next/server';
import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { getReportsDir } from '@/lib/reports-dir';

export interface ReportEntry {
  slug: string;
  name: string;
  date: string;
  time: string;
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

      const hasData = await stat(join(fullPath, 'data.json'))
        .then(() => true)
        .catch(() => false);

      // Extract date from folder name (YYYY-MM-DD_HHmmss_Name_vs_Fork or legacy YYYY-MM-DD_Name)
      const dateMatch = entry.match(/^(\d{4}-\d{2}-\d{2})(?:_(\d{6}))?/);
      const date = dateMatch?.[1] ?? '';
      const time = dateMatch?.[2] ? `${dateMatch[2].slice(0,2)}:${dateMatch[2].slice(2,4)}` : '';
      const name = entry
        .replace(/^\d{4}-\d{2}-\d{2}(_\d{6})?_/, '')
        .replace(/_/g, ' ');

      reports.push({
        slug: entry,
        name,
        date,
        time,
        hasData,
      });
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
