// THE TOOL SHOP'S PEOPLE, FETCHED WHEN THE PLAYER WALKS IN.
//
// The tavern's arrangement (`tavern.ts`): each file by name, its own chunk,
// nothing fetched until the shop is on screen — and each is the file
// exactly as delivered (not resized, recropped, padded or re-encoded).
//
// ミレイ, behind the counter, one picture per face
// (shop_mirei_<face>.png). Only the ordinary face has been delivered; a
// face without a picture shows the ordinary one. Adding a face is one line
// here once its file is in place.

import type { NpcExpression } from '@mugen/core/npc/touchReaction';

export type MireiArt = Partial<Record<NpcExpression, string>>;

let held: Promise<MireiArt> | null = null;

async function load(file: () => Promise<{ default: string }>, face: string): Promise<string | null> {
  try {
    return (await file()).default;
  } catch (e) {
    // A picture that will not load is not a reason to lose the shop.
    console.warn(`Could not load ミレイ's ${face} face`, e);
    return null;
  }
}

/** Her faces that have pictures. Cached, so walking in twice fetches once. */
export function mireiArt(): Promise<MireiArt> {
  held ??= Promise.all([
    load(() => import('@mugen/assets/files/characters/shop-mirei/shop_mirei_normal.png'), 'NORMAL'),
  ]).then(([normal]) => (normal ? { NORMAL: normal } : {}));
  return held;
}

/** The picture for a face: its own, or the ordinary one while it has none. */
export function mireiFace(art: MireiArt, face: NpcExpression): { src: string | null; drawn: NpcExpression } {
  if (art[face]) return { src: art[face]!, drawn: face };
  return { src: art.NORMAL ?? null, drawn: 'NORMAL' };
}
