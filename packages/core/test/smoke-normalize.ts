/**
 * Smoke test: verify normalizers work with real Figma API data.
 * Run with: npx tsx test/smoke-normalize.ts
 */
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFigmaClient } from '../src/figma/client.js';
import { fetchFile, fetchNodes } from '../src/figma/fetcher.js';
import { normalizeComponents } from '../src/normalize/components.js';
import { extractStyleMetadata, enrichStylesWithNodeData } from '../src/normalize/styles.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const envPath = resolve(__dirname, '../../../.env');
const envContent = readFileSync(envPath, 'utf-8');
const pat = envContent.split('\n').find((l) => l.startsWith('FIGMA_PAT='))?.split('=')[1]?.trim();
if (!pat) { console.error('No PAT'); process.exit(1); }

const client = createFigmaClient({ personalAccessToken: pat });
const fileKey = '36STB6Jnr3bI1t6ftuehLn';

// Fetch full file (no depth limit to get component data)
console.log('Fetching full file...');
const file = await fetchFile(client, fileKey);

console.log(`\n=== Components ===`);
const components = normalizeComponents(file);
console.log(`Total normalized components: ${components.size}`);
let shown = 0;
for (const [path, comp] of components) {
  if (shown++ >= 5) { console.log(`  ... and ${components.size - 5} more`); break; }
  console.log(`  [${path}]`);
  console.log(`    name: ${comp.name}, variants: ${comp.variants.length}, props: ${comp.properties.length}`);
  if (comp.variants.length > 0) {
    console.log(`    first variant: ${comp.variants[0]!.name}`);
  }
}

console.log(`\n=== Styles ===`);
const { styles, nodeIdsToFetch } = extractStyleMetadata(file);
console.log(`Total styles: ${styles.size}`);
console.log(`Node IDs to fetch for values: ${nodeIdsToFetch.length}`);

// Count by type
const typeCounts = { FILL: 0, TEXT: 0, EFFECT: 0, GRID: 0 };
for (const s of styles.values()) {
  typeCounts[s.type]++;
}
console.log(`  FILL: ${typeCounts.FILL}, TEXT: ${typeCounts.TEXT}, EFFECT: ${typeCounts.EFFECT}, GRID: ${typeCounts.GRID}`);

// Enrich a sample of styles with node data
if (nodeIdsToFetch.length > 0) {
  const sampleIds = nodeIdsToFetch.slice(0, 10);
  console.log(`\nFetching ${sampleIds.length} sample nodes for style enrichment...`);
  const nodesResp = await fetchNodes(client, fileKey, sampleIds);
  enrichStylesWithNodeData(styles, nodesResp);

  let enriched = 0;
  for (const s of styles.values()) {
    if (s.type === 'FILL' && s.fills.length > 0) {
      if (enriched++ >= 3) break;
      console.log(`  FILL "${s.name}": ${s.fills.map((f) => f.hex ?? f.type).join(', ')}`);
    }
    if (s.type === 'TEXT' && s.fontFamily) {
      if (enriched++ >= 3) break;
      console.log(`  TEXT "${s.name}": ${s.fontFamily} ${s.fontSize}px/${s.fontWeight}`);
    }
    if (s.type === 'EFFECT' && s.effects.length > 0) {
      if (enriched++ >= 3) break;
      console.log(`  EFFECT "${s.name}": ${s.effects.map((e) => `${e.type} r=${e.radius}`).join(', ')}`);
    }
  }
}

console.log('\nSmoke test complete.');
