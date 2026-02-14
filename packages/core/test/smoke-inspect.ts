/**
 * Inspect real Figma file structure to understand normalization needs.
 * Run with: npx tsx test/smoke-inspect.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFigmaClient } from '../src/figma/client.js';
import { fetchFile } from '../src/figma/fetcher.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf-8');
const pat = envContent.split('\n').find((l) => l.startsWith('FIGMA_PAT='))?.split('=')[1]?.trim();
if (!pat) { console.error('No PAT'); process.exit(1); }

const client = createFigmaClient({ personalAccessToken: pat });

console.log('Fetching constructor file (depth=2)...');
const file = await fetchFile(client, '36STB6Jnr3bI1t6ftuehLn', { depth: 2 });

console.log(`Components: ${Object.keys(file.components).length}`);
console.log(`ComponentSets: ${Object.keys(file.componentSets ?? {}).length}`);
console.log(`Styles: ${Object.keys(file.styles).length}`);

// Show a sample component
const compEntries = Object.entries(file.components);
if (compEntries.length > 0) {
  console.log('\nSample component:');
  console.log(JSON.stringify(compEntries[0], null, 2));
}

// Show a sample style
const styleEntries = Object.entries(file.styles);
if (styleEntries.length > 0) {
  console.log('\nSample style:');
  console.log(JSON.stringify(styleEntries[0], null, 2));
}

// Show document pages
const pages = file.document.children ?? [];
console.log(`\nPages: ${pages.length}`);
for (const page of pages) {
  const kids = (page as any).children ?? [];
  console.log(`  - ${page.name} (${page.type}, ${kids.length} children)`);
}

// Save full file for inspection (truncated doc tree)
const inspect = {
  name: file.name,
  version: file.version,
  componentCount: Object.keys(file.components).length,
  componentSetCount: Object.keys(file.componentSets ?? {}).length,
  styleCount: Object.keys(file.styles).length,
  sampleComponents: compEntries.slice(0, 3),
  sampleStyles: styleEntries.slice(0, 3),
  sampleComponentSets: Object.entries(file.componentSets ?? {}).slice(0, 3),
};
const outPath = resolve(__dirname, 'fixtures/inspect-output.json');
writeFileSync(outPath, JSON.stringify(inspect, null, 2));
console.log(`\nInspection data saved to ${outPath}`);
