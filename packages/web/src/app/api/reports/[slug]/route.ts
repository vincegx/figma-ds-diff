import { NextResponse, type NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getReportsDir } from '@/lib/reports-dir';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    // Prevent directory traversal — allowlist: alphanumeric, dash, underscore
    if (!/^[a-zA-Z0-9_-]+$/.test(slug)) {
      return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    const htmlPath = join(getReportsDir(), slug, 'report.html');
    const html = await readFile(htmlPath, 'utf-8');

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
}
