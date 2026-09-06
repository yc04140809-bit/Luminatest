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
  // Kaos' walking sheet. Re-encoded at the same resolution, so the
  // rectangles the game cuts her four views out of still line up.
  {
    source: join(APP_DIR, 'src/assets/characters/kaos/kaos-exploration-sheet.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-exploration-sheet.webp'),
  },
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
}
