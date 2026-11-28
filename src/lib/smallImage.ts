import { publicImageSize } from './imageSize';

// Phone-sized copies of the project screenshots in public/, generated at build (see
// pages/images/sm/) so a screenshot added through webdesign.json gets one with no extra step.
export const SMALL_WIDTH = 800;

export async function smallSrcset(url: string): Promise<string | undefined> {
  if (!url.startsWith('/images/') || !url.endsWith('.webp')) return undefined;
  const size = await publicImageSize(url);
  if (!size || size.width <= SMALL_WIDTH) return undefined;
  return `${url.replace('/images/', '/images/sm/')} ${SMALL_WIDTH}w, ${url} ${size.width}w`;
}
