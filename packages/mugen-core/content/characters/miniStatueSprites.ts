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
// THE WALK SPRITES (作者 2026-10-24「歩行時のアニメーションとして採用」— noah-walk-sprites / chaos-walk-sprites):
// every frame here is now from those packages, four steps each way in the order stride, passing, the
// other stride, passing (150ms a step, as their reference GIFs); standing is the passing step (frame 1),
// as the packages say. What was done to their pixels, and nothing more (scripted, the same for all):
//   - the sheet's dividing lines left at the edge of some of Kaos's frames taken away (nothing of her);
//   - one scale per character (the packages are each drawn to one scale), set so the front standing pose
//     is as tall as the mini statue was (340) — so they are drawn the size they always were;
//   - each frame set on the ground line; each direction moved as a whole so its standing pose's boots
//     are on the canvas's middle (the strides stay as drawn, and turning never jumps sideways).
// Never mirrored (both packages: his red line is under his left eye only; her eyes and wings differ).
// The hero facing left or back measures shorter than facing front — his hair's outline, not his size
// (shoulders, eyes and boots agree across the four views).

import heroBackIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-back-idle.webp';
import heroFrontIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-front-idle.webp';
import heroLeftIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-left-idle.webp';
import heroRightIdle from '@mugen/assets/files/characters/hero/explore/hero-mini-right-idle.webp';
import heroBackWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk1.webp';
import heroBackWalk2 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk2.webp';
import heroBackWalk3 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk3.webp';
import heroBackWalk4 from '@mugen/assets/files/characters/hero/explore/hero-mini-back-walk4.webp';
import heroFrontWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk1.webp';
import heroFrontWalk2 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk2.webp';
import heroFrontWalk3 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk3.webp';
import heroFrontWalk4 from '@mugen/assets/files/characters/hero/explore/hero-mini-front-walk4.webp';
import heroLeftWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk1.webp';
import heroLeftWalk2 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk2.webp';
import heroLeftWalk3 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk3.webp';
import heroLeftWalk4 from '@mugen/assets/files/characters/hero/explore/hero-mini-left-walk4.webp';
import heroRightWalk1 from '@mugen/assets/files/characters/hero/explore/hero-mini-right-walk1.webp';
import heroRightWalk2 from '@mugen/assets/files/characters/hero/explore/hero-mini-right-walk2.webp';
import heroRightWalk3 from '@mugen/assets/files/characters/hero/explore/hero-mini-right-walk3.webp';
import heroRightWalk4 from '@mugen/assets/files/characters/hero/explore/hero-mini-right-walk4.webp';
import kaosBackIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-back-idle.webp';
import kaosFrontIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-front-idle.webp';
import kaosLeftIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-left-idle.webp';
import kaosRightIdle from '@mugen/assets/files/characters/kaos/explore/kaos-mini-right-idle.webp';
import kaosBackWalk1 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-back-walk1.webp';
import kaosBackWalk2 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-back-walk2.webp';
import kaosBackWalk3 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-back-walk3.webp';
import kaosBackWalk4 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-back-walk4.webp';
import kaosFrontWalk1 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-front-walk1.webp';
import kaosFrontWalk2 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-front-walk2.webp';
import kaosFrontWalk3 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-front-walk3.webp';
import kaosFrontWalk4 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-front-walk4.webp';
import kaosLeftWalk1 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-left-walk1.webp';
import kaosLeftWalk2 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-left-walk2.webp';
import kaosLeftWalk3 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-left-walk3.webp';
import kaosLeftWalk4 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-left-walk4.webp';
import kaosRightWalk1 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-right-walk1.webp';
import kaosRightWalk2 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-right-walk2.webp';
import kaosRightWalk3 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-right-walk3.webp';
import kaosRightWalk4 from '@mugen/assets/files/characters/kaos/explore/kaos-mini-right-walk4.webp';
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
    // Standing (the walk's passing step), and four steps each way.
    frames: {
      front: { idle: hero(heroFrontIdle), walk: [hero(heroFrontWalk1), hero(heroFrontWalk2), hero(heroFrontWalk3), hero(heroFrontWalk4)] },
      back: { idle: hero(heroBackIdle), walk: [hero(heroBackWalk1), hero(heroBackWalk2), hero(heroBackWalk3), hero(heroBackWalk4)] },
      left: { idle: hero(heroLeftIdle), walk: [hero(heroLeftWalk1), hero(heroLeftWalk2), hero(heroLeftWalk3), hero(heroLeftWalk4)] },
      right: { idle: hero(heroRightIdle), walk: [hero(heroRightWalk1), hero(heroRightWalk2), hero(heroRightWalk3), hero(heroRightWalk4)] },
    },
  },
  KAOS: {
    id: 'kaos-mini',
    // What the scene's size for her (a little under his) measures. Crown to sole she is 305 of the 340
    // drawn (the curl above takes the rest), his crown to sole is 324 of his 340 (his spikes the rest):
    // 320 keeps her crown-to-sole at 94% of his, as it always was (0.376 against 0.4).
    referencePixels: 320,
    // Standing every way is her walk's passing step (the package's own idle).
    frames: {
      front: { idle: kaos(kaosFrontIdle), walk: [kaos(kaosFrontWalk1), kaos(kaosFrontWalk2), kaos(kaosFrontWalk3), kaos(kaosFrontWalk4)] },
      back: { idle: kaos(kaosBackIdle), walk: [kaos(kaosBackWalk1), kaos(kaosBackWalk2), kaos(kaosBackWalk3), kaos(kaosBackWalk4)] },
      left: { idle: kaos(kaosLeftIdle), walk: [kaos(kaosLeftWalk1), kaos(kaosLeftWalk2), kaos(kaosLeftWalk3), kaos(kaosLeftWalk4)] },
      right: { idle: kaos(kaosRightIdle), walk: [kaos(kaosRightWalk1), kaos(kaosRightWalk2), kaos(kaosRightWalk3), kaos(kaosRightWalk4)] },
    },
  },
};
