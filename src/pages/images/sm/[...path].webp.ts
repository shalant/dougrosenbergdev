import type { APIRoute } from 'astro';
import { join } from 'node:path';
import sharp from 'sharp';
import webDesign from '../../../data/webdesign.json';
import { SMALL_WIDTH, smallSrcset } from '../../../lib/smallImage';

// Only the first screenshot of each project: it is the only one a phone ever shows.
export async function getStaticPaths() {
  const leads = [...new Set(webDesign.projects.map((p) => p.images[0]).filter(Boolean))];
  const paths = [];
  for (const url of leads) {
    if (!(await smallSrcset(url))) continue;
    paths.push({ params: { path: url.slice('/images/'.length, -'.webp'.length) }, props: { url } });
  }
  return paths;
}

export const GET: APIRoute = async ({ props }) => {
  const body = await sharp(join(process.cwd(), 'public', props.url))
    .resize({ width: SMALL_WIDTH })
    .webp({ quality: 80 })
    .toBuffer();
  return new Response(new Uint8Array(body), { headers: { 'Content-Type': 'image/webp' } });
};
