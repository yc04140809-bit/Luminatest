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
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** The assets package, which is where the delivered files live now. */
const ASSETS_DIR = resolve(APP_DIR, '../mugen-assets');
export const REVIEW_ASSET_DIR = join(APP_DIR, '.review-assets');

/**
 * The delivered files, and the review copy each one gets.
 *
 * Only heavy artwork belongs here. Everything else in the game is
 * small enough to inline as delivered, and is left alone.
 */
export const REVIEW_ASSETS = [
  // THE TWO ARCANA CGS, AND THE ONE TIME THIS LIST HAS GONE BACKWARDS.
  //
  // They were the heaviest things left in the artifact — 1.4 MB of the
  // 16 MiB between them — and Kaos' six standing pictures did not fit
  // on top of them. Something had to come down, and seven tenths of a
  // 1536-pixel illustration is 1075 pixels for a stage 390 tall: still
  // nearly twice the pixels any phone can show of it, and the least
  // harmful byte in the building.
  //
  // The delivered files are untouched; the game draws them whole. If
  // the artifact ever gets room back, this is the first line to undo.
  {
    source: join(ASSETS_DIR, 'files/arcana/unknown-ancient-dragon.png'),
    out: join(REVIEW_ASSET_DIR, 'unknown-ancient-dragon.webp'),
    quality: 55,
    scale: 0.7,
  },
  {
    source: join(ASSETS_DIR, 'files/arcana/ancient-breath.png'),
    out: join(REVIEW_ASSET_DIR, 'ancient-breath.webp'),
    quality: 55,
    scale: 0.7,
  },
  /**
   * THE THEME SONG'S COVER — shown whole on the phone, lightened here.
   *
   * 374 KB of WebP is nothing in an APK and nearly everything in what
   * is left of 16 MiB: base64 would make it about 500 KB against 467 KB
   * of headroom. So the artifact carries a smaller copy and the game
   * carries the delivered one, which is the arrangement every line in
   * this list exists for.
   *
   * A DIFFERENT NAME ON THE WAY OUT, because this is the first entry
   * whose source is already a .webp: an alias whose replacement has the
   * same basename as its pattern can match its own output.
   */
  {
    source: join(ASSETS_DIR, 'files/backgrounds/theme-song-cover.webp'),
    out: join(REVIEW_ASSET_DIR, 'theme-song-cover-review.webp'),
    quality: 60,
    scale: 0.62,
  },
  // The forest field and Gald face down: 5.5 MB of PNG between them,
  // which put the artifact back over the limit the moment they landed.
  {
    source: join(ASSETS_DIR, 'files/backgrounds/field-greenwood.png'),
    out: join(REVIEW_ASSET_DIR, 'field-greenwood.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-battle-down.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-battle-down.webp'),
  },
  // The three battle figures, delivered as transparent PNGs: 6.6 MB
  // between them, and the artifact has no room for that on top of
  // everything else. The game uses the delivered files; these copies
  // are for the single-file review build only.
  {
    source: join(ASSETS_DIR, 'files/characters/hero/hero-battle-idle.png'),
    out: join(REVIEW_ASSET_DIR, 'hero-battle-idle.webp'),
  },
  // KAOS' SIX STANDING PICTURES. They arrived as a set with a role
  // each — menu, talking, 臨戦, fighting, casting, awakened — and they
  // are 11 MB of PNG between them, which is most of an artifact on
  // their own. Every one of them is on screen in ordinary play except
  // the menu, which has no screen yet and is here so a reviewer can see
  // what it will be.
  //
  // THE THREE FIGHTING ONES COME DOWN IN SIZE AND THE TWO TALKING ONES
  // DO NOT, and the split is about how each is SHOWN rather than about
  // which matters more.
  //
  // A battle figure is drawn whole, about two hundred CSS pixels tall
  // on a three-hundred-and-ninety pixel stage — so a 1145-pixel file is
  // between three and six times more picture than any phone can put on
  // screen, and half of it is still oversampled at 2x. A TALKING
  // figure is not drawn whole: the dialogue plate crops her FACE out of
  // it, which is about a sixth of the file's width blown up to a
  // hundred and forty-eight pixels. Shrinking those would be shrinking
  // the one part of them anybody looks at.
  //
  // The delivered files are untouched either way; the game draws all
  // six at full size. This is the artifact's copy of them and nothing
  // else reads it.
  {
    source: join(ASSETS_DIR, 'files/characters/kaos/kaos-battle-default.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-battle-default.webp'),
    scale: 0.5,
  },
  {
    source: join(ASSETS_DIR, 'files/characters/kaos/kaos-cast.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-cast.webp'),
    scale: 0.5,
  },
  {
    source: join(ASSETS_DIR, 'files/characters/kaos/kaos-awaken.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-awaken.webp'),
    scale: 0.5,
  },
  {
    source: join(ASSETS_DIR, 'files/characters/kaos/kaos-talk-default.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-talk-default.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/characters/kaos/kaos-talk-rinsen.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-talk-rinsen.webp'),
  },
  // NO SCREEN SHOWS THIS ONE YET. It is in the artifact only because
  // the manifest imports it and the build inlines what is imported, so
  // it is here as a THUMBNAIL — twenty kilobytes for a picture nobody
  // in the artifact can reach. It goes back to the same terms as the
  // others the day the menu screen exists to show it.
  {
    source: join(ASSETS_DIR, 'files/characters/kaos/kaos-menu.png'),
    out: join(REVIEW_ASSET_DIR, 'kaos-menu.webp'),
    quality: 70,
    scale: 0.25,
  },
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-battle-idle.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-battle-idle.webp'),
  },
  // And the other two of his redesign, which arrived as PNGs of the
  // same weight: 4.3 MB more that the artifact has no room for. The
  // game still uses the delivered files at their delivered quality.
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-ready.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-ready.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-defeated.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-defeated.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-battle-damage.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-battle-damage.webp'),
  },
  // And the three lives he can be left in. Event CGs at 2.5 MB each:
  // 7.5 MB of PNG for three pictures the artifact shows one of.
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-baker.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-baker.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-healer.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-healer.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/characters/gald/gald-worker.png'),
    out: join(REVIEW_ASSET_DIR, 'gald-worker.webp'),
  },
  // The moss rabbit's two pictures: 4.7 MB of PNG, and the single
  // largest thing left in the artifact once the dragon was handled.
  {
    source: join(ASSETS_DIR, 'files/enemies/moss-rabbit.png'),
    out: join(REVIEW_ASSET_DIR, 'moss-rabbit.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/enemies/moss-rabbit-down.png'),
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
    source: join(ASSETS_DIR, `files/characters/kaos/kaos-exploration-${facing}.png`),
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
    source: join(ASSETS_DIR, 'files/characters/bakery-owner/bakery-owner-fullbody.png'),
    out: join(REVIEW_ASSET_DIR, 'bakery-owner-fullbody.webp'),
  },
  {
    source: join(ASSETS_DIR, 'files/characters/lina/lina-fullbody.png'),
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
    source: join(ASSETS_DIR, `files/ui/battle/${piece}.png`),
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
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 1.0
im = Image.open(src)
before = im.size
if im.mode not in ('RGB', 'RGBA'):
    im = im.convert('RGBA')
# SCALE 1.0 IS THE RULE AND THE DEFAULT. Same size, same frame, same
# crop: a reviewer has to be looking at the same picture. An entry that
# asks for less says why in its own comment, and the number is asserted
# afterwards so a silent resize is impossible either way.
if scale != 1.0:
    im = im.resize((round(before[0] * scale), round(before[1] * scale)), Image.LANCZOS)
im.save(out, format='WEBP', quality=quality, method=6)
after = Image.open(out).size
want = (round(before[0] * scale), round(before[1] * scale))
assert want == after, f'resolution is not what was asked for: {want} -> {after}'
print(f'{before[0]}x{before[1]} -> {after[0]}x{after[1]}')
`;

// ---------------------------------------------------------------- //
// THE MUSIC — A PREVIEW LOOP, AND FOR THE ARTIFACT ONLY.
//
// ============================================================== //
//  NOTHING IN THIS SECTION EVER REACHES THE GAME.
//
//  `npm run build` — the build a player would be given — serves
//  packages/mugen-assets/files/audio/bgm/*.mp3 exactly as they were delivered: full
//  length, 48 kHz stereo, ~190 kbps, looping at each file's own end
//  because the audio manager sets `loop` on the element and nothing
//  in the project ever sets a loop point. scripts/check-build-audio
//  .mjs runs after that build and fails it if a single byte of any
//  shipped MP3 differs from its source, so a preview copy cannot
//  reach production even by accident.
//
//  What is written below goes into `.review-assets/`, and ONLY
//  vite.config.singlefile.ts — the one-file artifact shared for
//  review on a phone — is aliased to it.
// ============================================================== //
//
// WHY A PREVIEW LOOP EXISTS AT ALL. The artifact inlines every asset
// as a data URI, base64 and all, into one HTML file that may not
// exceed 16 MiB. The six delivered pieces are sixteen minutes of
// music and 23 MB before base64; there is no encoding of that which
// fits in what is left of the budget after the artwork, and the
// artwork is not being made worse to find room.
//
// WHAT WAS WRONG WITH THE OLD PREVIEW, AND IS FIXED HERE. It took a
// flat 45 seconds starting 8 seconds in and let the element loop it.
// So the music stopped in the middle of a phrase and jumped back to
// the middle of another one, every 45 seconds — which does not read
// as "this is an excerpt", it reads as a bug in the game. The excerpt
// is still an excerpt; it is now a LOOP:
//
//   1. the length is CHOSEN, not fixed. For each piece the encoder
//      looks for the point where the music most nearly repeats — it
//      compares the spectrum two seconds either side of every
//      candidate seam and takes the best fit, refusing seams that
//      fall in a quiet patch or that change loudness across the join.
//      That lands on a phrase or bar boundary when the piece has one,
//      which is the "musically natural division" this is for.
//   2. the start is chosen the same way rather than fixed at 0:08.
//   3. the seam is CROSSFADED INTO THE FILE. The three quarters of a
//      second that follow the loop point are faded down over the
//      three quarters of a second at the start, so when the element
//      wraps it continues out of the material it was just playing
//      instead of cutting to it. Nothing at runtime knows about this:
//      the file simply loops cleanly, and the GAME's own files have
//      no such seam because they are never cut.
//
// The delivered files are never rewritten, resampled or overwritten.

/** Where a preview may start looking for its loop, in seconds. */
const PREVIEW_STARTS = [0, 2, 4, 6, 8, 10, 12, 14, 16];
/** How long a preview loop may be. The brief asks for 45–90 seconds. */
const PREVIEW_MIN_S = 45;
const PREVIEW_MAX_S = 75;
/**
 * How much music all six previews may come to, in seconds.
 *
 * THE ONE NUMBER THE ARTIFACT'S SIZE ACTUALLY TURNS ON. At the bitrate
 * below a second of preview is about 6 kB, so this is about 1.95 MB of
 * MP3 and about 2.6 MB once base64 has added its third — which leaves
 * roughly a third of a megabyte of headroom under the 16 MiB limit
 * with the artwork untouched at its current quality.
 *
 * The encoder spends it by finding the longest shared length cap that
 * fits, so a piece with a good long loop gets one when its neighbours
 * are short. Raise this and the artifact stops publishing; lower it
 * and the previews get shorter. It is not a quality setting and it has
 * nothing to do with the game.
 */
const PREVIEW_TOTAL_BUDGET_S = 330;
/** Faded into the start, so the wrap is a continuation rather than a cut. */
const PREVIEW_CROSSFADE_S = 0.75;
/**
 * STEREO, deliberately, and the bitrate takes the cut instead.
 *
 * Mono would buy about a third and it would buy it in the one place
 * that matters: what these pieces are being checked for is whether
 * they belong in their scene, and half the width of a mix is half the
 * evidence. 48 kbps joint stereo at 32 kHz is a poor copy of a good
 * recording — and it is a copy of the right recording, in stereo.
 * The game ships the delivered ~190 kbps files and never this.
 */
const PREVIEW_BITRATE_KBPS = 48;
const PREVIEW_RATE = 32000;

export const REVIEW_AUDIO = [
  'title-main',
  'opening',
  'kaos-event',
  'alden-village',
  'tavern',
  'greenwood-forest',
  'normal-battle',
  'boss-battle',
].map((name) => ({
  source: join(ASSETS_DIR, `files/audio/bgm/${name}.mp3`),
  out: join(REVIEW_ASSET_DIR, `${name}.mp3`),
}));

/**
 * Where each piece most nearly repeats itself.
 *
 * Reads every track, compares the spectrum two seconds either side of
 * every candidate seam, and prints one JSON object. Kept out of the
 * build's hot path by the cache below: the answer only changes when
 * the music does.
 *
 * The feature is a log-spaced band spectrum with the per-frame mean
 * removed and the vector normalised, so what is being matched is the
 * SHAPE of the music — the chord, the instrumentation, the place in
 * the bar — rather than the waveform, which would only ever match a
 * piece that had been rendered from a loop in the first place. Level
 * is then compared separately and a mismatch penalised, because a seam
 * that is musically right and eight decibels louder still sounds like
 * a join.
 */
const FIND_LOOPS = `
import json, subprocess, sys
import numpy as np

SR, HOP, NFFT = 11025, 256, 1024
STARTS = json.loads(sys.argv[1])
LO, HI, WIN = float(sys.argv[2]), float(sys.argv[3]), 2.0
BUDGET = float(sys.argv[4])
LEVEL_WEIGHT = 0.18
QUIET_FLOOR = 0.35

def pcm(path):
    raw = subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', path, '-vn', '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float32)

def analyse(x):
    n = 1 + (len(x) - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    frames = x[idx] * np.hanning(NFFT).astype(np.float32)
    mag = np.abs(np.fft.rfft(frames, axis=1))
    edges = np.unique(np.geomspace(2, mag.shape[1] - 1, 49).astype(int))
    bands = np.stack([mag[:, a:b].sum(1) for a, b in zip(edges[:-1], edges[1:])], 1)
    f = np.log1p(bands)
    f -= f.mean(1, keepdims=True)
    f /= np.maximum(np.linalg.norm(f, axis=1, keepdims=True), 1e-6)
    return f, np.sqrt((frames ** 2).mean(1) + 1e-12)

def candidates(path):
    x = pcm(path)
    f, rms = analyse(x)
    fps = SR / HOP
    W = int(WIN * fps)
    floor = QUIET_FLOOR * float(np.sqrt((x ** 2).mean()))
    found = []
    for s in STARTS:
        a = int(s * fps)
        if a + W > len(f):
            continue
        A, ra = f[a:a + W], float(rms[a:a + W].mean())
        for l in range(int(LO * fps), int(HI * fps)):
            b = a + l
            if b + W > len(f):
                break
            rb = float(rms[b:b + W].mean())
            if min(ra, rb) < floor:
                continue
            fit = float((A * f[b:b + W]).sum() / W)
            level = float(abs(np.log2(ra / rb)))
            found.append((fit - LEVEL_WEIGHT * level, fit, level, float(s), l / fps))
    if not found:
        # Nothing passed the floor: fall back to the shortest allowed
        # loop rather than failing a build over a quiet recording.
        return [(0.0, 0.0, 0.0, float(STARTS[0]), LO)]
    found.sort(reverse=True)
    return found

def best_under(rows, cap):
    under = [r for r in rows if r[4] <= cap]
    return max(under or rows, key=lambda r: r[0])

tracks = json.loads(sys.argv[5])
rows = {name: candidates(path) for name, path in tracks}
# THE LONGEST SHARED CAP THAT FITS. Every piece picks its own best loop
# no longer than the cap; the cap comes down a second at a time until
# the six of them fit the budget. Longest-first rather than an even
# split, so a piece with a good long loop gets one.
cap = HI
while cap > LO:
    picks = {n: best_under(r, cap) for n, r in rows.items()}
    if sum(p[4] for p in picks.values()) <= BUDGET:
        break
    cap -= 1.0
picks = {n: best_under(r, max(cap, LO)) for n, r in rows.items()}
print(json.dumps({
    n: {'start': round(p[3], 3), 'length': round(p[4], 3),
        'fit': round(p[1], 3), 'level': round(p[2], 3)}
    for n, p in picks.items()
}))
`;

/** What the analysis was run against, so a rebuild can skip it. */
function loopCacheKey() {
  const stamp = REVIEW_AUDIO.map((track) => {
    const info = statSync(track.source);
    return `${basename(track.source)}:${info.size}:${info.mtimeMs}`;
  }).join('|');
  return [
    stamp,
    PREVIEW_STARTS.join(','),
    PREVIEW_MIN_S,
    PREVIEW_MAX_S,
    PREVIEW_TOTAL_BUDGET_S,
  ].join('#');
}

/**
 * The loop points, from the cache when the music has not changed.
 *
 * The search is a few seconds a track and its answer only moves when
 * the recording does, so the result is written beside the previews and
 * keyed by what it was computed from. A stale key re-runs the search
 * rather than trusting it.
 */
function loopPoints() {
  const key = loopCacheKey();
  const cachePath = join(REVIEW_ASSET_DIR, 'loop-points.json');
  if (existsSync(cachePath)) {
    try {
      const cached = JSON.parse(readFileSync(cachePath, 'utf-8'));
      if (cached.key === key) return cached.points;
    } catch {
      // Unreadable cache is no cache.
    }
  }
  const tracks = REVIEW_AUDIO.map((track) => [basename(track.source, '.mp3'), track.source]);
  const out = execFileSync(
    'python3',
    [
      '-c',
      FIND_LOOPS,
      JSON.stringify(PREVIEW_STARTS),
      String(PREVIEW_MIN_S),
      String(PREVIEW_MAX_S),
      String(PREVIEW_TOTAL_BUDGET_S),
      JSON.stringify(tracks),
    ],
    { encoding: 'utf-8', maxBuffer: 1 << 24 },
  );
  const points = JSON.parse(out.trim().split('\n').pop());
  mkdirSync(REVIEW_ASSET_DIR, { recursive: true });
  writeFileSync(cachePath, JSON.stringify({ key, points }, null, 2));
  return points;
}

function ffmpeg(args) {
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf-8' });
}

/**
 * Bakes one preview loop.
 *
 * THE SEAM IS BUILT INTO THE FILE, which is why nothing at runtime has
 * to know this exists. The preview is the music from `start` for
 * `length` seconds, except that its first three quarters of a second
 * are a crossfade: the material that FOLLOWS the loop point, fading
 * out, over the material at the loop's start, fading in. So the last
 * sample of the file runs into the first as a continuation of the same
 * phrase rather than a cut to a different one.
 *
 * Equal-power (quarter-sine) fades, not linear ones: the two sides are
 * different moments of the same piece and therefore uncorrelated, and
 * a linear crossfade of uncorrelated material dips in the middle.
 *
 * `-vn` is not optional: every one of these files carries a 360x640
 * cover image as a video stream, and without it ffmpeg copies the
 * artwork into the preview — which cost more than the audio did.
 */
function bakeLoop(track, point) {
  const { start, length } = point;
  const x = PREVIEW_CROSSFADE_S;
  const work = join(REVIEW_ASSET_DIR, `.loop-${basename(track.out, '.mp3')}`);
  const head = `${work}-head.wav`;
  const tail = `${work}-tail.wav`;
  const seam = `${work}-seam.wav`;
  const body = `${work}-body.wav`;
  try {
    // The start of the loop, fading in.
    ffmpeg(['-ss', String(start), '-t', String(x), '-i', track.source, '-vn',
      '-af', `afade=t=in:st=0:d=${x}:curve=qsin`, '-f', 'wav', head]);
    // What comes after the loop point, fading out.
    ffmpeg(['-ss', String(start + length), '-t', String(x), '-i', track.source, '-vn',
      '-af', `afade=t=out:st=0:d=${x}:curve=qsin`, '-f', 'wav', tail]);
    // The two of them, summed rather than averaged.
    ffmpeg(['-i', head, '-i', tail, '-filter_complex',
      '[0:a][1:a]amix=inputs=2:duration=longest:normalize=0', '-f', 'wav', seam]);
    // And the rest of the loop, untouched.
    ffmpeg(['-ss', String(start + x), '-t', String(length - x), '-i', track.source, '-vn',
      '-f', 'wav', body]);
    ffmpeg(['-i', seam, '-i', body, '-filter_complex', '[0:a][1:a]concat=n=2:v=0:a=1',
      '-ac', '2', '-ar', String(PREVIEW_RATE), '-b:a', `${PREVIEW_BITRATE_KBPS}k`,
      '-map_metadata', '-1', track.out]);
  } finally {
    for (const scrap of [head, tail, seam, body]) {
      if (existsSync(scrap)) rmSync(scrap, { force: true });
    }
  }
}

/**
 * Writes the artifact's preview loops. NEVER the game's music.
 */
export function encodeReviewAudio() {
  mkdirSync(REVIEW_ASSET_DIR, { recursive: true });
  for (const track of REVIEW_AUDIO) {
    if (!existsSync(track.source)) {
      throw new Error(`Review encoding: ${track.source} is missing.`);
    }
  }
  let points;
  try {
    points = loopPoints();
  } catch (error) {
    throw new Error(
      `Review encoding needs python3 with numpy to find the preview loop ` +
        `points for the single-file artifact. The regular build does not ` +
        `need it and uses the delivered MP3s exactly as they are.\n${error}`,
    );
  }
  const made = [];
  for (const track of REVIEW_AUDIO) {
    const name = basename(track.source, '.mp3');
    const point = points[name];
    if (!point) throw new Error(`Review encoding: no loop point found for ${name}.`);
    try {
      bakeLoop(track, point);
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
      ...point,
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
        ['-c', ENCODE, asset.source, asset.out, String(asset.quality ?? QUALITY), String(asset.scale ?? 1)],
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
