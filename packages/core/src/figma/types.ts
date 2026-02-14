import { z } from 'zod';

// ── Shared / Reusable Schemas ──────────────────────────────────────────

export const UserSchema = z
  .object({
    handle: z.string(),
    img_url: z.string(),
    id: z.string().optional(),
  })
  .passthrough();

export type User = z.infer<typeof UserSchema>;

export const DocumentationLinkSchema = z
  .object({
    uri: z.string(),
  })
  .passthrough();

export type DocumentationLink = z.infer<typeof DocumentationLinkSchema>;

export const StyleTypeSchema = z.enum([
  'FILL',
  'TEXT',
  'EFFECT',
  'GRID',
]);

export type StyleType = z.infer<typeof StyleTypeSchema>;

// ── Inline file metadata (from GET /files/:key) ───────────────────────

export const ComponentMetaSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    componentSetId: z.string().optional().nullable(),
    documentationLinks: z.array(DocumentationLinkSchema).optional(),
  })
  .passthrough();

export type ComponentMeta = z.infer<typeof ComponentMetaSchema>;

export const ComponentSetMetaSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    documentationLinks: z.array(DocumentationLinkSchema).optional(),
  })
  .passthrough();

export type ComponentSetMeta = z.infer<typeof ComponentSetMetaSchema>;

export const StyleMetaSchema = z
  .object({
    key: z.string(),
    name: z.string(),
    description: z.string(),
    styleType: StyleTypeSchema,
    remote: z.boolean().optional(),
  })
  .passthrough();

export type StyleMeta = z.infer<typeof StyleMetaSchema>;

// ── Base Node (recursive) ──────────────────────────────────────────────

export const BaseNodeSchema: z.ZodType<BaseNode> = z.lazy(() =>
  z
    .object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      children: z.array(BaseNodeSchema).optional(),
    })
    .passthrough(),
);

export interface BaseNode {
  id: string;
  name: string;
  type: string;
  children?: BaseNode[];
  [key: string]: unknown;
}

// ── GET /v1/files/:key ─────────────────────────────────────────────────

export const GetFileResponseSchema = z
  .object({
    name: z.string(),
    version: z.string(),
    document: BaseNodeSchema,
    components: z.record(z.string(), ComponentMetaSchema),
    componentSets: z.record(z.string(), ComponentSetMetaSchema).optional(),
    styles: z.record(z.string(), StyleMetaSchema),
    branches: z
      .array(
        z
          .object({
            key: z.string(),
            name: z.string(),
          })
          .passthrough(),
      )
      .optional(),
    lastModified: z.string().optional(),
    thumbnailUrl: z.string().optional(),
    role: z.string().optional(),
    editorType: z.string().optional(),
  })
  .passthrough();

export type GetFileResponse = z.infer<typeof GetFileResponseSchema>;

// ── GET /v1/files/:key/versions ────────────────────────────────────────

export const VersionSchema = z
  .object({
    id: z.string(),
    created_at: z.string(),
    label: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    user: UserSchema,
  })
  .passthrough();

export type Version = z.infer<typeof VersionSchema>;

export const GetFileVersionsResponseSchema = z
  .object({
    versions: z.array(VersionSchema),
    pagination: z
      .object({
        before: z.number().optional(),
        after: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type GetFileVersionsResponse = z.infer<
  typeof GetFileVersionsResponseSchema
>;

// ── GET /v1/files/:key/components ──────────────────────────────────────

export const PublishedComponentSchema = z
  .object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    thumbnail_url: z.string().optional().nullable(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
    containing_frame: z
      .object({
        nodeId: z.string().optional(),
        name: z.string().optional(),
        pageName: z.string().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type PublishedComponent = z.infer<typeof PublishedComponentSchema>;

export const GetFileComponentsResponseSchema = z
  .object({
    meta: z.object({
      components: z.array(PublishedComponentSchema),
    }),
  })
  .passthrough();

export type GetFileComponentsResponse = z.infer<
  typeof GetFileComponentsResponseSchema
>;

// ── GET /v1/files/:key/styles ──────────────────────────────────────────

export const PublishedStyleSchema = z
  .object({
    key: z.string(),
    file_key: z.string(),
    node_id: z.string(),
    style_type: StyleTypeSchema,
    thumbnail_url: z.string().optional().nullable(),
    name: z.string(),
    description: z.string(),
    created_at: z.string(),
    updated_at: z.string(),
  })
  .passthrough();

export type PublishedStyle = z.infer<typeof PublishedStyleSchema>;

export const GetFileStylesResponseSchema = z
  .object({
    meta: z.object({
      styles: z.array(PublishedStyleSchema),
    }),
  })
  .passthrough();

export type GetFileStylesResponse = z.infer<
  typeof GetFileStylesResponseSchema
>;

// ── GET /v1/files/:key/nodes?ids=x,y,z ────────────────────────────────

export const NodeValueSchema = z
  .object({
    document: BaseNodeSchema,
    components: z.record(z.string(), ComponentMetaSchema).optional(),
    styles: z.record(z.string(), StyleMetaSchema).optional(),
  })
  .passthrough();

export type NodeValue = z.infer<typeof NodeValueSchema>;

export const GetFileNodesResponseSchema = z
  .object({
    name: z.string(),
    nodes: z.record(z.string(), NodeValueSchema.nullable()),
    lastModified: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

export type GetFileNodesResponse = z.infer<typeof GetFileNodesResponseSchema>;

// ── GET /v1/images/:key?ids=x,y,z ─────────────────────────────────────

export const GetImagesResponseSchema = z
  .object({
    images: z.record(z.string(), z.string().nullable()),
    err: z.string().nullable().optional(),
  })
  .passthrough();

export type GetImagesResponse = z.infer<typeof GetImagesResponseSchema>;
