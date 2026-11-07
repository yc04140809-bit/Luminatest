import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import type { Rollup } from 'vite';
import { rewriteReferences, webpNameOf, webpTheBundle } from './webpPictures';

/** A bundle as Vite hands it over: a picture, the JS and CSS that point at it, the page. */
function bundleWith(png: Buffer, extra: Rollup.OutputBundle = {}): Rollup.OutputBundle {
  const asset = (fileName: string, source: string | Buffer) =>
    ({ type: 'asset', fileName, name: undefined, names: [fileName], originalFileName: null, originalFileNames: [], source, needsCodeReference: false }) as unknown as Rollup.OutputAsset;
  return {
    'assets/field-greenwood-AbC12.png': asset('assets/field-greenwood-AbC12.png', png),
    'assets/index-Zz9.js': { type: 'chunk', fileName: 'assets/index-Zz9.js', code: 'const a="./assets/field-greenwood-AbC12.png";' } as unknown as Rollup.OutputChunk,
    'assets/index-Q1.css': asset('assets/index-Q1.css', '.x{background:url(./field-greenwood-AbC12.png)}'),
    'index.html': asset('index.html', '<img src="./assets/field-greenwood-AbC12.png">'),
    ...extra,
  };
}

const picture = (w: number, h: number, alpha = false) =>
  sharp({ create: { width: w, height: h, channels: alpha ? 4 : 3, background: { r: 40, g: 90, b: 160, alpha: alpha ? 0.5 : 1 } } })
    .png()
    .toBuffer();

describe('画像の軽量化 (A1): a build writes the pictures as WebP, the delivered PNGs untouched', () => {
  it('the name keeps its hash; only the extension changes; every reference follows', () => {
    expect(webpNameOf('assets/op_06_noise-C0ir0n8g.png')).toBe('assets/op_06_noise-C0ir0n8g.webp');
    const renames = new Map([['a-1.png', 'a-1.webp']]);
    expect(rewriteReferences('x a-1.png y a-1.png', renames)).toBe('x a-1.webp y a-1.webp');
    expect(rewriteReferences('ba-1.pngx', new Map())).toBe('ba-1.pngx');
  });

  it('a real conversion: the same size in pixels and the same transparency; JS, CSS and the page point at it', async () => {
    const png = await picture(640, 360, true);
    const bundle = bundleWith(png);
    const done = await webpTheBundle(bundle);
    expect(done.converted).toBe(1);
    expect(Object.keys(bundle).sort()).toEqual(['assets/field-greenwood-AbC12.webp', 'assets/index-Q1.css', 'assets/index-Zz9.js', 'index.html']);
    const webp = (bundle['assets/field-greenwood-AbC12.webp'] as Rollup.OutputAsset).source as Buffer;
    const meta = await sharp(webp).metadata();
    expect([meta.format, meta.width, meta.height, meta.hasAlpha]).toEqual(['webp', 640, 360, true]);
    expect((bundle['assets/index-Zz9.js'] as Rollup.OutputChunk).code).toBe('const a="./assets/field-greenwood-AbC12.webp";');
    expect((bundle['assets/index-Q1.css'] as Rollup.OutputAsset).source).toBe('.x{background:url(./field-greenwood-AbC12.webp)}');
    expect((bundle['index.html'] as Rollup.OutputAsset).source).toBe('<img src="./assets/field-greenwood-AbC12.webp">');
  });

  it('a PNG the WebP would not make smaller is left a PNG, and nothing points elsewhere', async () => {
    const png = await picture(8, 8);
    const bundle = bundleWith(png);
    const done = await webpTheBundle(bundle, { convert: async (p) => Buffer.concat([p, p]) });
    expect(done.converted).toBe(0);
    expect(bundle['assets/field-greenwood-AbC12.png']).toBeDefined();
    expect((bundle['assets/index-Zz9.js'] as Rollup.OutputChunk).code).toContain('.png');
  });

  it('converted once: a second build reads the cache and does not convert again', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'mugen-webp-'));
    try {
      const png = await picture(320, 180);
      let calls = 0;
      const convert = async (p: Buffer) => {
        calls += 1;
        return sharp(p).webp().toBuffer();
      };
      await webpTheBundle(bundleWith(png), { convert, cacheDir: dir });
      await webpTheBundle(bundleWith(png), { convert, cacheDir: dir });
      expect(calls).toBe(1);
      expect(readdirSync(dir)).toHaveLength(1);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
