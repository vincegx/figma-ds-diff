import { describe, it, expect } from 'vitest';
import { parseFigmaUrl } from '../src/figma/url-parser.js';

describe('parseFigmaUrl', () => {
  // --- /design/ URLs ---
  it('parses a standard /design/ URL', () => {
    const result = parseFigmaUrl(
      'https://www.figma.com/design/abc123XYZ/My-File-Name',
    );
    expect(result).toEqual({ fileKey: 'abc123XYZ' });
  });

  it('parses /design/ URL with node-id', () => {
    const result = parseFigmaUrl(
      'https://figma.com/design/abc123XYZ/My-File?node-id=1-2',
    );
    expect(result).toEqual({ fileKey: 'abc123XYZ', nodeId: '1:2' });
  });

  it('normalizes node-id dashes to colons', () => {
    const result = parseFigmaUrl(
      'https://figma.com/design/abc123XYZ/File?node-id=123-456',
    );
    expect(result).toEqual({ fileKey: 'abc123XYZ', nodeId: '123:456' });
  });

  // --- /file/ URLs ---
  it('parses a /file/ URL', () => {
    const result = parseFigmaUrl(
      'https://figma.com/file/xyz789/Old-Format',
    );
    expect(result).toEqual({ fileKey: 'xyz789' });
  });

  it('parses /file/ URL with node-id', () => {
    const result = parseFigmaUrl(
      'https://figma.com/file/xyz789/Old-Format?node-id=10-20',
    );
    expect(result).toEqual({ fileKey: 'xyz789', nodeId: '10:20' });
  });

  // --- /board/ URLs ---
  it('parses a /board/ URL', () => {
    const result = parseFigmaUrl(
      'https://figma.com/board/boardKey123/FigJam-Board',
    );
    expect(result).toEqual({ fileKey: 'boardKey123' });
  });

  // --- /proto/ URLs ---
  it('parses a /proto/ URL', () => {
    const result = parseFigmaUrl(
      'https://figma.com/proto/protoKey456/Prototype',
    );
    expect(result).toEqual({ fileKey: 'protoKey456' });
  });

  // --- Branch URLs ---
  it('parses a branch URL and uses branchKey as fileKey', () => {
    const result = parseFigmaUrl(
      'https://figma.com/design/mainFileKey/branch/branchKey999/My-Branch',
    );
    expect(result).toEqual({ fileKey: 'branchKey999' });
  });

  it('parses a branch URL with node-id', () => {
    const result = parseFigmaUrl(
      'https://figma.com/design/mainKey/branch/br123/File?node-id=5-10',
    );
    expect(result).toEqual({ fileKey: 'br123', nodeId: '5:10' });
  });

  // --- Protocol handling ---
  it('adds https:// when missing', () => {
    const result = parseFigmaUrl('figma.com/design/abc123/File');
    expect(result).toEqual({ fileKey: 'abc123' });
  });

  it('works with http:// prefix', () => {
    const result = parseFigmaUrl('http://figma.com/design/abc123/File');
    expect(result).toEqual({ fileKey: 'abc123' });
  });

  it('strips www. from hostname', () => {
    const result = parseFigmaUrl(
      'https://www.figma.com/design/abc123/File',
    );
    expect(result).toEqual({ fileKey: 'abc123' });
  });

  // --- Error cases ---
  it('throws on empty string', () => {
    expect(() => parseFigmaUrl('')).toThrow('Figma URL is empty');
  });

  it('throws on whitespace-only string', () => {
    expect(() => parseFigmaUrl('   ')).toThrow('Figma URL is empty');
  });

  it('throws on non-Figma hostname', () => {
    expect(() => parseFigmaUrl('https://example.com/design/abc/file')).toThrow(
      'Not a Figma URL',
    );
  });

  it('throws on unsupported path', () => {
    expect(() =>
      parseFigmaUrl('https://figma.com/community/plugin/12345'),
    ).toThrow('Unsupported Figma URL path');
  });

  it('throws on URL with no file key after path prefix', () => {
    expect(() => parseFigmaUrl('https://figma.com/design/')).toThrow(
      'Could not extract file key',
    );
  });

  it('throws on branch URL missing branch key', () => {
    expect(() =>
      parseFigmaUrl('https://figma.com/design/abc/branch/'),
    ).toThrow('Branch URL is missing the branch key');
  });

  it('throws on completely invalid URL', () => {
    expect(() => parseFigmaUrl('not a url at all!!!')).toThrow('Invalid URL');
  });

  // --- Trimming ---
  it('trims whitespace from input', () => {
    const result = parseFigmaUrl(
      '  https://figma.com/design/abc123/File  ',
    );
    expect(result).toEqual({ fileKey: 'abc123' });
  });

  // --- No node-id returns undefined ---
  it('returns undefined nodeId when no node-id param', () => {
    const result = parseFigmaUrl('https://figma.com/design/abc123/File');
    expect(result.nodeId).toBeUndefined();
  });
});
