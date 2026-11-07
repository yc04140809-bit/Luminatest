import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import type { Plugin, Rollup } from 'vite';

type OutputAsset = Rollup.OutputAsset;
type OutputBundle = Rollup.OutputBundle;

/**
 * 画像の軽量化 (A1, 作者採用 2026-11-04 — 元画像は残す形で).
 *
 * The pictures as delivered stay as they are, PNG, in mugen-assets/files/: nothing in the repository is changed,
 * and the dev server (and so every e2e run) shows them as they are. Only a BUILD writes each emitted PNG as WebP
 * instead — the same size in pixels, the same transparency, never turned or flipped (no EXIF rotation: the art
 * is never flipped) — and every reference to it (JS, CSS, HTML) is pointed at the new name.
 *
 * Quality 88 with lossless-grade transparency: measured on the heaviest (the opening's noise frames, the
 * backgrounds, the event pictures, the standing figures), about 80〜85% smaller (3.7MB → 0.7MB), SSIM 0.97〜0.98,
 * no difference to be seen at 100%. A PNG the WebP would not make smaller is left a PNG.
 *
 * Converted once per picture and parameters: kept in node_modules/.cache/mugen-webp, so a build after the first
 * does not convert again. `MUGEN_KEEP_PNG=1` builds with the PNGs as they are (to compare).
 */
export const WEBP_OPTIONS = { quality: 88, alphaQuality: 100, effort: 5, smartSubsample: true } as const;

/** `assets/field-greenwood-AbC12.png` → `assets/field-greenwood-AbC12.webp`. */
export function webpNameOf(fileName: string): string {
  return fileName.replace(/\.png$/i, '.webp');
}

/** Every reference to a renamed file (by its own name, which carries its hash) pointed at the new one. */
export function rewriteReferences(text: string, renames: ReadonlyMap<string, string>): string {
  let out = text;
  for (const [from, to] of renames) if (out.includes(from)) out = out.split(from).join(to);
  return out;
}

type Convert = (png: Buffer) => Promise<Buffer>;

async function sharpConvert(png: Buffer): Promise<Buffer> {
  const { default: sharp } = await import('sharp');
  return sharp(png).webp(WEBP_OPTIONS).toBuffer();
}

/**
 * The emitted PNGs in `bundle` become WebP (where smaller), and every chunk and text asset follows the new names.
 * Returns what was done, for the build's own line of report.
 */
export async function webpTheBundle(
  bundle: OutputBundle,
  { convert = sharpConvert, cacheDir }: { convert?: Convert; cacheDir?: string } = {},
): Promise<{ converted: number; before: number; after: number }> {
  const pngs = Object.values(bundle).filter((o): o is OutputAsset => o.type === 'asset' && /\.png$/i.test(o.fileName));
  const renames = new Map<string, string>();
  let before = 0;
  let after = 0;
  const tag = createHash('sha1').update(JSON.stringify(WEBP_OPTIONS)).digest('hex').slice(0, 8);
  if (cacheDir) mkdirSync(cacheDir, { recursive: true });

  const one = async (asset: OutputAsset) => {
    const png = Buffer.from(asset.source as Uint8Array);
    const key = `${createHash('sha1').update(png).digest('hex')}-${tag}.webp`;
    const cached = cacheDir ? join(cacheDir, key) : null;
    let webp: Buffer;
    if (cached && existsSync(cached)) webp = readFileSync(cached);
    else {
      webp = await convert(png);
      if (cached) writeFileSync(cached, webp);
    }
    if (webp.length >= png.length) return;
    const fileName = webpNameOf(asset.fileName);
    delete bundle[asset.fileName];
    bundle[fileName] = { ...asset, fileName, source: webp, names: asset.names?.map(webpNameOf) ?? [] } as OutputAsset;
    renames.set(basename(asset.fileName), basename(fileName));
    before += png.length;
    after += webp.length;
  };
  // A few at a time: each conversion already uses several threads.
  const queue = [...pngs];
  await Promise.all(
    Array.from({ length: 4 }, async () => {
      for (let a = queue.shift(); a; a = queue.shift()) await one(a);
    }),
  );

  if (renames.size > 0) {
    for (const out of Object.values(bundle)) {
      if (out.type === 'chunk') out.code = rewriteReferences(out.code, renames);
      else if (typeof out.source === 'string') out.source = rewriteReferences(out.source, renames);
    }
  }
  return { converted: renames.size, before, after };
}

export function webpPictures({ cacheDir }: { cacheDir: string }): Plugin {
  return {
    name: 'mugen-webp-pictures',
    apply: 'build',
    // After Vite's own: the CSS and the HTML are in the bundle by then, with the names they point at.
    enforce: 'post',
    async generateBundle(_options, bundle) {
      if (process.env.MUGEN_KEEP_PNG === '1') return;
      const { converted, before, after } = await webpTheBundle(bundle, { cacheDir });
      if (converted > 0) {
        this.info(
          `画像 ${converted} 枚を WebP に: ${(before / 1e6).toFixed(0)}MB → ${(after / 1e6).toFixed(0)}MB`,
        );
      }
    },
  };
}
