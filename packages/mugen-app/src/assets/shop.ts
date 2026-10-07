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

/** Her faces, each its own file (and its own chunk). */
const FACES: readonly [NpcExpression, () => Promise<{ default: string }>][] = [
  ['NORMAL', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_normal.png')],
  ['HAPPY', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_happy.png')],
  ['AMAZED', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_amazed.png')],
  ['SAD', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_sad.png')],
  ['ANGRY', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_angry.png')],
  ['EMBARRASSED', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_embarrassed.png')],
  ['EXASPERATED', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_exasperated.png')],
  ['SMILE_EYES_CLOSED', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_smile_eyes_closed.png')],
  ['JITO', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_jito.png')],
  ['SHY', () => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_shy.png')],
];

/** All the shop's pictures. Cached, so walking in twice fetches once. */
export function shopArt(): Promise<ShopArt> {
  held ??= Promise.all([
    load(() => import('@mugen/assets/files/backgrounds/location-alden-shop-interior.png'), 'room'),
    load(() => import('@mugen/assets/files/backgrounds/location-alden-shop-counter.png'), 'counter'),
    Promise.all(FACES.map(async ([face, file]) => [face, await load(file, `ミレイ (${face})`)] as const)),
  ]).then(([room, counter, faces]) => {
    const mirei: MireiArt = {};
    for (const [face, src] of faces) if (src) mirei[face] = src;
    return { room, counter, mirei };
  });
  return held;
}

/** The picture for a face: its own, or the ordinary one while it has none. */
export function mireiFace(art: MireiArt, face: NpcExpression): { src: string | null; drawn: NpcExpression } {
  if (art[face]) return { src: art[face]!, drawn: face };
  return { src: art.NORMAL ?? null, drawn: 'NORMAL' };
}

/**
 * THE COUNTER, TALLER (author's instruction, 2026-10-07: 「カウンターは高さが
 * 低すぎるから引き伸ばして違和感無いように（腰上ぐらいの高さまで）」).
 *
 * The file is not changed. On screen, one band of it is drawn taller — rows
 * 665–880 of 941: the banner's fringe and tassels, the lower panels and the
 * plinth, which read as a longer cloth and a taller base. The top, everything
 * standing on it, the wolf crest and the panel ornaments keep their shape.
 */
export const COUNTER = { width: 1672, height: 941, surface: 275, bandFrom: 665, bandTo: 880, stretch: 1.9 } as const;
export const MIREI_ASPECT = 1086 / 1448;
/** Where the counter's top meets her: about the top of her hips (腰上), as a share of her height from the top. */
export const MIREI_WAIST = 0.58;
/** The counter is this much wider than she is. */
export const COUNTER_OVER_MIREI = 1.35;
/** Her left edge, as a share of the counter's width from its left. */
export const MIREI_LEFT = 0.13;

/** The counter's drawn height and its top, per pixel of its width. */
const band = COUNTER.bandTo - COUNTER.bandFrom;
const drawnRows = COUNTER.height + band * (COUNTER.stretch - 1);
const surfaceRows = drawnRows - COUNTER.surface;

/**
 * The stage in pixels, for a screen of this size: the counter on the
 * bottom edge at the left, her behind it with its top at her waist, and
 * her head a little below the top — never wider than `maxShare` of it.
 */
export function shopStage(w: number, h: number, maxShare = 0.46) {
  const widthPerHeight = COUNTER_OVER_MIREI * MIREI_ASPECT; // counter width per her height
  const surfacePerHeight = (surfaceRows / COUNTER.width) * widthPerHeight;
  const fromHeight = (h * 0.98) / (surfacePerHeight + MIREI_WAIST);
  const fromWidth = (w * maxShare) / widthPerHeight;
  const mireiH = Math.min(fromHeight, fromWidth);
  const mireiW = mireiH * MIREI_ASPECT;
  const counterW = mireiH * widthPerHeight;
  const scale = counterW / COUNTER.width;
  const surface = surfaceRows * scale;
  return {
    width: counterW,
    /** Pixels per row of the counter's file (top and bottom slices). */
    scale,
    counter: { left: 0, bottom: 0, width: counterW, height: drawnRows * scale },
    mirei: { left: counterW * MIREI_LEFT, bottom: surface - (1 - MIREI_WAIST) * mireiH, width: mireiW, height: mireiH },
  };
}
