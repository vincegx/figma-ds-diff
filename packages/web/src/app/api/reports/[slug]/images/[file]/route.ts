import { NextResponse, type NextRequest } from 'next/server';
import { readFile } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { getReportsDir } from '@/lib/reports-dir';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.gif': 'image/gif',
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; file: string }> },
) {
  try {
    const { slug, file } = await params;

    // Prevent directory traversal — allowlist: alphanumeric, dash, underscore, dot (for file extensions)
    if (!/^[a-zA-Z0-9_-]+$/.test(slug) || !/^[a-zA-Z0-9_.-]+$/.test(file)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const imagePath = join(getReportsDir(), slug, 'images', file);
    const buffer = await readFile(imagePath);

    const ext = extname(file).toLowerCase();
    const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Image not found' }, { status: 404 });
  }
}
