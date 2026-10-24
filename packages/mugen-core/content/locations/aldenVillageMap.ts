// アルデン村の縮図 — THE VILLAGE SEEN WHOLE (作者「アルデン村メニュー画面 改修指示書」2026-10-16).
//
// Not a map to walk: the village from above, its places to tap, and who is
// in each of them now. What there is to find here is people — who is
// where, what is different from yesterday — not chests.
//
// THE PLACES are fixed content (`VILLAGE_SPOTS`): where a place is on a
// picture is the picture's business (the App's diorama data, one set of
// coordinates per background — normal, half-broken, rebuilt), so the same
// ids serve every background.
//
// WHO IS WHERE is never stored. `villagePresence` works it out each time
// from what the world already says, so that the day-to-day comings and
// goings (OFF-SCREEN LIFE) can be added as more rules here later without a
// save field or a second copy of anybody's whereabouts. For now (作者判断
// 2026-10-16) only the people whose place is settled are shown: リナ and
// her father at the bakery, ミレイ at the tool shop, the tavern's master
// (グレイヴ once met) and tonight's stranger. Nobody is put somewhere only
// to be shown — リゼル and バルド have no settled place yet, and are not.
//
// 次の目的 (`nextObjective`) is a short pointer to where the story goes on,
// from the route's own progress. It is not a quest log: it writes nothing.

import type { SekiryugaStage } from '../../core/world/storyArc';
import type { IncidentPhase } from '../../core/world/aldenIncident';

export type VillageSpotKind = 'FACILITY' | 'PLAZA' | 'HOUSE' | 'ROAD';

export type VillageSpotId =
  | 'church'
  | 'shop'
  | 'bakery'
  | 'tavern'
  | 'plaza'
  | 'house_01'
  | 'house_02'
  | 'house_03'
  | 'road_forest'
  | 'road_ruins';

export interface VillageSpot {
  id: VillageSpotId;
  /** What the label says. Every house says 民家; their ids stay apart. */
  label: string;
  kind: VillageSpotKind;
}

/** Every place on the village's face. A road out goes on to the region map (アルデン地方). */
export const VILLAGE_SPOTS: readonly VillageSpot[] = [
  { id: 'church', label: '教会', kind: 'FACILITY' },
  { id: 'shop', label: '道具屋', kind: 'FACILITY' },
  { id: 'bakery', label: 'パン屋', kind: 'FACILITY' },
  { id: 'tavern', label: '宿酒場', kind: 'FACILITY' },
  { id: 'plaza', label: '中央広場', kind: 'PLAZA' },
  { id: 'house_01', label: '民家', kind: 'HOUSE' },
  { id: 'house_02', label: '民家', kind: 'HOUSE' },
  { id: 'house_03', label: '民家', kind: 'HOUSE' },
  { id: 'road_forest', label: '森への道', kind: 'ROAD' },
  { id: 'road_ruins', label: '遺跡への道', kind: 'ROAD' },
];

export const villageSpot = (id: VillageSpotId): VillageSpot => VILLAGE_SPOTS.find((s) => s.id === id)!;

/** Somebody somewhere in the village: their registry id (null for a stranger) and what they are called. */
export interface VillagePerson {
  id: string | null;
  name: string;
}

export interface VillagePresenceFacts {
  /** The tavern's master has been met (graveTalks `hasMetGrave`): グレイヴ by name, else マスター. */
  graveMet: boolean;
  /** Tonight's stranger at the tavern, by the label the tavern gives them (tavernGuests `guestLabelOf`). */
  tavernGuest: string | null;
}

/** Who is in each place now — worked out, never kept. A place nobody is known to be in is absent. */
export function villagePresence(facts: VillagePresenceFacts): Partial<Record<VillageSpotId, readonly VillagePerson[]>> {
  return {
    bakery: [
      { id: 'LINA', name: 'リナ' },
      { id: 'BAKERY_OWNER', name: '主人' },
    ],
    shop: [{ id: null, name: 'ミレイ' }],
    tavern: [
      { id: 'GRAVE', name: facts.graveMet ? 'グレイヴ' : 'マスター' },
      ...(facts.tavernGuest ? [{ id: null, name: facts.tavernGuest }] : []),
    ],
  };
}

/** How many names a label shows before the rest are counted (+2). */
export const VILLAGE_NAMES_SHOWN = 2;

export interface ObjectiveFacts {
  galdDecided: boolean;
  arcOpen: boolean;
  stage: SekiryugaStage;
  phase: IncidentPhase;
}

/** Where the story goes on from here, in a few words. */
export function nextObjective(facts: ObjectiveFacts): string {
  if (!facts.galdDecided) return 'グリーンウッドの森を調べよう';
  if (!facts.arcOpen) return 'アルデン村で過ごそう';
  switch (facts.stage) {
    case 'NONE':
      return '村の噂を聞いてみよう';
    case 'RUMOR':
      return '月灯りの酒場でマスターと話そう';
    case 'TOLD':
      return '遺跡への道を調べよう';
    case 'BEATEN':
      return '遺跡の奥へ戻ろう';
    case 'SETTLED':
      return facts.phase >= 2 ? '村の異変に気を配ろう' : 'アルデン村で日々を過ごそう';
  }
}
