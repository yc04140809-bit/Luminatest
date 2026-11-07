import type { FinaleBackdrop } from '@mugen/content/story/chapter1Finale';

/**
 * 第1章終盤の背景・一枚絵 (2026-10-12) — fetched when a scene draws one, each
 * file by name (the rule of areas.ts and eventCg.ts: never the manifest).
 * Every file is used exactly as delivered.
 *
 *   HOME / VILLAGE    the village (the night before; the morning and the raid —
 *                     the screen darkens or reddens it)
 *   VILLAGE_BROKEN    the village half broken (after the second form)
 *   RUINS_DEPTHS      the ruins' depths, nobody in them
 *   ROAD / GRASSLAND  the grassland (the battle's ground)
 *   RUINS_UNSEALING   the hooded figure at the device (blue)
 *   RUINS_REFUSED     the second stage refused (red)
 *   VALSHEEL_AWAKENING  the creature waking, the figure before it
 *   DARK              no picture: the screen black
 */
const LOADERS: Record<FinaleBackdrop, () => Promise<string | null>> = {
  DARK: async () => null,
  HOME: async () => (await import('@mugen/assets/files/backgrounds/location-alden-village.webp')).default,
  VILLAGE: async () => (await import('@mugen/assets/files/backgrounds/location-alden-village.webp')).default,
  VILLAGE_BROKEN: async () => (await import('@mugen/assets/files/backgrounds/location-alden-village-broken.png')).default,
  RUINS_DEPTHS: async () => (await import('@mugen/assets/files/backgrounds/location-ruins-depths.png')).default,
  ROAD: async () => (await import('@mugen/assets/files/backgrounds/battle/grassland.png')).default,
  GRASSLAND: async () => (await import('@mugen/assets/files/backgrounds/battle/grassland.png')).default,
  RUINS_UNSEALING: async () => (await import('@mugen/assets/files/events/event-ruins-unsealing.png')).default,
  RUINS_REFUSED: async () => (await import('@mugen/assets/files/events/event-ruins-unsealing-refused.png')).default,
  VALSHEEL_AWAKENING: async () => (await import('@mugen/assets/files/events/event-valsheel-awakening.png')).default,
};

const held = new Map<FinaleBackdrop, Promise<string | null>>();

/** The picture for a backdrop, or null — cached, and never a reason to lose a scene. */
export function finaleBackdropSrc(key: FinaleBackdrop): Promise<string | null> {
  const already = held.get(key);
  if (already) return already;
  const loading = LOADERS[key]().catch((e) => {
    console.warn(`Could not load the finale backdrop ${key}`, e);
    return null;
  });
  held.set(key, loading);
  return loading;
}
