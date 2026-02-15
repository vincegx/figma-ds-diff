import { getFigmaPat, maskToken, writeFigmaPat } from '@/lib/runtime-config';

export async function GET() {
  const pat = await getFigmaPat();

  return Response.json({
    configured: !!pat,
    maskedToken: pat ? maskToken(pat) : null,
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body.token?.trim();

    if (!token) {
      return Response.json({ error: 'Token is required.' }, { status: 400 });
    }

    if (!token.startsWith('figd_')) {
      return Response.json(
        { error: 'Invalid token format. Figma personal access tokens start with "figd_".' },
        { status: 400 },
      );
    }

    await writeFigmaPat(token);

    return Response.json({
      configured: true,
      maskedToken: maskToken(token),
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Failed to save token.' },
      { status: 500 },
    );
  }
}
