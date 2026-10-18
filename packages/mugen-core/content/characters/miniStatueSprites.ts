// THE EXPLORERS AS MINI STATUES — the art the App walks with (作者「探索用キャラクター表示ルール」
// 2026-10-17, swapped in by「探索システムPoC 改善指示書」2026-10-18).
//
// The same shape as explorationSprites.ts (that registry stays for the Artifact's forest), so a scene
// draws these without knowing which it has. Every frame here is a whole file of its own, cut from the
// delivered drafts onto one canvas per character: the same size, the same ground line, the figure the
// same height in every frame, so nothing jumps when a frame changes or someone turns.
//
// Both are the revised four-view sheets (front, left, back, right — 作者 2026-10-18): Kaos redrawn to
// the hero's proportions, then the hero redrawn to match her (his sword left off for exploring).
//
// What was done to the delivered pixels, and nothing more (docs/EXPLORER_MINI_STATUE.md §5):
//   - each figure is cut out on its own (a neighbour's edge never comes with it), the faint pink rim the
//     painting left around his hair taken off;
//   - each figure is scaled to one height and set on the ground line, between its boots.
// Nothing is mirrored: the hero's mark under his left eye and Kaos's two different wings would swap.
//
// WAITING ON ART — said here so it is not mistaken for a decision: both have standing drawings only, and
// are moved with the scene's bob (a little higher than with a cycle), not animated. The walking drawings
// drop in as `walk` frames, on the same canvas, and nothing else changes.

import heroBackIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-back-idle.webp';
import heroFrontIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-front-idle.webp';
import heroLeftIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-left-idle.webp';
import heroRightIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-right-idle.webp';
import kaosBackIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-back-idle.webp';
import kaosFrontIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-front-idle.webp';
import kaosLeftIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-left-idle.webp';
import kaosRightIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-right-idle.webp';
import type { ExplorationCharacterId, ExplorationSpriteSet, SpriteFrame } from './explorationSprites';

/** The hero's canvas: 380 × 360, his soles on y 354, the middle between his boots on x 190. */
function hero(url: string): SpriteFrame {
  return { url, anchor: { x: 190, y: 354 } };
}

/** Kaos's canvas: 400 × 360 (her wings reach wider), soles on y 354, between her boots on x 200. */
function kaos(url: string): SpriteFrame {
  return { url, anchor: { x: 200, y: 354 } };
}

export const MINI_STATUE_SPRITES: Record<ExplorationCharacterId, ExplorationSpriteSet> = {
  HERO: {
    id: 'hero-mini',
    // His height, crown of the hair to sole, in every frame.
    referencePixels: 340,
    // Standing drawings only for now (the walk is coming as its own drawings): he steps with the bob.
    frames: {
      front: { idle: hero(heroFrontIdle), walk: [] },
      back: { idle: hero(heroBackIdle), walk: [] },
      left: { idle: hero(heroLeftIdle), walk: [] },
      right: { idle: hero(heroRightIdle), walk: [] },
    },
  },
  KAOS: {
    id: 'kaos-mini',
    // What the scene's size for her (a little under his) measures. Crown to sole she is 305 of the 340
    // drawn (the curl above takes the rest), his crown to sole is 324 of his 340 (his spikes the rest):
    // 320 keeps her crown-to-sole at 94% of his, as it always was (0.376 against 0.4).
    referencePixels: 320,
    frames: {
      front: { idle: kaos(kaosFrontIdle), walk: [] },
      back: { idle: kaos(kaosBackIdle), walk: [] },
      left: { idle: kaos(kaosLeftIdle), walk: [] },
      right: { idle: kaos(kaosRightIdle), walk: [] },
    },
  },
};
