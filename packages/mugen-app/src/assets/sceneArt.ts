// THE PICTURES A SCENE IS PLAYED IN FRONT OF, FETCHED WHEN IT PLAYS.
//
// The same rule as `areas.ts` and `portraits.ts`: each file by name, so
// each is its own chunk and nothing is fetched until the scene that
// draws it is on screen. Never the manifest — importing it makes the
// bundler ship every picture it names.
//
// WHICH DRAWING A STATE IS stays the core's decision. A scene asks for
// a STATE ('talk', 'portrait', …) and `partyChainFor` + `lookupOrder`
// — the same fallback chains the Artifact resolves through — pick the
// first state this table has a file for. So Gald asked to 'talk' gets
// his 'fullbody', exactly as in the Artifact, because he has no
// talking picture and the core's talk chain says fullbody comes next.
// `sceneArt.test.ts` holds every entry here to the Artifact's own
// answer for the same question, file for file.

import { lookupOrder, partyChainFor, type PartyArtState } from '@mugen/core/art/artStates';

export type SceneCharacter = 'kaos' | 'gald';

type Loader = () => Promise<string>;

const PARTY: Record<SceneCharacter, Partial<Record<PartyArtState, Loader>>> = {
  kaos: {
    /** How she stands when she is talking to you. */
    talk: async () =>
      (await import('@mugen/assets/files/characters/kaos/kaos-talk-default.png')).default,
    /** 臨戦 — the same girl with the air gone tight. */
    talk_serious: async () =>
      (await import('@mugen/assets/files/characters/kaos/kaos-talk-rinsen.png')).default,
  },
  gald: {
    /** Standing in the road, knives out. */
    fullbody: async () =>
      (await import('@mugen/assets/files/characters/gald/gald-ready.png')).default,
    /** On one knee, beaten. */
    portrait: async () =>
      (await import('@mugen/assets/files/characters/gald/gald-defeated.png')).default,
  },
};

/** Which state actually answers for `wanted`, by the core's chain. */
export function sceneArtState(who: SceneCharacter, wanted: PartyArtState): PartyArtState | null {
  for (const state of lookupOrder(wanted, partyChainFor(wanted))) {
    if (PARTY[who][state]) return state;
  }
  return null;
}

const held = new Map<string, Promise<string | null>>();

function once(key: string, load: Loader | undefined): Promise<string | null> {
  if (!load) return Promise.resolve(null);
  const already = held.get(key);
  if (already) return already;
  const loading = load().catch((e) => {
    // A picture that will not load is not a reason to lose a scene.
    console.warn(`Could not load ${key}`, e);
    return null;
  });
  held.set(key, loading);
  return loading;
}

/** Somebody's picture for a state, or null where there is none. */
export function sceneArt(who: SceneCharacter, wanted: PartyArtState): Promise<string | null> {
  const state = sceneArtState(who, wanted);
  return state ? once(`${who}:${state}`, PARTY[who][state]) : Promise.resolve(null);
}

/** The title's key visual — Kaos in silhouette against the moon. */
export function titleKeyVisual(): Promise<string | null> {
  return once('title-key-visual', async () =>
    (await import('@mugen/assets/files/backgrounds/title-kaos-keyvisual.webp')).default,
  );
}
