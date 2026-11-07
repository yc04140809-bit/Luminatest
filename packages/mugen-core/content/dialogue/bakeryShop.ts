// アルデン村のパン屋 (ALDEN_BAKERY) — the shop as it is TODAY.
//
// The bakery Lina's father runs, where she helps. It is the same
// ALDEN_BAKERY the SPARE route's future is found in: there is one
// bakery in Alden, and this is it.
//
// A MINIMAL INTRODUCTION AND NOTHING MORE. There is no written scenario
// for the shop yet, so these lines only say who is here: the owner,
// and his daughter helping him. They decide nothing — not Lina's
// future, not her father's age, nothing about Gald or the four answers
// — and reading them records nothing in the world.

import type { DialogueLine } from './prologue';
import { BAKERY_OWNER } from '../characters/bakeryOwner';
import { LINA } from '../characters/lina';

export const BAKERY_SHOP_LINES: readonly DialogueLine[] = [
  { speaker: BAKERY_OWNER.name, text: 'いらっしゃい。焼きたてなら、ちょうど今できたところだ。' },
  { speaker: LINA.name, text: 'こんにちは！ 私、リナ。ここはお父さんのお店なの。' },
  { speaker: BAKERY_OWNER.name, text: 'まだまだ手伝いってところだがな。' },
  { speaker: LINA.name, text: 'もう、ちゃんと働いてるもん！' },
];

/** What is said of the shop before anybody speaks. */
export const BAKERY_SHOP_DESCRIPTION = 'リナの父が営むパン屋。焼きたてのパンの匂いがする。';
