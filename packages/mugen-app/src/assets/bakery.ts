// THE BAKERY'S THREE PICTURES, FETCHED WHEN THE PLAYER WALKS IN.
//
// The tavern's arrangement (`tavern.ts`): each file by name, so each is
// its own chunk and nothing is fetched until the bakery is on screen.
// The room is painted empty and the two people are cut-outs drawn over
// it. All three are the files exactly as delivered — not resized,
// recropped, padded or re-encoded. The two portraits are the same files
// the Artifact already uses.

export interface BakeryArt {
  /** The empty shop. */
  room: string | null;
  /** パン屋の主人 — Lina's father. */
  owner: string | null;
  /** リナ. */
  lina: string | null;
}

let held: Promise<BakeryArt> | null = null;

async function load(file: () => Promise<{ default: string }>, what: string): Promise<string | null> {
  try {
    return (await file()).default;
  } catch (e) {
    // A picture that will not load is not a reason to lose the shop.
    console.warn(`Could not load the bakery's ${what}`, e);
    return null;
  }
}

/** All three pictures. Cached, so walking in twice fetches once. */
export function bakeryArt(): Promise<BakeryArt> {
  held ??= Promise.all([
    load(() => import('@mugen/assets/files/backgrounds/location-alden-bakery-interior.png'), 'room'),
    load(() => import('@mugen/assets/files/characters/bakery-owner/bakery-owner-fullbody.png'), 'owner'),
    load(() => import('@mugen/assets/files/characters/lina/lina-fullbody.png'), 'Lina'),
  ]).then(([room, owner, lina]) => ({ room, owner, lina }));
  return held;
}
