import type { VillageSpotId } from '@mugen/content/locations/aldenVillageMap';

/**
 * アルデン村の縮図 — THE PICTURE UNDER THE VILLAGE MENU, and where each place
 * is on it (作者 改修指示書 2026-10-16; ui/village.tsx draws it).
 *
 * PROVISIONAL (作者判断 2026-10-16): until the village alone arrives (no
 * words, no UI, landscape), the picture is the right-hand part of the
 * adopted base image — placed as delivered, whole, and cut to its village
 * here (`crop`). Words and frames are painted into that image; the real
 * labels are laid over them at the same places (`spots`, `title`,
 * `objective`), so nothing painted is read. When the final picture comes,
 * replace `file` and `crop` (the whole picture) and move the spots to its
 * buildings — nothing else changes.
 *
 * ONE SET OF SPOTS PER PICTURE. The village half-broken after the raid and
 * rebuilt later are further entries here, with their own spots by the same
 * ids (content/locations/aldenVillageMap.ts), so a place keeps its id
 * whatever is drawn.
 */

/** A rectangle as shares (0–100) of the cut picture's width and height. */
export interface DioramaBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface VillageDiorama {
  /** The picture, fetched when needed. */
  load: () => Promise<string>;
  /** The file's own size in pixels. */
  fileW: number;
  fileH: number;
  /** The part of the file that is the village, in its pixels. */
  crop: { x: number; y: number; w: number; h: number };
  /** Each place's label, on the cut picture. */
  spots: Readonly<Record<VillageSpotId, DioramaBox>>;
  /** The village's name, top left; 次の目的, top right. */
  title: DioramaBox;
  objective: DioramaBox;
}

/** The village as it is (before the raid): provisional, cut from the adopted base image (1672×941). */
export const ALDEN_DIORAMA: VillageDiorama = {
  load: async () => (await import('@mugen/assets/files/backgrounds/village-diorama/alden-diorama-provisional.png')).default,
  fileW: 1672,
  fileH: 941,
  crop: { x: 600, y: 0, w: 1072, h: 780 },
  // Over the labels painted into the provisional picture (measured on it).
  spots: {
    church: { x: 21.3, y: 29.2, w: 16.0, h: 5.4 },
    shop: { x: 28.0, y: 40.8, w: 17.0, h: 5.1 },
    bakery: { x: 45.0, y: 45.6, w: 17.4, h: 5.1 },
    tavern: { x: 67.4, y: 40.0, w: 15.9, h: 5.1 },
    plaza: { x: 38.7, y: 59.0, w: 19.1, h: 5.8 },
    house_01: { x: 3.5, y: 49.4, w: 15.9, h: 5.5 },
    house_02: { x: 11.4, y: 65.8, w: 13.8, h: 5.5 },
    house_03: { x: 56.0, y: 70.8, w: 15.1, h: 5.6 },
    road_forest: { x: 82.8, y: 58.7, w: 16.2, h: 5.6 },
    road_ruins: { x: 79.8, y: 20.8, w: 18.4, h: 5.6 },
  },
  title: { x: 0, y: 3.6, w: 24.3, h: 9.0 },
  objective: { x: 74.4, y: 3.6, w: 25.6, h: 10.8 },
};
