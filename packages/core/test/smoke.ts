/**
 * Smoke test: verifies end-to-end connectivity with the Figma API.
 * Run with: npx tsx test/smoke.ts
 * Requires FIGMA_PAT in .env
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFigmaUrl } from '../src/figma/url-parser.js';
import { createFigmaClient } from '../src/figma/client.js';
import { fetchFile, fetchVersions } from '../src/figma/fetcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency)
const envPath = resolve(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf-8');
const pat = envContent
  .split('\n')
  .find((line) => line.startsWith('FIGMA_PAT='))
  ?.split('=')[1]
  ?.trim();

if (!pat || pat === 'figd_your_token_here') {
  console.error('Set a valid FIGMA_PAT in .env to run the smoke test');
  process.exit(1);
}

const urls = [
  'https://www.figma.com/design/36STB6Jnr3bI1t6ftuehLn/Unsmoke_Library---V2',
  'https://www.figma.com/design/lzuGRHRDUsAYWGkcZZQoCp/Unsmoke_Library---V2--copie-',
];

const client = createFigmaClient({ personalAccessToken: pat });

for (const url of urls) {
  const { fileKey } = parseFigmaUrl(url);
  console.log(`\n--- File: ${url}`);
  console.log(`  fileKey: ${fileKey}`);

  try {
    console.log('  Fetching file metadata (depth=1)...');
    const file = await fetchFile(client, fileKey, { depth: 1 });
    console.log(`  Name: ${file.name}`);
    console.log(`  Version: ${file.version}`);
    console.log(`  Components: ${Object.keys(file.components).length}`);
    console.log(`  Styles: ${Object.keys(file.styles).length}`);

    console.log('  Fetching versions...');
    const versions = await fetchVersions(client, fileKey);
    console.log(`  Versions: ${versions.length}`);
    if (versions[0]) {
      console.log(`  Latest: ${versions[0].created_at} — ${versions[0].label ?? '(no label)'}`);
    }
  } catch (err) {
    console.error(`  ERROR:`, err);
  }
}

console.log('\nSmoke test complete.');
