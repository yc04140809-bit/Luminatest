// THE TAVERN'S TWO PICTURES, FETCHED WHEN THE PLAYER WALKS IN.
//
// The same rule as `areas.ts` and `sceneArt.ts`: each file by name, so
// each is its own chunk and nothing is fetched until the tavern is on
// screen. Never the manifest.
//
// TWO FILES, TWO LAYERS. The room is painted empty and the master is a
// cut-out drawn over it, so the room never has to be repainted to move,
// replace or hide him. Both are the files exactly as delivered — not
// resized, recropped, padded or re-encoded.
//
// NOT THE ARTIFACT'S TAVERN. `location-alden-tavern.webp` — the room
// with the master painted into it — stays where it is, used by the
// Artifact, so the two can be compared before anybody decides to unify
// them.

export interface TavernArt {
  /** The empty room. */
  room: string | null;
  /** The master, on a transparent ground. */
  master: string | null;
}

let held: Promise<TavernArt> | null = null;

async function load(file: () => Promise<{ default: string }>, what: string): Promise<string | null> {
  try {
    return (await file()).default;
  } catch (e) {
    // A picture that will not load is not a reason to lose the room.
    console.warn(`Could not load the tavern's ${what}`, e);
    return null;
  }
}

/** Both pictures. Cached, so walking in twice fetches once. */
export function tavernArt(): Promise<TavernArt> {
  held ??= Promise.all([
    load(() => import('@mugen/assets/files/backgrounds/location-alden-tavern-interior.png'), 'room'),
    load(() => import('@mugen/assets/files/characters/tavern-master/tavern-master-standing.png'), 'master'),
  ]).then(([room, master]) => ({ room, master }));
  return held;
}
