// THE TAVERN'S STRANGERS — five silhouettes, fetched when one is talked to.
//
// The same rule as `tavern.ts`: each file by name, so each is its own chunk
// and nothing is fetched until it is wanted. The files exactly as
// delivered (transparent PNG, 1024×1536) — not resized, recropped, padded
// or re-encoded. Which talk uses which is the content's
// (content/talk/tavernGuests.ts); this only knows the pictures.

import type { TavernGuestId } from '@mugen/content/talk/tavernGuests';

const FILES: Record<TavernGuestId, () => Promise<{ default: string }>> = {
  tavern_guest_male: () => import('@mugen/assets/files/characters/tavern-guests/tavern-guest-male.png'),
  tavern_guest_female: () => import('@mugen/assets/files/characters/tavern-guests/tavern-guest-female.png'),
  tavern_guest_bard: () => import('@mugen/assets/files/characters/tavern-guests/tavern-guest-bard.png'),
  tavern_guest_hooded: () => import('@mugen/assets/files/characters/tavern-guests/tavern-guest-hooded.png'),
  tavern_guest_warrior: () => import('@mugen/assets/files/characters/tavern-guests/tavern-guest-warrior.png'),
};

const held = new Map<TavernGuestId, Promise<string | null>>();

/** One stranger's silhouette, or null when it will not load. Cached. */
export function tavernGuestArt(id: TavernGuestId): Promise<string | null> {
  let p = held.get(id);
  if (!p) {
    p = FILES[id]()
      .then((m) => m.default)
      .catch((e) => {
        // A picture that will not load is not a reason to lose the words.
        console.warn(`Could not load the tavern guest ${id}`, e);
        return null;
      });
    held.set(id, p);
  }
  return p;
}
