/**
 * WHAT A RECORD OF THE WORLD SAYS TO THE PLAYER (2026-10-30 タスクB: 内部フラグ名をプレイヤー向け画面に出さない).
 *
 * A fact in WORLD MEMORY carries the game's own words for itself — its type (PLAYER_SPARED_GALD), its place
 * (GREENWOOD_FOREST), who was in it (PLAYER, GALD), how much it weighs (MAJOR). None of those is for the player.
 * What a card shows of them is only what is written here, as an event would be told; anything not written here is
 * not shown at all — never the id in its place. Its sentence (memoryEventLabel) is what it was.
 */

import { GALD } from '@mugen/content/characters/gald';

/** Where it happened, as somebody there would say it (a found place by the name it has once found: content/world/futureSites). */
export const PLACE_WORDS: Readonly<Record<string, string>> = {
  ALDEN_VILLAGE: 'アルデン村',
  ALDEN_BAKERY: 'アルデン村のパン屋',
  ALDEN_WORKYARD: '村外れの作業場',
  MOONLIGHT_TAVERN: '月灯りの酒場',
  OUTSIDE_ALDEN: 'アルデン村の外',
  GREENWOOD_FOREST: 'グリーンウッドの森',
  GREENWOOD_GRAVE: '森の小さな墓',
  GREENWOOD_WAYSTATION: '街道の救護所',
};

/**
 * Who was there. The player is `PLAYER`, said with the name they gave; anyone the player knows by another name
 * yet (Gald is 「盗賊」 until they find him again) is said as the screen is told — `names` wins over this table.
 */
export const PERSON_WORDS: Readonly<Record<string, string>> = {
  // Until the screen says otherwise, the man they fought.
  GALD: GALD.unknownName,
  LINA: 'リナ',
  RIZEL: 'リゼル',
  ELNA: 'エルナ',
  BAKERY_OWNER: 'パン屋の主人',
  ALDEN_GUARD: 'アルデンの衛兵',
  MERCHANT_CARAVAN: '行商の一行',
};

/** How much it weighs, said only of the heavy ones — an ordinary day's fact says nothing of it. */
export const WEIGHT_WORDS: Readonly<Record<string, string>> = {
  CRITICAL: '忘れられない出来事',
  MAJOR: '大きな出来事',
};

/** One part of a card's under-line: which it is, and what it says. */
export interface MemoryMetaPart {
  kind: 'where' | 'who' | 'weight';
  text: string;
}

/** The parts of a card's under-line, in order — each only if it is written above. */
export function memoryMeta(
  event: { location: string; actors: readonly string[]; importance: string },
  names: Readonly<Record<string, string>>,
): MemoryMetaPart[] {
  const where = PLACE_WORDS[event.location];
  const people = event.actors.map((a) => names[a] ?? PERSON_WORDS[a]).filter((w): w is string => !!w);
  const weight = WEIGHT_WORDS[event.importance];
  const parts: MemoryMetaPart[] = [];
  if (where) parts.push({ kind: 'where', text: where });
  if (people.length > 0) parts.push({ kind: 'who', text: people.join('・') });
  if (weight) parts.push({ kind: 'weight', text: weight });
  return parts;
}
