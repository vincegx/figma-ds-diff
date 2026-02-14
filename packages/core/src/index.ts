// URL Parser
export { parseFigmaUrl, type FigmaUrlResult } from './figma/url-parser.js';

// Client
export {
  createFigmaClient,
  FigmaApiError,
  FigmaRateLimitError,
  type FigmaClient,
  type FigmaClientOptions,
  type GetFileParams,
  type GetFileNodesParams,
  type GetFileVersionsParams,
  type GetImagesParams,
} from './figma/client.js';

// Fetcher
export {
  fetchFile,
  fetchVersions,
  fetchNodes,
  fetchImages,
  fetchComponents,
  fetchStyles,
} from './figma/fetcher.js';

// Types & Schemas
export {
  // Shared schemas
  UserSchema,
  DocumentationLinkSchema,
  StyleTypeSchema,
  // File metadata schemas
  ComponentMetaSchema,
  ComponentSetMetaSchema,
  StyleMetaSchema,
  // Node schema
  BaseNodeSchema,
  // API response schemas
  GetFileResponseSchema,
  VersionSchema,
  GetFileVersionsResponseSchema,
  PublishedComponentSchema,
  GetFileComponentsResponseSchema,
  PublishedStyleSchema,
  GetFileStylesResponseSchema,
  NodeValueSchema,
  GetFileNodesResponseSchema,
  GetImagesResponseSchema,
  // Types
  type User,
  type DocumentationLink,
  type StyleType,
  type ComponentMeta,
  type ComponentSetMeta,
  type StyleMeta,
  type BaseNode,
  type GetFileResponse,
  type Version,
  type GetFileVersionsResponse,
  type PublishedComponent,
  type GetFileComponentsResponse,
  type PublishedStyle,
  type GetFileStylesResponse,
  type NodeValue,
  type GetFileNodesResponse,
  type GetImagesResponse,
} from './figma/types.js';

// Baseline Resolver
export {
  resolveBaseline,
  type BaselineResult,
} from './baseline/resolver.js';

// Normalize — Filters
export {
  stripVolatileFields,
  roundColorValues,
  rgbaToHex,
} from './normalize/filters.js';

// Normalize — Components
export {
  normalizeComponents,
  type NormalizedComponent,
  type NormalizedVariant,
  type NormalizedComponentProperty,
  type NormalizedComponentMap,
} from './normalize/components.js';

// Normalize — Styles
export {
  extractStyleMetadata,
  enrichStylesWithNodeData,
  normalizeStyles,
  type NormalizedColorStyle,
  type NormalizedTextStyle,
  type NormalizedEffectStyle,
  type NormalizedGridStyle,
  type NormalizedStyle,
  type NormalizedStyleMap,
  type NormalizedFill,
  type NormalizedEffect,
} from './normalize/styles.js';

// Normalize — Variables
export {
  normalizeVariables,
  type NormalizedVariable,
  type NormalizedVariableMap,
} from './normalize/variables.js';

// Diff — Types
export {
  computeSummary,
  type ChangeType,
  type DiffEntry,
  type DiffSummary,
  type DiffReport,
} from './diff/types.js';

// Diff — Three-Way
export {
  threeWayDiff,
  type ThreeWayOptions,
} from './diff/three-way.js';

// Diff — Domain-Specific
export { diffComponents, componentSimilarity } from './diff/component-diff.js';
export { diffStyles, styleSimilarity } from './diff/style-diff.js';
export { diffVariables } from './diff/variable-diff.js';

// Diff — Rename Detection
export {
  detectRenames,
  type RenameDetectorOptions,
} from './diff/rename-detector.js';

// Diff — Visual
export {
  visualDiff,
  type VisualDiffResult,
  type VisualDiffOptions,
} from './diff/visual-diff.js';

// Images — Downloader
export {
  downloadComponentImages,
  sanitizeFilename,
  type DownloadRequest,
  type ImageEntry,
  type DiffImageEntry,
  type DownloadResult,
  type DownloadOptions,
} from './images/downloader.js';

// Report — Generator
export {
  generateReport,
  type ReportOptions,
  type GenerateReportResult,
} from './report/generator.js';
