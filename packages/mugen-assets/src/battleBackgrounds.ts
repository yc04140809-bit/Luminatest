// THE BATTLE BACKGROUNDS, FETCHED ONE AT A TIME.
//
// Six landscape paintings, ~20 MB between them, delivered 2026-09-25 and
// kept exactly as delivered (1672x941 PNG, no re-encoding).
//
// A MODULE OF ITS OWN, NOT THE MANIFEST, for the reason music.ts is one:
// whatever the manifest names ships in every build that imports it, and
// the Artifact's single-file page (16 MiB) has no room for these. So the
// manifest does not name them; only a build that imports THIS file
// carries them — today, the App.
//
// Each is a function rather than a URL so a screen asks for the one it
// needs when it needs it. Which place fights on which painting is
// content's decision: content/locations/battleBackgrounds.ts.

import type { BattleBackgroundKey } from './keys';

export const BATTLE_BACKGROUND_FILES: Record<BattleBackgroundKey, () => Promise<string>> = {
  /** 森全般 — trees, moss, an old stone gate and steps. */
  FOREST: async () => (await import('../files/backgrounds/battle/forest.png')).default,
  /** 遺跡全般 — a paved court among ruined arches, blue banners. */
  RUINS: async () => (await import('../files/backgrounds/battle/ruins.png')).default,
  /** 沼・湿地帯 — flooded paving, reeds, hanging moss. */
  SWAMP: async () => (await import('../files/backgrounds/battle/swamp.png')).default,
  /** 街中・城下町 — a cobbled square, banners, the castle beyond. */
  CITY: async () => (await import('../files/backgrounds/battle/city.png')).default,
  /** 浜辺・海岸 — sand, driftwood, the sea on the right. */
  BEACH: async () => (await import('../files/backgrounds/battle/beach.png')).default,
  /** 草原・高原 — open grass, a worn path, mountains and a castle. */
  GRASSLAND: async () => (await import('../files/backgrounds/battle/grassland.png')).default,
};
