export interface FigmaUrlResult {
  fileKey: string;
  nodeId?: string;
}

const VALID_PATH_PREFIXES = ['/design/', '/file/', '/board/', '/proto/'];

export function parseFigmaUrl(input: string): FigmaUrlResult {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('Figma URL is empty');
  }

  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProtocol);
  } catch {
    throw new Error(`Invalid URL: ${trimmed}`);
  }

  const hostname = url.hostname.replace(/^www\./, '');
  if (hostname !== 'figma.com') {
    throw new Error(`Not a Figma URL: hostname "${url.hostname}" is not figma.com`);
  }

  const path = url.pathname;

  const matchingPrefix = VALID_PATH_PREFIXES.find((prefix) =>
    path.startsWith(prefix),
  );
  if (!matchingPrefix) {
    throw new Error(
      `Unsupported Figma URL path: "${path}". Expected /design/, /file/, /board/, or /proto/`,
    );
  }

  const rest = path.slice(matchingPrefix.length);
  const segments = rest.split('/').filter(Boolean);

  if (segments.length === 0) {
    throw new Error('Could not extract file key from URL');
  }

  let fileKey: string;

  // Branch URL: /design/{fileKey}/branch/{branchKey}/...
  const branchIndex = segments.indexOf('branch');
  if (branchIndex !== -1) {
    const branchKey = segments[branchIndex + 1];
    if (!branchKey) {
      throw new Error('Branch URL is missing the branch key');
    }
    fileKey = branchKey;
  } else {
    fileKey = segments[0]!;
  }

  if (!fileKey) {
    throw new Error('Could not extract file key from URL');
  }

  // Extract node-id query param
  let nodeId: string | undefined;
  const nodeIdParam = url.searchParams.get('node-id');
  if (nodeIdParam) {
    // Normalize "1-2" → "1:2"
    nodeId = nodeIdParam.replace(/-/g, ':');
  }

  return { fileKey, nodeId };
}
