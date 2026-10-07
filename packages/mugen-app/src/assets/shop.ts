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
 * THE COUNTER, TALLER — DOWNWARDS (author's instructions, 2026-10-07:
 * 「腰上ぐらいの高さまで」, then 「ミレイが立って接客してる様に見える様に
 * カウンターの高さを縦方向に伸ばして。下方向に伸ばしてくれたらいいだけ」).
 *
 * The file is not changed, and the counter itself is drawn at its own
 * shape: its top meets her at the waist, everything on it, the banner and
 * the panels as painted. Below its plinth it is carried on DOWNWARDS to
 * the floor a standing woman would stand on — by drawing the plain parts
 * of its base taller: the two corner posts (rows 830–862) and the plinth's
 * face below the tassel (rows 874–882). The floor is below the screen, so
 * the counter runs off the bottom edge, as anything near the camera does.
 */
export const COUNTER = {
  width: 1672,
  height: 941,
  /** Its top surface, rows from the file's top. */
  surface: 275,
  /** Drawn as painted down to here … */
  bodyTo: 874,
  /** … then carried down: the posts from these rows, the plinth's face from these … */
  posts: [830, 862] as const,
  plinth: [874, 882] as const,
  /** Where the posts are, across (left post ends, right post starts). */
  postLeftTo: 172,
  postRightFrom: 1500,
  /** … and the foot as painted, from here to the bottom of the file. */
  footFrom: 882,
} as const;
export const MIREI_ASPECT = 1086 / 1448;
/** Where the counter's top meets her: about the top of her hips (腰上), as a share of her height from the top. */
export const MIREI_WAIST = 0.58;
/**
 * Where the floor is below her waist, in her picture's heights (the picture
 * ends at mid-thigh; standing, her feet are well below it).
 */
export const FLOOR_BELOW_WAIST = 1.1;
/** The counter is this much wider than she is. */
export const COUNTER_OVER_MIREI = 1.35;
/** Her left edge, as a share of the counter's width from its left. */
export const MIREI_LEFT = 0.13;

/**
 * The stage in pixels, for a screen of this size: her head a little below
 * the top, the counter's top at her waist, the counter carried down to the
 * floor (below the screen) — never wider than `maxShare` of the screen.
 */
export function shopStage(w: number, h: number, maxShare = 0.5) {
  const widthPerHeight = COUNTER_OVER_MIREI * MIREI_ASPECT; // counter width per her height
  const mireiH = Math.min(h, (w * maxShare) / widthPerHeight);
  const mireiW = mireiH * MIREI_ASPECT;
  const counterW = mireiH * widthPerHeight;
  const scale = counterW / COUNTER.width;
  // Her head 2% below the top; her waist, and the counter's top with it.
  const waist = h * 0.98 - mireiH * MIREI_WAIST;
  const floor = waist - FLOOR_BELOW_WAIST * mireiH;
  const top = waist + COUNTER.surface * scale;
  const painted = (COUNTER.bodyTo + (COUNTER.height - COUNTER.footFrom)) * scale;
  return {
    width: counterW,
    /** Pixels per pixel of the counter's file. */
    scale,
    counter: { left: 0, bottom: floor, width: counterW, height: top - floor },
    /** How much taller than painted it is drawn (the carried-down part). */
    extension: Math.max(0, top - floor - painted),
    mirei: { left: counterW * MIREI_LEFT, bottom: waist - (1 - MIREI_WAIST) * mireiH, width: mireiW, height: mireiH },
  };
}
