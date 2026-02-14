import { describe, it, expect } from 'vitest';
import { normalizeComponents } from '../src/normalize/components.js';
import type { GetFileResponse } from '../src/figma/types.js';

function makeFileResponse(overrides: Partial<GetFileResponse> = {}): GetFileResponse {
  return {
    name: 'Test File',
    version: '1',
    document: {
      id: '0:0',
      name: 'Document',
      type: 'DOCUMENT',
      children: [
        {
          id: '1:0',
          name: 'Components Page',
          type: 'CANVAS',
          children: [
            {
              id: '10:0',
              name: 'Button',
              type: 'COMPONENT_SET',
              children: [
                { id: '10:1', name: 'Type=Primary, State=Default', type: 'COMPONENT' },
                { id: '10:2', name: 'Type=Primary, State=Hover', type: 'COMPONENT' },
                { id: '10:3', name: 'Type=Secondary, State=Default', type: 'COMPONENT' },
              ],
            },
            {
              id: '20:0',
              name: 'Icon Star',
              type: 'COMPONENT',
            },
          ],
        },
      ],
    },
    components: {
      '10:1': {
        key: 'k1',
        name: 'Type=Primary, State=Default',
        description: 'Primary default',
        componentSetId: '10:0',
      },
      '10:2': {
        key: 'k2',
        name: 'Type=Primary, State=Hover',
        description: 'Primary hover',
        componentSetId: '10:0',
      },
      '10:3': {
        key: 'k3',
        name: 'Type=Secondary, State=Default',
        description: 'Secondary default',
        componentSetId: '10:0',
      },
      '20:0': {
        key: 'k4',
        name: 'Icon Star',
        description: 'Star icon',
      },
    },
    componentSets: {
      '10:0': {
        key: 'ks1',
        name: 'Button',
        description: 'Button component set',
      },
    },
    styles: {},
    ...overrides,
  };
}

describe('normalizeComponents', () => {
  it('groups variants under their componentSet', () => {
    const file = makeFileResponse();
    const result = normalizeComponents(file);

    // Should have 2 entries: Button (set) and Icon Star (standalone)
    expect(result.size).toBe(2);

    const button = result.get('Components Page/Button');
    expect(button).toBeDefined();
    expect(button!.name).toBe('Button');
    expect(button!.variants).toHaveLength(3);
    expect(button!.description).toBe('Button component set');
  });

  it('parses variant properties from name', () => {
    const file = makeFileResponse();
    const result = normalizeComponents(file);
    const button = result.get('Components Page/Button')!;

    // Variants are sorted by name
    const primary = button.variants.find(
      (v) => v.name === 'Type=Primary, State=Default',
    );
    expect(primary).toBeDefined();
    expect(primary!.properties).toEqual({
      Type: 'Primary',
      State: 'Default',
    });
  });

  it('handles standalone components', () => {
    const file = makeFileResponse();
    const result = normalizeComponents(file);

    const icon = result.get('Components Page/Icon Star');
    expect(icon).toBeDefined();
    expect(icon!.name).toBe('Icon Star');
    expect(icon!.variants).toHaveLength(0);
    expect(icon!.description).toBe('Star icon');
  });

  it('produces stable sorted variants', () => {
    const file = makeFileResponse();
    const result = normalizeComponents(file);
    const button = result.get('Components Page/Button')!;

    const names = button.variants.map((v) => v.name);
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('handles empty file (no components)', () => {
    const file = makeFileResponse({
      components: {},
      componentSets: {},
      document: { id: '0:0', name: 'Document', type: 'DOCUMENT', children: [] },
    });
    const result = normalizeComponents(file);
    expect(result.size).toBe(0);
  });

  it('strips volatile fields from strippedNode', () => {
    const file = makeFileResponse();
    const result = normalizeComponents(file);
    const button = result.get('Components Page/Button')!;
    const stripped = button.strippedNode as Record<string, unknown>;

    // Should not contain 'id' or 'key'
    expect(stripped['id']).toBeUndefined();
    expect(stripped['name']).toBe('Button');
  });

  it('handles components with componentPropertyDefinitions', () => {
    const file = makeFileResponse();
    // Add componentPropertyDefinitions to the node
    const doc = file.document.children![0]!.children![0]!;
    (doc as Record<string, unknown>)['componentPropertyDefinitions'] = {
      'Label': { type: 'TEXT', defaultValue: 'Click me' },
      'Disabled': { type: 'BOOLEAN', defaultValue: false },
    };

    const result = normalizeComponents(file);
    const button = result.get('Components Page/Button')!;

    expect(button.properties).toHaveLength(2);
    expect(button.properties[0]).toEqual({
      name: 'Disabled',
      type: 'BOOLEAN',
      defaultValue: false,
    });
    expect(button.properties[1]).toEqual({
      name: 'Label',
      type: 'TEXT',
      defaultValue: 'Click me',
    });
  });

  it('builds correct paths for nested structures', () => {
    const file: GetFileResponse = {
      name: 'Test',
      version: '1',
      document: {
        id: '0:0',
        name: 'Document',
        type: 'DOCUMENT',
        children: [
          {
            id: '1:0',
            name: 'Page A',
            type: 'CANVAS',
            children: [
              {
                id: '2:0',
                name: 'Section',
                type: 'FRAME',
                children: [
                  {
                    id: '3:0',
                    name: 'MyComp',
                    type: 'COMPONENT',
                  },
                ],
              },
            ],
          },
        ],
      },
      components: {
        '3:0': { key: 'k1', name: 'MyComp', description: '' },
      },
      styles: {},
    };

    const result = normalizeComponents(file);
    expect(result.has('Page A/Section/MyComp')).toBe(true);
  });
});
