import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getReportsDir } from '@/lib/reports-dir';
import { mapReportData } from '@/lib/data-mapper';
import { NavBar } from '@/components/layout/nav-bar';
import { ReportShell } from '@/components/report/report-shell';
import { RegenerateButton } from '@/components/report/regenerate-button';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params;

  // Prevent directory traversal — allowlist: alphanumeric, dash, underscore, dot (no ..)
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return <ErrorState message="Invalid report slug." />;
  }

  const reportDir = join(getReportsDir(), slug);

  let data;
  try {
    const raw = await readFile(join(reportDir, 'data.json'), 'utf-8');
    data = mapReportData(JSON.parse(raw));
  } catch {
    return <ErrorState message="Report not found." />;
  }

  return (
    <div className="h-screen flex flex-col">
      <NavBar>
        <RegenerateButton
          constructorFileKey={data.meta.constructorFileKey}
          forkFileKey={data.meta.forkFileKey}
        />
        <a
          href={`/api/reports/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors"
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--text-tertiary)',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid var(--border-default)',
          }}
        >
          Export ↗
        </a>
      </NavBar>
      <ReportShell data={data} slug={slug} />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="h-screen flex flex-col">
      <NavBar />
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p style={{ fontSize: 14, color: 'var(--color-removed)' }}>{message}</p>
        <Link
          href="/"
          className="transition-colors"
          style={{ fontSize: 12, color: 'var(--text-tertiary)' }}
        >
          ← Back to reports
        </Link>
      </div>
    </div>
  );
}
