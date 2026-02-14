import Link from 'next/link';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getReportsDir } from '@/lib/reports-dir';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default async function ReportPage({ params }: PageProps) {
  const { slug } = await params;

  // Prevent directory traversal — allowlist: alphanumeric, dash, underscore, dot (no ..)
  if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
    return <div className="text-red-400">Invalid report slug.</div>;
  }

  const reportDir = join(getReportsDir(), slug);
  let html: string;
  try {
    html = await readFile(join(reportDir, 'report.html'), 'utf-8');
  } catch {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to reports
        </Link>
        <p className="text-red-400">Report not found.</p>
      </div>
    );
  }

  // Rewrite image paths: ./images/foo.png → /api/reports/{slug}/images/foo.png
  const rewrittenHtml = html.replace(
    /\.\/images\/([^"']+)/g,
    `/api/reports/${slug}/images/$1`,
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back to reports
        </Link>
        <a
          href={`/api/reports/${slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
        >
          Open standalone
        </a>
      </div>

      {/* Render the report HTML in an iframe for full isolation */}
      <iframe
        srcDoc={rewrittenHtml}
        className="w-full border border-border rounded-lg"
        style={{ minHeight: 'calc(100vh - 120px)' }}
        title="Diff Report"
        sandbox="allow-scripts"
      />
    </div>
  );
}
