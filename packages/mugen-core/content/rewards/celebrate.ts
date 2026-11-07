// ハイタッチ — THE TWO OF THEM, GLAD (作者指示 2026-10-11).
//
// A first find, a rare one, the first of one of Grave's handworks, a thing
// never seen before: for a moment the hero and Kaos high-five over the
// screen, with a few words of what it was. Not on every pickup — a herb the
// tenth time is not a moment — only when it is a small joy:
//
//   1. DISCOVERY   the first sight of something (a golden find, a new kind
//                  of creature)                         「新しい発見！」
//   2. CRAFT       the first time one of Grave's handworks is made
//                                                       「クラフト成功！」
//   3. RARE        a thing marked a treat every time (isRareRewardEffect),
//                  or a RARE thing got for the first time
//                                                       「おっ、いいもの発見！」
//   4. FIRST_ITEM  anything got for the first time      「初めて手に入れた！」
//
// When several are true at one moment, the lowest number is shown (the
// app's queue keeps one per moment). What is "first" is remembered in the
// read marks (`celebrated:<what>`), so nothing new is saved and
// SAVE_VERSION stays 3. Nothing here moves a point or writes a memory.
//
// The picture is named, not fixed (CelebrateArt): one high-five today; a
// craft's own, a cooking one, a memory's, a first meeting's, a season's —
// each a new name here and one line in the app's picture table.

import type { ItemDef } from '../../core/economy/items';
import { rarityOf } from '../../core/economy/items';

export type CelebrateKind = 'DISCOVERY' | 'CRAFT' | 'RARE' | 'FIRST_ITEM';

/** Which picture: one delivered today; room for more (表情差分, クラフト専用, 料理, 大当たり…). */
export type CelebrateArt = 'HITOUCH';

/** Lower is shown first when several fall at one moment. */
export const CELEBRATE_PRIORITY: Readonly<Record<CelebrateKind, number>> = {
  DISCOVERY: 1,
  CRAFT: 2,
  RARE: 3,
  FIRST_ITEM: 4,
};

/** The words: a heading, and the small line under it (the name filled in). */
export const CELEBRATE_WORDS: Readonly<Record<CelebrateKind, { title: string; subtitle: (name: string) => string }>> = {
  DISCOVERY: { title: '新しい発見！', subtitle: (name) => `${name}を見つけた` },
  CRAFT: { title: 'クラフト成功！', subtitle: (name) => `${name}を作成した` },
  RARE: { title: 'おっ、いいもの発見！', subtitle: (name) => `${name}を入手` },
  FIRST_ITEM: { title: '初めて手に入れた！', subtitle: (name) => `${name}を入手` },
};

/** The picture each kind uses (all the high-five, for now). */
export const CELEBRATE_ART: Readonly<Record<CelebrateKind, CelebrateArt>> = {
  DISCOVERY: 'HITOUCH',
  CRAFT: 'HITOUCH',
  RARE: 'HITOUCH',
  FIRST_ITEM: 'HITOUCH',
};

export interface Celebration {
  kind: CelebrateKind;
  /** What it is about (an item id, a craft id, a find id): the same key close together is shown once. */
  key: string;
  title: string;
  subtitle: string;
  art: CelebrateArt;
  priority: number;
}

function celebration(kind: CelebrateKind, key: string, name: string): Celebration {
  return {
    kind,
    key: `${kind}:${key}`,
    title: CELEBRATE_WORDS[kind].title,
    subtitle: CELEBRATE_WORDS[kind].subtitle(name),
    art: CELEBRATE_ART[kind],
    priority: CELEBRATE_PRIORITY[kind],
  };
}

/** The read mark that says this has been celebrated (or had) once. */
export const gotMark = (itemId: string) => `celebrated:ITEM_${itemId}`;
export const craftMark = (craftId: string) => `celebrated:CRAFT_${craftId}`;
export const discoveryMark = (key: string) => `celebrated:FOUND_${key}`;

/**
 * A thing got: whether it is a moment. `first` — never had before. A treat
 * (isRareRewardEffect) is one every time; a RARE thing the first time is a
 * rare one; anything else the first time is a first; else nothing.
 */
export function celebrationForItem(def: ItemDef, first: boolean): Celebration | null {
  if (def.isRareRewardEffect || (first && rarityOf(def) === 'RARE')) return celebration('RARE', def.itemId, def.name);
  if (first) return celebration('FIRST_ITEM', def.itemId, def.name);
  return null;
}

/** One of Grave's handworks made: a moment the first time only. */
export function celebrationForCraft(craftId: string, name: string, first: boolean): Celebration | null {
  return first ? celebration('CRAFT', craftId, name) : null;
}

/** Something seen for the first time (a golden find, a new creature): a moment the first time only. */
export function celebrationForDiscovery(key: string, name: string, first: boolean): Celebration | null {
  return first ? celebration('DISCOVERY', key, name) : null;
}

/** Of several at one moment, the one shown: the lowest priority number (the first given on a tie). */
export function mostWorthShowing(all: readonly Celebration[]): Celebration | null {
  return all.reduce<Celebration | null>((best, c) => (!best || c.priority < best.priority ? c : best), null);
}
