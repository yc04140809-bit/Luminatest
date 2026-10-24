// THE FUTURES' PICTURES, FETCHED WHEN ONE IS SHOWN.
//
// The same rule as `areas.ts` and `sceneArt.ts`: each file by name, so
// each is its own chunk and nothing is fetched until a scene draws it.
// Never the manifest.
//
// WHICH PICTURE A KEY IS stays the Artifact's answer: these are the
// files `eventCgSrc` in the manifest resolves to, and `eventCg.test.ts`
// holds every key here to that answer, file for file. Content names a
// key (`futureSites.ts`); this turns the key into something a `src`
// accepts. The files are used exactly as delivered.

import type { EventCgKey } from '@mugen/assets/keys';

const LOADERS: Record<EventCgKey, () => Promise<string>> = {
  GALD_BAKER: async () =>
    (await import('@mugen/assets/files/characters/gald/gald-baker.png')).default,
  GALD_HEALER: async () =>
    (await import('@mugen/assets/files/characters/gald/gald-healer.png')).default,
  GALD_WORKER: async () =>
    (await import('@mugen/assets/files/characters/gald/gald-worker.png')).default,
  GALD_GRAVE: async () =>
    (await import('@mugen/assets/files/events/event-gald-grave.webp')).default,
};

const held = new Map<EventCgKey, Promise<string | null>>();

/** The picture for a key, or null — cached, and never a reason to lose a scene. */
export function eventCg(key: EventCgKey | null): Promise<string | null> {
  if (!key) return Promise.resolve(null);
  const already = held.get(key);
  if (already) return already;
  const loading = LOADERS[key]().catch((e) => {
    console.warn(`Could not load the event CG ${key}`, e);
    return null;
  });
  held.set(key, loading);
  return loading;
}
