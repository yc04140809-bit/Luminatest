// FUTURE SITES — the places three years of world time put on the map.
//
// This is the generalisation of the SPARE route's bakery, and it is the
// only mechanism by which the player learns what became of a choice:
//
//   world truth (a life event fired)  -> the place exists, shown as 「？？？」
//   the player walks in               -> a PLAYER_* discovery event is written
//   only then                         -> the place, and his life, get names
//
// A TIME SHIFT therefore never explains anything. It only makes something
// findable. Every field below is display or content; the causality lives
// in requiredMemory / discovery, which the world enforces.

import type { DialogueLine } from '../dialogue/prologue';
import type { LifeEventType, PlayerEventType } from '../../core/memory/types';
import type { LocationId } from '../locations/locationVisuals';
import { galdPortrait, EVENT_CG } from '../../assets/manifest';
import {
  BAKERY_FIRST_VISIT_LINES,
  BAKERY_REVISIT_LINES,
  KAOS_AFTER_REUNION_LINE,
} from '../dialogue/bakery';
import {
  WAYSTATION_FIRST_VISIT_LINES,
  WAYSTATION_REPLY,
  WAYSTATION_AFTER_REPLY_LINES,
  WAYSTATION_REVISIT_LINES,
  KAOS_AFTER_WAYSTATION_LINES,
  WORKYARD_FIRST_VISIT_LINES,
  WORKYARD_REVISIT_LINES,
  KAOS_AFTER_WORKYARD_LINES,
  GRAVE_FIRST_VISIT_LINES,
  GRAVE_REVISIT_LINES,
  KAOS_AFTER_GRAVE_LINES,
} from '../dialogue/futureSites';

/** An optional reply the player may give inside a scene. */
export interface SiteReplyDef {
  prompt: string;
  options: { id: string; label: string; line: DialogueLine }[];
}

export interface FutureSiteDef {
  /** Location id — also the explore card's testid suffix. */
  id: LocationId;
  /** Prefix for this scene's testids ('bakery' keeps the Phase E ids). */
  testIdPrefix: string;
  /** The world fact that has to exist before the place is on the map. */
  requiredMemory: LifeEventType;
  /** Written the first time the player actually goes there. */
  discovery: { eventId: string; type: PlayerEventType };
  /** Before the player has been: never names anything. */
  unknownName: string;
  unknownDescription: string;
  /** After: the place, and what it is. */
  knownName: string;
  knownDescription: string;
  firstVisitLines: DialogueLine[];
  /**
   * A reply the player may give partway through the first visit. It is
   * flavour only — nothing about it reaches WORLD MEMORY, because none of
   * the answers changes what is true.
   */
  reply?: SiteReplyDef;
  afterReplyLines?: DialogueLine[];
  revisitLines: DialogueLine[];
  /** The line left on screen on a revisit, once the talking is over. */
  revisitClosing: string;
  /** Kaos, immediately after the discovery is committed to the DB. */
  kaosLines: string[];
  /**
   * The scene's event CG, or null where no art exists yet. Purely
   * presentational: the scene plays, the discovery commits and the
   * archive updates identically if it fails to load.
   */
  eventCg: string | null;
  eventCgAlt: string;
  /**
   * How the art sits on the stage. 'figure' is the Phase E cut-out look
   * (the baker); 'scene' fills the width for a full illustration.
   */
  eventCgFit: 'figure' | 'scene';
  /**
   * Index of the line the CG appears on (default: from the first).
   * The grave uses it so the name carved in the stone arrives when the
   * writing says it does, not eight lines early.
   */
  eventCgFromLine?: number;
}

export const FUTURE_SITE_DEFS: readonly FutureSiteDef[] = [
  {
    id: 'ALDEN_BAKERY',
    testIdPrefix: 'bakery',
    requiredMemory: 'GALD_BECOMES_BAKER',
    discovery: { eventId: 'evt_player_reunited_with_gald', type: 'PLAYER_REUNITED_WITH_GALD' },
    unknownName: '？？？',
    unknownDescription: '以前は空き店舗だった場所に、新しい店ができている。',
    knownName: 'パン屋',
    knownDescription: '焼きたてのパンの匂いがする、小さな店。',
    firstVisitLines: BAKERY_FIRST_VISIT_LINES,
    revisitLines: BAKERY_REVISIT_LINES,
    revisitClosing: '棚には、焼きたてのパンが並んでいる。',
    kaosLines: [KAOS_AFTER_REUNION_LINE],
    eventCg: galdPortrait('baker'),
    eventCgAlt: 'パンの籠を抱えた店の男',
    eventCgFit: 'figure',
  },
  {
    id: 'GREENWOOD_WAYSTATION',
    testIdPrefix: 'waystation',
    requiredMemory: 'GALD_BECOMES_HEALER',
    discovery: { eventId: 'evt_player_met_gald_on_the_road', type: 'PLAYER_MET_GALD_ON_THE_ROAD' },
    unknownName: '？？？',
    unknownDescription: 'グリーンウッドへ続く街道に、小さな休憩所ができている。',
    knownName: '街道の救護所',
    knownDescription: '薬草と包帯の匂いがする、街道沿いの小屋。',
    firstVisitLines: WAYSTATION_FIRST_VISIT_LINES,
    reply: WAYSTATION_REPLY,
    afterReplyLines: WAYSTATION_AFTER_REPLY_LINES,
    revisitLines: WAYSTATION_REVISIT_LINES,
    revisitClosing: '棚の薬草が、少しだけ減っている。',
    kaosLines: KAOS_AFTER_WAYSTATION_LINES,
    eventCg: galdPortrait('healer'),
    eventCgAlt: '街道の休憩所で、旅人の腕に包帯を巻く男',
    eventCgFit: 'scene',
  },
  {
    id: 'ALDEN_WORKYARD',
    testIdPrefix: 'workyard',
    requiredMemory: 'GALD_WORKS_FOR_ALDEN',
    discovery: { eventId: 'evt_player_met_gald_in_alden', type: 'PLAYER_MET_GALD_IN_ALDEN' },
    unknownName: '？？？',
    unknownDescription: 'アルデン村の外れで、見慣れない男が衛兵と話している。',
    knownName: '村外れの作業場',
    knownDescription: '石材と荷車が積まれた、村の作業場。',
    firstVisitLines: WORKYARD_FIRST_VISIT_LINES,
    revisitLines: WORKYARD_REVISIT_LINES,
    revisitClosing: '石を積む音が、まだ続いている。',
    kaosLines: KAOS_AFTER_WORKYARD_LINES,
    eventCg: galdPortrait('worker'),
    eventCgAlt: '村の復旧作業場で、衛兵と並んで働く男',
    eventCgFit: 'scene',
  },
  {
    id: 'GREENWOOD_GRAVE',
    testIdPrefix: 'grave',
    requiredMemory: 'GALD_GRAVE_TENDED',
    discovery: { eventId: 'evt_player_found_gald_grave', type: 'PLAYER_FOUND_GALD_GRAVE' },
    unknownName: '？？？',
    unknownDescription: 'グリーンウッドの森の入口に、小さな石積みがある。',
    knownName: '森の小さな墓',
    knownDescription: '森の入口に積まれた石。花が置かれている。',
    firstVisitLines: GRAVE_FIRST_VISIT_LINES,
    revisitLines: GRAVE_REVISIT_LINES,
    revisitClosing: '花が、少しだけ増えていた。',
    kaosLines: KAOS_AFTER_GRAVE_LINES,
    // No Gald to draw here. The picture is of what the world kept, and
    // it waits until the player walks up to the stones.
    eventCg: EVENT_CG.GALD_GRAVE,
    eventCgAlt: '森の入口の墓標と、供えられた白い花',
    eventCgFit: 'scene',
    eventCgFromLine: 14,
  },
];

export function futureSiteDef(id: string): FutureSiteDef | undefined {
  return FUTURE_SITE_DEFS.find((s) => s.id === id);
}

/** Every discovery event type, for the "has the player seen the future?" test. */
export const FUTURE_DISCOVERY_TYPES: readonly PlayerEventType[] = FUTURE_SITE_DEFS.map(
  (s) => s.discovery.type,
);
