/**
 * Smoke test for baseline resolver with real Figma API.
 * Run with: npx tsx test/smoke-baseline.ts
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFigmaUrl } from '../src/figma/url-parser.js';
import { createFigmaClient } from '../src/figma/client.js';
import { resolveBaseline } from '../src/baseline/resolver.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const constructorUrl = 'https://www.figma.com/design/36STB6Jnr3bI1t6ftuehLn/Unsmoke_Library---V2';
const forkUrl = 'https://www.figma.com/design/lzuGRHRDUsAYWGkcZZQoCp/Unsmoke_Library---V2--copie-';

const constructorKey = parseFigmaUrl(constructorUrl).fileKey;
const forkKey = parseFigmaUrl(forkUrl).fileKey;

console.log(`Constructor: ${constructorKey}`);
console.log(`Fork:        ${forkKey}`);

const client = createFigmaClient({ personalAccessToken: pat });

console.log('\nResolving baseline...');
const baseline = await resolveBaseline(client, constructorKey, forkKey);

console.log(`\nResult:`);
console.log(`  Fork created at:       ${baseline.forkCreatedAt}`);
console.log(`  Baseline version ID:   ${baseline.versionId}`);
console.log(`  Baseline version date: ${baseline.versionDate}`);

if (baseline.warnings.length > 0) {
  console.log(`  Warnings:`);
  for (const w of baseline.warnings) {
    console.log(`    - ${w}`);
  }
} else {
  console.log(`  Warnings: none`);
}

console.log('\nSmoke test complete.');
