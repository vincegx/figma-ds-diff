import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  GetFileResponseSchema,
  GetFileVersionsResponseSchema,
  GetFileComponentsResponseSchema,
  GetFileStylesResponseSchema,
  GetFileNodesResponseSchema,
  GetImagesResponseSchema,
} from '../src/figma/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
function loadFixture(name: string): unknown {
  const path = resolve(__dirname, 'fixtures', name);
  return JSON.parse(readFileSync(path, 'utf-8'));
}

describe('fixture validation against Zod schemas', () => {
  it('get-file.json validates against GetFileResponseSchema', () => {
    const data = loadFixture('get-file.json');
    const result = GetFileResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('get-file-versions.json validates against GetFileVersionsResponseSchema', () => {
    const data = loadFixture('get-file-versions.json');
    const result = GetFileVersionsResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('get-file-components.json validates against GetFileComponentsResponseSchema', () => {
    const data = loadFixture('get-file-components.json');
    const result = GetFileComponentsResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('get-file-styles.json validates against GetFileStylesResponseSchema', () => {
    const data = loadFixture('get-file-styles.json');
    const result = GetFileStylesResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('get-file-nodes.json validates against GetFileNodesResponseSchema', () => {
    const data = loadFixture('get-file-nodes.json');
    const result = GetFileNodesResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });

  it('get-images.json validates against GetImagesResponseSchema', () => {
    const data = loadFixture('get-images.json');
    const result = GetImagesResponseSchema.safeParse(data);
    expect(result.success).toBe(true);
  });
});
