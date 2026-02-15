/**
 * Visual diff using pixelmatch and sharp.
 * Compares two PNG images and produces an overlay highlighting differences.
 */

import sharp from 'sharp';
import pixelmatch from 'pixelmatch';

export interface VisualDiffResult {
  /** Diff overlay PNG buffer */
  diffImage: Buffer;
  /** Number of different pixels */
  diffPixels: number;
  /** Total pixels in the comparison */
  totalPixels: number;
  /** Percentage of different pixels (0-100) */
  diffPercent: number;
  /** Width of the comparison images */
  width: number;
  /** Height of the comparison images */
  height: number;
}

export interface VisualDiffOptions {
  /** Pixelmatch threshold (0-1). Default: 0.1 */
  threshold?: number;
  /** Include anti-aliased pixels in diff. Default: false */
  includeAA?: boolean;
}

/**
 * Compare two PNG images and produce a diff overlay.
 *
 * Images are resized to the same dimensions (max of both) before comparison.
 * The diff overlay highlights changed pixels in red/magenta.
 *
 * @param imgA - First PNG image buffer
 * @param imgB - Second PNG image buffer
 * @param options - Comparison options
 * @returns Diff result with overlay image, pixel count, and percentage
 */
export async function visualDiff(
  imgA: Buffer,
  imgB: Buffer,
  options: VisualDiffOptions = {},
): Promise<VisualDiffResult> {
  const { threshold = 0.1, includeAA = false } = options;

  // Get metadata for both images
  const [metaA, metaB] = await Promise.all([
    sharp(imgA).metadata(),
    sharp(imgB).metadata(),
  ]);

  const widthA = metaA.width ?? 0;
  const heightA = metaA.height ?? 0;
  const widthB = metaB.width ?? 0;
  const heightB = metaB.height ?? 0;

  // Use the max dimensions to ensure both images can be compared
  const width = Math.max(widthA, widthB);
  const height = Math.max(heightA, heightB);

  if (width === 0 || height === 0) {
    return {
      diffImage: Buffer.alloc(0),
      diffPixels: 0,
      totalPixels: 0,
      diffPercent: 0,
      width: 0,
      height: 0,
    };
  }

  // Resize both images to the same dimensions with white background
  const [rawA, rawB] = await Promise.all([
    sharp(imgA)
      .resize(width, height, {
        fit: 'contain',
        position: 'left top',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .ensureAlpha()
      .raw()
      .toBuffer(),
    sharp(imgB)
      .resize(width, height, {
        fit: 'contain',
        position: 'left top',
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      })
      .ensureAlpha()
      .raw()
      .toBuffer(),
  ]);

  // Create output buffer for diff image
  const diffBuffer = new Uint8Array(width * height * 4);

  // Run pixelmatch (Buffer extends Uint8Array, pass directly)
  const diffPixels = pixelmatch(
    rawA,
    rawB,
    diffBuffer,
    width,
    height,
    {
      threshold,
      includeAA,
    },
  );

  // Convert diff buffer to PNG
  const diffImage = await sharp(Buffer.from(diffBuffer.buffer), {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const totalPixels = width * height;

  return {
    diffImage,
    diffPixels,
    totalPixels,
    diffPercent: totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0,
    width,
    height,
  };
}
