// THE PLACES THAT CAN BE WALKED — their ids and the names they show.
//
// One table, so a place's name is changed in one line and nowhere else.
// Every name marked `provisional` is a working title, not canon: none of
// these places has an official name yet, and the screens simply show
// what is written here until one is decided.
//
// Being in this table says only that a place exists to be walked and
// which painting it is walked across (`mugen-app/src/assets/walk.ts`).
// It connects nothing: no map door, no story, no memory. A place is
// walked in the game only once something opens a door to it.

export type WalkPlaceId =
  | 'GREENWOOD_FOREST'
  | 'ANCIENT_RUINS'
  | 'CASTLE_TOWN'
  | 'GRASSLAND'
  | 'SWAMP'
  | 'SEASHORE';

export interface WalkPlace {
  id: WalkPlaceId;
  /** What the screen calls it. */
  title: string;
  /** True while the name is a working title rather than a decided one. */
  provisional: boolean;
}

export const WALK_PLACES: Record<WalkPlaceId, WalkPlace> = {
  GREENWOOD_FOREST: { id: 'GREENWOOD_FOREST', title: 'グリーンウッドの森', provisional: false },
  ANCIENT_RUINS: { id: 'ANCIENT_RUINS', title: '古代遺跡', provisional: true },
  // For later: a painting and a working title, nothing else yet.
  CASTLE_TOWN: { id: 'CASTLE_TOWN', title: '城下町', provisional: true },
  GRASSLAND: { id: 'GRASSLAND', title: '草原', provisional: true },
  SWAMP: { id: 'SWAMP', title: '沼地', provisional: true },
  SEASHORE: { id: 'SEASHORE', title: '海辺', provisional: true },
};

export const WALK_PLACE_IDS = Object.keys(WALK_PLACES) as WalkPlaceId[];
