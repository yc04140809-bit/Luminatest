// THE EXPLORERS AS MINI STATUES — the art the App walks with (作者「探索用キャラクター表示ルール」
// 2026-10-17, swapped in by「探索システムPoC 改善指示書」2026-10-18).
//
// The same shape as explorationSprites.ts (that registry stays for the Artifact's forest), so a scene
// draws these without knowing which it has. Every frame here is a whole file of its own, cut from the
// delivered drafts onto one canvas per character: the same size, the same ground line, the figure the
// same height in every frame, so nothing jumps when a frame changes or someone turns.
//
// What was done to the delivered pixels, and nothing more (docs/EXPLORER_MINI_STATUE.md §3):
//   - the hero's sheet had the soft glow, the sparkles and the gold ring at his feet painted in; those
//     are taken out here (the game draws its own aura and ring, with states), the figure untouched;
//   - each figure is scaled to one height and set on the ground line, between its boots.
// Nothing is mirrored: the hero's mark under his left eye and Kaos's two different wings would swap.
//
// WAITING ON ART — said here so it is not mistaken for a decision:
//   - the hero facing right has one walking drawing (the delivered right-facing pose), not a cycle;
//     he steps with it and the scene's bob;
//   - Kaos has standing drawings only (front, left, back, right): she is moved with the bob, not
//     animated. A walk cycle per direction drops in here and nothing else changes.

import heroBackIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-back-idle.webp';
import heroBackWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk1.webp';
import heroBackWalk2 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk2.webp';
import heroBackWalk3 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk3.webp';
import heroBackWalk4 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk4.webp';
import heroFrontIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-front-idle.webp';
import heroFrontWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk1.webp';
import heroFrontWalk2 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk2.webp';
import heroFrontWalk3 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk3.webp';
import heroFrontWalk4 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk4.webp';
import heroLeftIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-left-idle.webp';
import heroLeftWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk1.webp';
import heroLeftWalk2 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk2.webp';
import heroLeftWalk3 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk3.webp';
import heroLeftWalk4 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk4.webp';
import heroRightIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-right-idle.webp';
import heroRightWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-right-walk1.webp';
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
    frames: {
      front: {
        idle: hero(heroFrontIdle),
        walk: [hero(heroFrontWalk1), hero(heroFrontWalk2), hero(heroFrontWalk3), hero(heroFrontWalk4)],
      },
      back: {
        idle: hero(heroBackIdle),
        walk: [hero(heroBackWalk1), hero(heroBackWalk2), hero(heroBackWalk3), hero(heroBackWalk4)],
      },
      left: {
        idle: hero(heroLeftIdle),
        walk: [hero(heroLeftWalk1), hero(heroLeftWalk2), hero(heroLeftWalk3), hero(heroLeftWalk4)],
      },
      right: { idle: hero(heroRightIdle), walk: [hero(heroRightWalk1)] },
    },
  },
  KAOS: {
    id: 'kaos-mini',
    // Her height head to sole, the hair curl above it left out (as before: a flourish, not her size) —
    // the curl is about a thirtieth of the 340 drawn.
    referencePixels: 330,
    frames: {
      front: { idle: kaos(kaosFrontIdle), walk: [] },
      back: { idle: kaos(kaosBackIdle), walk: [] },
      left: { idle: kaos(kaosLeftIdle), walk: [] },
      right: { idle: kaos(kaosRightIdle), walk: [] },
    },
  },
};
