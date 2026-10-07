// THE TOOL SHOP'S PICTURES, FETCHED WHEN THE PLAYER WALKS IN.
//
// The tavern's arrangement (`tavern.ts`): each file by name, its own chunk,
// nothing fetched until the shop is on screen — and each is the file
// exactly as delivered (not resized, recropped, padded or re-encoded).
//
// THREE LAYERS, NEVER ONE PICTURE: the empty shop, ミレイ standing in it,
// and the counter in front of her. She is not painted behind the counter,
// so either can be replaced without the other.
//
// Her faces are one picture each (shop_mirei_<face>.png). Only the
// ordinary face has been delivered; a face without a picture shows the
// ordinary one. Adding a face is one line here once its file is in place.

import type { NpcExpression } from '@mugen/core/npc/touchReaction';

export type MireiArt = Partial<Record<NpcExpression, string>>;

export interface ShopArt {
  /** The empty shop. */
  room: string | null;
  /** The counter, on a transparent ground, drawn in front of her. */
  counter: string | null;
  /** ミレイ, on a transparent ground, by face. */
  mirei: MireiArt;
}

let held: Promise<ShopArt> | null = null;

async function load(file: () => Promise<{ default: string }>, what: string): Promise<string | null> {
  try {
    return (await file()).default;
  } catch (e) {
    // A picture that will not load is not a reason to lose the shop.
    console.warn(`Could not load the shop's ${what}`, e);
    return null;
  }
}

/** All the shop's pictures. Cached, so walking in twice fetches once. */
export function shopArt(): Promise<ShopArt> {
  held ??= Promise.all([
    load(() => import('@mugen/assets/files/backgrounds/location-alden-shop-interior.png'), 'room'),
    load(() => import('@mugen/assets/files/backgrounds/location-alden-shop-counter.png'), 'counter'),
    load(() => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_normal.png'), 'ミレイ (NORMAL)'),
  ]).then(([room, counter, normal]) => ({ room, counter, mirei: normal ? { NORMAL: normal } : {} }));
  return held;
}

/** The picture for a face: its own, or the ordinary one while it has none. */
export function mireiFace(art: MireiArt, face: NpcExpression): { src: string | null; drawn: NpcExpression } {
  if (art[face]) return { src: art[face]!, drawn: face };
  return { src: art.NORMAL ?? null, drawn: 'NORMAL' };
}

/**
 * WHERE THE COUNTER AND SHE STAND, measured off the delivered files:
 * the counter's top surface is 275/941 down its picture, and the bottom
 * of her resting hand 1215/1448 down hers — so her hand is set on the
 * counter, and everything of her below it is behind it.
 */
export const COUNTER_SURFACE = 275 / 941;
export const COUNTER_ASPECT = 1672 / 941;
export const MIREI_HAND = 1215 / 1448;
export const MIREI_ASPECT = 1086 / 1448;
/** The counter is this much wider than she is. */
export const COUNTER_OVER_MIREI = 1.35;
/** Her left edge, as a share of the counter's width from its left. */
export const MIREI_LEFT = 0.12;

/**
 * The stage in pixels, for a screen of this size: the counter on the
 * bottom edge at the left, her behind it with her hand on it, and her head
 * a little below the top — never wider than `maxShare` of the screen.
 */
export function shopStage(w: number, h: number, maxShare = 0.46) {
  // Her height, from the screen's height: counter-top + her above the hand fits the screen.
  const counterOverHeight = COUNTER_OVER_MIREI * MIREI_ASPECT / COUNTER_ASPECT; // counter height per her height
  const fromHeight = (h * 0.98) / ((1 - COUNTER_SURFACE) * counterOverHeight + MIREI_HAND);
  const fromWidth = (w * maxShare) / (COUNTER_OVER_MIREI * MIREI_ASPECT);
  const mireiH = Math.min(fromHeight, fromWidth);
  const mireiW = mireiH * MIREI_ASPECT;
  const counterW = mireiW * COUNTER_OVER_MIREI;
  const counterH = counterW / COUNTER_ASPECT;
  const surface = counterH * (1 - COUNTER_SURFACE);
  return {
    width: counterW,
    counter: { left: 0, bottom: 0, width: counterW, height: counterH },
    mirei: { left: counterW * MIREI_LEFT, bottom: surface - mireiH * (1 - MIREI_HAND), width: mireiW, height: mireiH },
  };
}
