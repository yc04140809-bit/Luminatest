import { describe, expect, it } from 'vitest';
import type { Rollup } from 'vite';
import { LARGE_ENOUGH, leanTheMusic } from './leanerMusic';

const asset = (fileName: string, size: number) =>
  ({ type: 'asset', fileName, names: [fileName], originalFileNames: [], source: Buffer.alloc(size, 7), needsCodeReference: false }) as unknown as Rollup.OutputAsset;

describe('音楽ファイルの軽量化 (B5): a build writes the large MP3s again, in place; the voices as they are', () => {
  it('only the large ones; the same name; kept only where it is 10% smaller', async () => {
    const bundle: Rollup.OutputBundle = {
      'assets/opening-A1.mp3': asset('assets/opening-A1.mp3', LARGE_ENOUGH + 100_000),
      'assets/tavern-B2.mp3': asset('assets/tavern-B2.mp3', LARGE_ENOUGH + 10),
      'assets/v_ch1_chaos001-C3.mp3': asset('assets/v_ch1_chaos001-C3.mp3', 40_000),
      'assets/field-D4.webp': asset('assets/field-D4.webp', LARGE_ENOUGH * 2),
    };
    const seen: number[] = [];
    // A pretend encoder: the large song to 70%, the one just over the line to 95% (not worth it).
    const done = await leanTheMusic(bundle, {
      encode: async (b) => {
        seen.push(b.length);
        return Buffer.alloc(b.length === LARGE_ENOUGH + 10 ? Math.round(b.length * 0.95) : Math.round(b.length * 0.7));
      },
    });
    expect(seen.sort()).toEqual([LARGE_ENOUGH + 10, LARGE_ENOUGH + 100_000].sort());
    expect(done.converted).toBe(1);
    expect(Object.keys(bundle).sort()).toEqual(['assets/field-D4.webp', 'assets/opening-A1.mp3', 'assets/tavern-B2.mp3', 'assets/v_ch1_chaos001-C3.mp3']);
    expect(((bundle['assets/opening-A1.mp3'] as Rollup.OutputAsset).source as Buffer).length).toBe(Math.round((LARGE_ENOUGH + 100_000) * 0.7));
    expect(((bundle['assets/tavern-B2.mp3'] as Rollup.OutputAsset).source as Buffer).length).toBe(LARGE_ENOUGH + 10);
    expect(((bundle['assets/v_ch1_chaos001-C3.mp3'] as Rollup.OutputAsset).source as Buffer).length).toBe(40_000);
  });
});
