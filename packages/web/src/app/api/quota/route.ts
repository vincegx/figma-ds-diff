import { NextResponse } from 'next/server';
import { QuotaTracker } from '@figma-ds-diff/core';
import { getQuotaFilePath } from '@/lib/quota-path';

const tracker = new QuotaTracker(getQuotaFilePath());

export async function GET() {
  const stats = await tracker.getStats();
  return NextResponse.json(stats);
}

export async function POST(request: Request) {
  const body = (await request.json()) as { endpoint: string; status: number };
  await tracker.trackCall(body.endpoint, body.status);
  return NextResponse.json({ ok: true });
}
