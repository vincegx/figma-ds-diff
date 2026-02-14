import Link from 'next/link';
import { NavBar } from '@/components/layout/nav-bar';
import { Hero } from '@/components/home/hero';
import { StatCards } from '@/components/home/stat-cards';
import { ReportTable } from '@/components/home/report-table';
import type { ReportEntry } from '@/app/api/reports/route';

async function getReports(): Promise<ReportEntry[]> {
  // Import the server-side logic directly to avoid fetch-to-self in SSR
  const { readdir, readFile, stat } = await import('node:fs/promises');
  const { join } = await import('node:path');
  const { getReportsDir } = await import('@/lib/reports-dir');

  const reportsDir = getReportsDir();

  let entries: string[];
  try {
    entries = await readdir(reportsDir);
  } catch {
    return [];
  }

  const reports = await Promise.all(
    entries.map(async (entry): Promise<ReportEntry | null> => {
      const fullPath = join(reportsDir, entry);
      const stats = await stat(fullPath).catch(() => null);
      if (!stats?.isDirectory()) return null;

      const htmlExists = await stat(join(fullPath, 'report.html'))
        .then(() => true)
        .catch(() => false);
      if (!htmlExists) return null;

      const dataPath = join(fullPath, 'data.json');
      const hasData = await stat(dataPath)
        .then(() => true)
        .catch(() => false);

      const dateMatch = entry.match(/^(\d{4}-\d{2}-\d{2})(?:_(\d{6}))?/);
      const date = dateMatch?.[1] ?? '';
      const time = dateMatch?.[2]
        ? `${dateMatch[2].slice(0, 2)}:${dateMatch[2].slice(2, 4)}`
        : '';
      const folderName = entry
        .replace(/^\d{4}-\d{2}-\d{2}(_\d{6})?_/, '')
        .replace(/_/g, ' ');

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
            baseline = d.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
          }
          if (data.summary) {
            upstream =
              (data.summary.upstreamChanges ?? 0) +
              (data.summary.newUpstream ?? 0);
            local =
              (data.summary.localChanges ?? 0) + (data.summary.newLocal ?? 0);
            conflicts = data.summary.conflicts ?? 0;
            total = data.summary.total ?? 0;
          }
        } catch {
          // Failed to parse data.json — use folder name fallback
        }
      }

      if (!fork) {
        const vsMatch = folderName.match(/^(.+?)\s+vs\s+(.+)$/i);
        if (vsMatch?.[1] && vsMatch[2]) {
          name = vsMatch[1];
          fork = vsMatch[2];
        }
      }

      return { slug: entry, name, fork, date, time, baseline, upstream, local, conflicts, total, hasData };
    }),
  );

  return reports
    .filter((r): r is ReportEntry => r !== null)
    .sort((a, b) => b.slug.localeCompare(a.slug));
}

export default async function HomePage() {
  const reports = await getReports();

  return (
    <div className="min-h-screen">
      <NavBar>
        <Link
          href="/new"
          className="flex items-center gap-1.5 text-white text-xs font-semibold px-4 py-2 rounded-lg no-underline"
          style={{ background: 'linear-gradient(135deg, var(--accent-from), var(--accent-to))' }}
        >
          <span className="text-[15px] leading-none">+</span> New
        </Link>
      </NavBar>

      <div className="max-w-content mx-auto" style={{ padding: '0 clamp(16px, 4vw, 32px)' }}>
        <Hero />
        <StatCards reports={reports} />
        <ReportTable reports={reports} />
      </div>
    </div>
  );
}
