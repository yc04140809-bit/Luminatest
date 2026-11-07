import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import type { Plugin, Rollup } from 'vite';

type OutputAsset = Rollup.OutputAsset;
type OutputBundle = Rollup.OutputBundle;
const run = promisify(execFile);

/**
 * 音楽ファイルの軽量化 (B5, 作者採用 2026-11-06 — A1 の画像と同じ形で).
 *
 * The music as delivered stays as it is in mugen-assets/files/audio (about 185kbps); only a BUILD writes each large
 * MP3 again at 128kbps — the same length, rate and channels — under the same name (nothing points elsewhere). About
 * 30% smaller (greenwood-forest 4.9MB → 3.4MB). The voices are small and stay as they are (LARGE_ENOUGH); a file
 * the encoding would not make 10% smaller is left as it was. The sound only: a cover picture inside a file is
 * dropped (the game never shows one).
 *
 * The encoder is ffmpeg-static (a development tool, never shipped). Where it is not installed the build goes on
 * with the music as delivered and says so. Converted once per file and setting: node_modules/.cache/mugen-mp3.
 * `MUGEN_KEEP_MP3=1` builds with the music as it is.
 */
export const MUSIC_BITRATE = '128k';
/** Smaller than this is a voice or a short sound: left as it is. */
export const LARGE_ENOUGH = 900_000;

type Encode = (mp3: Buffer) => Promise<Buffer>;

async function ffmpegPath(): Promise<string | null> {
  try {
    const mod = (await import('ffmpeg-static')) as unknown as { default: string | null };
    return mod.default && existsSync(mod.default) ? mod.default : null;
  } catch {
    return null;
  }
}

function ffmpegEncode(bin: string): Encode {
  return async (mp3) => {
    const dir = mkdtempSync(join(tmpdir(), 'mugen-mp3-'));
    try {
      const src = join(dir, 'in.mp3');
      const out = join(dir, 'out.mp3');
      writeFileSync(src, mp3);
      // The sound only: a cover picture some files carry is never shown by the game (and was written larger).
      await run(bin, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-map', '0:a', '-codec:a', 'libmp3lame', '-b:a', MUSIC_BITRATE, out]);
      return readFileSync(out);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  };
}

/** The large MP3s in `bundle` written again at 128kbps, in place. Returns what was done. */
export async function leanTheMusic(
  bundle: OutputBundle,
  { encode, cacheDir }: { encode: Encode; cacheDir?: string },
): Promise<{ converted: number; before: number; after: number }> {
  const songs = Object.values(bundle).filter(
    (o): o is OutputAsset => o.type === 'asset' && /\.mp3$/i.test(o.fileName) && typeof o.source !== 'string' && o.source.length >= LARGE_ENOUGH,
  );
  const tag = createHash('sha1').update(`libmp3lame ${MUSIC_BITRATE} audio-only`).digest('hex').slice(0, 8);
  if (cacheDir) mkdirSync(cacheDir, { recursive: true });
  let converted = 0;
  let before = 0;
  let after = 0;
  const one = async (asset: OutputAsset) => {
    const mp3 = Buffer.from(asset.source as Uint8Array);
    const cached = cacheDir ? join(cacheDir, `${createHash('sha1').update(mp3).digest('hex')}-${tag}.mp3`) : null;
    let lean: Buffer;
    if (cached && existsSync(cached)) lean = readFileSync(cached);
    else {
      lean = await encode(mp3);
      if (cached) writeFileSync(cached, lean);
    }
    if (lean.length > mp3.length * 0.9) return;
    asset.source = lean;
    converted += 1;
    before += mp3.length;
    after += lean.length;
  };
  const queue = [...songs];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      for (let a = queue.shift(); a; a = queue.shift()) await one(a);
    }),
  );
  return { converted, before, after };
}

export function leanerMusic({ cacheDir }: { cacheDir: string }): Plugin {
  return {
    name: 'mugen-leaner-music',
    apply: 'build',
    enforce: 'post',
    async generateBundle(_options, bundle) {
      if (process.env.MUGEN_KEEP_MP3 === '1') return;
      const bin = await ffmpegPath();
      if (!bin) {
        this.warn('ffmpeg-static が見つからないため、音楽は元のまま（約185kbps）で書き出します。');
        return;
      }
      const { converted, before, after } = await leanTheMusic(bundle, { encode: ffmpegEncode(bin), cacheDir });
      if (converted > 0) this.info(`音楽 ${converted} 本を ${MUSIC_BITRATE}bps に: ${(before / 1e6).toFixed(0)}MB → ${(after / 1e6).toFixed(0)}MB`);
    },
  };
}
