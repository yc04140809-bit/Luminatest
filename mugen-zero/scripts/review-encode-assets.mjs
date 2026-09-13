// Review-copy asset encoding — for the single-file artifact ONLY.
//
// The delivered artwork is two 1536x1024 PNGs weighing 7.3 MB together.
// The game uses those files exactly as delivered and this script never
// touches them: it writes SEPARATE copies elsewhere, and only the
// single-file build (vite.config.singlefile.ts) is aliased to them.
//
// Why it has to exist: the single-file build inlines every asset as a
// data URI, and base64 adds a third again on top. With the PNGs the
// artifact came to 21.97 MB against a 16 MB publishing limit, so there
// was no artifact at all. These copies are a review convenience, not
// game assets.
//
// What is preserved, deliberately:
//   - the resolution, exactly. 1536x1024 in, 1536x1024 out.
//   - the composition, the crop and every element of the staging, which
//     is the whole point of a review copy.
// What changes: the container and the compression, and nothing else.
// Nothing is redrawn, regenerated, resized or recomposed.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const REVIEW_ASSET_DIR = join(APP_DIR, '.review-assets');

/**
 * The delivered files, and the review copy each one gets.
 *
 * Only heavy artwork belongs here. Everything else in the game is
 * small enough to inline as delivered, and is left alone.
 */
export const REVIEW_ASSETS = [
  {
    source: join(APP_DIR, 'src/assets/arcana/unknown-ancient-dragon.png'),
    out: join(REVIEW_ASSET_DIR, 'unknown-ancient-dragon.webp'),
    // Reviewed two rounds ago and unchanged since.
    quality: 55,
  },
  {
    source: join(APP_DIR, 'src/assets/arcana/ancient-breath.png'),
    out: join(REVIEW_ASSET_DIR, 'ancient-breath.webp'),
    // Reviewed two rounds ago and unchanged since.
    quality: 55,
  },
  // The forest field and Gald face down: 5.5 MB of PNG between them,
  // which put the artifact back over the limit the moment they landed.
  {
    source: join(APP_DIR, 'src/assets/backgrounds/field-greenwood.png'),
    out: join(REVIEW_ASSET_DIR, 'field-greenwood.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-battle-down.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-battle-down.webp'),
  },
  // The three battle figures, delivered as transparent PNGs: 6.6 MB
  // between them, and the artifact has no room for that on top of
  // everything else. The game uses the delivered files; these copies
  // are for the single-file review build only.
  {
    source: join(APP_DIR, 'src/assets/characters/hero/hero-battle-idle.png'),
    out: join(REVIEW_ASSET_DIR, 'hero-battle-idle.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/kaos/kaos-battle-idle.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-battle-idle.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-battle-idle.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-battle-idle.webp'),
  },
  // And the other two of his redesign, which arrived as PNGs of the
  // same weight: 4.3 MB more that the artifact has no room for. The
  // game still uses the delivered files at their delivered quality.
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-ready.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-ready.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-defeated.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-defeated.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-battle-damage.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-battle-damage.webp'),
  },
  // And the three lives he can be left in. Event CGs at 2.5 MB each:
  // 7.5 MB of PNG for three pictures the artifact shows one of.
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-baker.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-baker.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-healer.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-healer.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/gald/gald-worker.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-worker.webp'),
  },
  // The moss rabbit's two pictures: 4.7 MB of PNG, and the single
  // largest thing left in the artifact once the dragon was handled.
  {
    source: join(APP_DIR, 'src/assets/enemies/moss-rabbit.png'),
    out: join(REVIEW_ASSET_DIR, 'moss-rabbit.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/enemies/moss-rabbit-down.png'),
    out: join(REVIEW_ASSET_DIR, 'moss-rabbit-down.webp'),
  },
  // Kaos' four walking sheets, one a direction, four frames each. Every
  // one is re-encoded at the SAME RESOLUTION it was delivered at, which
  // is the whole rule for this list: the game cuts her frames out by
  // pixel rectangle, so a sheet that came back a different size would
  // have her walking with somebody else's head.
  //
  // They take the cut rather than the high number, and not because they
  // matter less: they are DRAWN AT A QUARTER SIZE. Her sheets are 543
  // pixels a frame and she stands about 130 tall in the forest, so the
  // difference between 82 and 70 is spent on detail no reviewer can see
  // while costing a quarter of a megabyte of an artifact that has to
  // fit in sixteen. Four sheets replaced one here, which is most of a
  // megabyte on its own.
  ...['front', 'back', 'left', 'right'].map((facing) => ({
    source: join(APP_DIR, `src/assets/characters/kaos/kaos-exploration-${facing}.png`),
    out: join(REVIEW_ASSET_DIR, `kaos-exploration-${facing}.webp`),
    quality: 62,
  })),
  // The two full-body townspeople, 2.0 MB of PNG between them and the
  // last heavy artwork nobody had listed. They join at the SAME number
  // as everything else rather than at a cut one: they are only here
  // because they are in the game, but there was no reason to pay for
  // them in PNG when WebP holds them at a fifth the weight. The room
  // this frees is what the review build's music is paid for with —
  // nothing already in this list got worse to make space for a song.
  {
    source: join(APP_DIR, 'src/assets/characters/bakery-owner/bakery-owner-fullbody.png'),
    out: join(REVIEW_ASSET_DIR, 'bakery-owner-fullbody.webp'),
  },
  {
    source: join(APP_DIR, 'src/assets/characters/lina/lina-fullbody.png'),
    out: join(REVIEW_ASSET_DIR, 'lina-fullbody.webp'),
  },
  // THE BATTLE UI, cut from the delivered asset pack. Small pieces, but
  // eighteen of them and every one carries an alpha channel, which PNG
  // is poor at: 1.2 MB of PNG for art that draws at 30-180 CSS pixels.
  // They keep a high number despite the size — they ARE this round, and
  // a reviewer asked to judge the UI must not be judging the encoder.
  ...[
    'chip-auto-on', 'chip-auto-off', 'chip-x2-on', 'chip-x2-off',
    'chip-escape-on', 'chip-escape-off', 'command-diamond',
    'turn-slot', 'turn-next', 'party-card', 'enemy-plate',
    'message-window', 'memory-panel', 'memory-star',
    'bar-rail', 'bar-hp', 'bar-mp', 'bar-alt',
  ].map((piece) => ({
    source: join(APP_DIR, `src/assets/ui/battle/${piece}.png`),
    out: join(REVIEW_ASSET_DIR, `${piece}.webp`),
    quality: 88,
  })),
];

/**
 * High enough that a reviewer is judging the art, not the encoder.
 *
 * Lowered from 92 when the three delivered battle figures landed: at 92
 * the artifact came to 11.4 MB and was refused, so there was no
 * artifact at all. Leaving a character out of the review build would be
 * worse — nobody can judge a battlefield with one of the three people
 * missing.
 *
 * Where the budget is spent is a judgement, not an average: whatever
 * the round is ABOUT keeps the high number, and art that has already
 * been reviewed and is only in the build because it is in the game
 * takes the cut (see `quality` on the entries above). Resolution,
 * composition and crop are untouched either way, and the repository's
 * PNGs are what the game, the tests and the screenshots all use.
 */
const QUALITY = 82;

const ENCODE = `
import sys
from PIL import Image
src, out, quality = sys.argv[1], sys.argv[2], int(sys.argv[3])
im = Image.open(src)
before = im.size
# Flattened onto nothing and re-encoded at the SAME size. No resize,
# no crop, no recomposition: a reviewer must be looking at the same
# picture, in the same frame, at the same resolution.
if im.mode not in ('RGB', 'RGBA'):
    im = im.convert('RGBA')
im.save(out, format='WEBP', quality=quality, method=6)
after = Image.open(out).size
assert before == after, f'resolution changed: {before} -> {after}'
print(f'{before[0]}x{before[1]}')
`;

// ---------------------------------------------------------------- //
// THE MUSIC, FOR THE REVIEW BUILD ONLY.
//
// The same rule as the artwork above, and a harder arithmetic. The six
// delivered pieces are 23 MB of 48 kHz stereo MP3 — sixteen minutes of
// music — and the artifact they have to fit inside may not exceed 16
// MiB in total, base64 included. There is no encoding of sixteen
// minutes that fits in what is left of that.
//
// So a review copy of a piece of music is not the piece: it is a
// RECOGNISABLE EXCERPT of it, looping. Long enough to know which piece
// is playing and to hear one scene cross into the next, short enough
// that six of them fit. That is exactly what the artifact is for — 
// checking that the right music plays in the right place on a real
// phone — and it is not what the game ships. `npm run build` uses the
// delivered files, untouched, at their delivered quality.
//
// The delivered files are never rewritten, resampled or overwritten.

/** Where the excerpt starts. Past the intro, into the piece proper. */
const REVIEW_AUDIO_FROM_S = 8;
/**
 * How much of it. Forty-five seconds is long enough to recognise a
 * piece and to hear a crossfade land, and six of them fit.
 */
const REVIEW_AUDIO_SECONDS = 45;
/**
 * STEREO, deliberately, and the bitrate takes the cut instead.
 *
 * Mono would buy about a third and it would buy it in the one place
 * that matters: what these pieces are being checked for is whether
 * they belong in their scene, and half the width of a mix is half the
 * evidence. 48 kbps joint stereo at 32 kHz is a poor copy of a good
 * recording — and it is a copy of the right recording, in stereo.
 */
const REVIEW_AUDIO_BITRATE = '48k';
const REVIEW_AUDIO_RATE = 32000;

export const REVIEW_AUDIO = [
  'opening',
  'kaos-event',
  'alden-village',
  'tavern',
  'greenwood-forest',
  'normal-battle',
].map((name) => ({
  source: join(APP_DIR, `src/assets/audio/bgm/${name}.mp3`),
  out: join(REVIEW_ASSET_DIR, `${name}.mp3`),
}));

/**
 * Writes the review copies of the music.
 *
 * `-vn` is not optional: every one of these files carries a 360x640
 * cover image as a video stream, and without it ffmpeg copies the
 * artwork into the excerpt — which cost more than the audio did.
 */
export function encodeReviewAudio() {
  mkdirSync(REVIEW_ASSET_DIR, { recursive: true });
  const made = [];
  for (const track of REVIEW_AUDIO) {
    if (!existsSync(track.source)) {
      throw new Error(`Review encoding: ${track.source} is missing.`);
    }
    try {
      execFileSync(
        'ffmpeg',
        [
          '-v', 'error', '-y',
          '-ss', String(REVIEW_AUDIO_FROM_S),
          '-i', track.source,
          '-vn',                       // leave the cover art behind
          '-t', String(REVIEW_AUDIO_SECONDS),
          '-ac', '2',                  // stereo, on purpose
          '-ar', String(REVIEW_AUDIO_RATE),
          '-b:a', REVIEW_AUDIO_BITRATE,
          '-map_metadata', '-1',       // no tags to carry
          track.out,
        ],
        { encoding: 'utf-8' },
      );
    } catch (error) {
      throw new Error(
        `Review encoding needs ffmpeg to build the single-file artifact ` +
          `(the delivered music is 23 MB and the artifact limit is 16 MiB). ` +
          `Install it, or build with the regular config, which uses the ` +
          `delivered MP3s exactly as they are.\n${error}`,
      );
    }
    made.push({
      out: track.out,
      from: statSync(track.source).size,
      to: statSync(track.out).size,
    });
  }
  return made;
}

/**
 * Writes the review copies. Throws rather than letting a build quietly
 * ship the wrong thing — an artifact that silently lost its artwork is
 * worse than a build that stopped and said why.
 */
export function encodeReviewAssets() {
  mkdirSync(REVIEW_ASSET_DIR, { recursive: true });
  const made = [];
  for (const asset of REVIEW_ASSETS) {
    if (!existsSync(asset.source)) {
      throw new Error(`Review encoding: ${asset.source} is missing.`);
    }
    let size;
    try {
      size = execFileSync(
        'python3',
        ['-c', ENCODE, asset.source, asset.out, String(asset.quality ?? QUALITY)],
        { encoding: 'utf-8' },
      ).trim();
    } catch (error) {
      throw new Error(
        `Review encoding needs python3 with Pillow to build the single-file ` +
          `artifact (the delivered PNGs are too large to inline). ` +
          `Install it, or build with the regular config, which uses the ` +
          `PNGs as delivered.\n${error}`,
      );
    }
    made.push({
      out: asset.out,
      size,
      from: statSync(asset.source).size,
      to: statSync(asset.out).size,
    });
  }
  return made;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const m of encodeReviewAssets()) {
    const pct = Math.round((m.to / m.from) * 100);
    console.log(`${m.out} ${m.size} ${(m.to / 1e6).toFixed(2)}MB (${pct}% of the PNG)`);
  }
  for (const m of encodeReviewAudio()) {
    const pct = Math.round((m.to / m.from) * 100);
    console.log(`${m.out} ${(m.to / 1e6).toFixed(2)}MB (${pct}% of the delivered MP3)`);
  }
}
