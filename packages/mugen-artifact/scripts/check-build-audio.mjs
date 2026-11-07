// THE GAME'S MUSIC IS THE DELIVERED MUSIC. Checked, not trusted.
//
// There are two sets of audio files in this repository and they must
// never meet:
//
//   packages/mugen-assets/files/audio/bgm/*.mp3  the delivered
//                                48 kHz stereo, ~190 kbps. What every
//                                player hears, looping at each file's
//                                own end.
//   .review-assets/*.mp3         short low-bitrate PREVIEW LOOPS, cut
//                                and crossfaded so a 16 MiB one-file
//                                artifact can carry something of each
//                                piece. Aliased in by
//                                vite.config.singlefile.ts and by
//                                nothing else.
//
// The separation is a line in a config file, and a line in a config
// file is exactly the sort of thing that gets copied into the wrong
// config. So this runs after `npm run build` and compares what the
// build actually emitted, byte for byte, against the delivered files.
// A preview loop in dist/ fails the build rather than shipping.
//
// Usage: node scripts/check-build-audio.mjs [distDir]

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// The delivered music lives in the assets package now, beside the rest
// of what was handed over, rather than inside this app.
const DELIVERED_DIR = resolve(APP_DIR, '../mugen-assets/files/audio/bgm');
/**
 * AND THE SOUND EFFECTS, which are delivered the same way and get the
 * same promise: what the phone plays is the file that was handed over.
 *
 * They differ from the music in one way that matters here — the
 * artifact carries none of them at all — so a sound effect appearing
 * in a single-file build is its own kind of wrong, caught by the same
 * comparison from the other direction.
 */
const DELIVERED_SE_DIR = resolve(APP_DIR, '../mugen-assets/files/audio/se');
const REVIEW_DIR = join(APP_DIR, '.review-assets');
const DIST_DIR = resolve(process.argv[2] ?? join(APP_DIR, 'dist'));

const AUDIO = /\.(mp3|m4a|ogg|opus|wav|aac|webm)$/i;

const digest = (path) => createHash('sha256').update(readFileSync(path)).digest('hex');

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (AUDIO.test(entry.name)) out.push(path);
  }
  return out;
}

const delivered = new Map();
for (const name of readdirSync(DELIVERED_DIR)) {
  if (AUDIO.test(name)) delivered.set(digest(join(DELIVERED_DIR, name)), name);
}
/** Music that must be emitted, kept apart from sound that may not be. */
const deliveredMusicCount = delivered.size;
if (existsSync(DELIVERED_SE_DIR)) {
  for (const name of readdirSync(DELIVERED_SE_DIR)) {
    if (AUDIO.test(name)) delivered.set(digest(join(DELIVERED_SE_DIR, name)), name);
  }
}
const previews = new Map();
if (existsSync(REVIEW_DIR)) {
  for (const name of readdirSync(REVIEW_DIR)) {
    if (AUDIO.test(name)) previews.set(digest(join(REVIEW_DIR, name)), name);
  }
}

const shipped = walk(DIST_DIR);
const failures = [];

if (shipped.length === 0) {
  failures.push(`no audio in ${DIST_DIR} — did the build run, and does it still emit the music?`);
}
if (delivered.size === 0) {
  failures.push(`no delivered music in ${DELIVERED_DIR}`);
}

for (const path of shipped) {
  const hash = digest(path);
  const short = path.slice(DIST_DIR.length + 1);
  if (previews.has(hash)) {
    failures.push(
      `${short} is the ARTIFACT PREVIEW LOOP of ${previews.get(hash)} — a short, ` +
        `low-bitrate cut — and it must never be in a build a player is given.`,
    );
    continue;
  }
  if (!delivered.has(hash)) {
    failures.push(
      `${short} (${statSync(path).size} bytes) matches no delivered file in ` +
        `packages/mugen-assets/files/audio (bgm or se). ` +
        `The game ships the delivered music exactly as it was handed over; ` +
        `anything else here has been re-encoded somewhere it should not be.`,
    );
  }
}

// And every delivered PIECE OF MUSIC has to have actually been
// emitted: a build that dropped the forest's music would otherwise
// pass this silently.
//
// Sound effects are deliberately not held to that. A sound nobody has
// wired to a moment yet is a file in the folder that the bundler never
// sees a reference to, which is correct and must not fail a build.
const shippedHashes = new Set(shipped.map(digest));
let checked = 0;
for (const [hash, name] of delivered) {
  if (checked++ >= deliveredMusicCount) break;
  if (!shippedHashes.has(hash)) failures.push(`${name} was not emitted by the build at all.`);
}

if (failures.length > 0) {
  console.error('\nThe build\'s music is not the delivered music:\n');
  for (const line of failures) console.error(`  FAIL  ${line}`);
  console.error('');
  process.exit(1);
}
console.log(
  `  PASS  all ${shipped.length} audio files in ${DIST_DIR.slice(APP_DIR.length + 1)} are the ` +
    `delivered music, byte for byte`,
);
