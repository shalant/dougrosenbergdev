import sharp from 'sharp';
import { join } from 'node:path';

// Intrinsic size of a file under public/, read at build time, so an <img> can carry width and
// height and reserve its box before it loads. WebKit has no scroll anchoring, so a lazy image
// with no dimensions pushes the content below it down when it arrives (found 2026-10-17).
// CSS keeps controlling the displayed size (width: 100%; height: auto), so the attributes only
// supply the aspect ratio. Returns null for a path it cannot read, and the image then renders as before.
export async function publicImageSize(src: string): Promise<{ width: number; height: number } | null> {
  try {
    const { width, height } = await sharp(join(process.cwd(), 'public', src)).metadata();
    return width && height ? { width, height } : null;
  } catch {
    return null;
  }
}
