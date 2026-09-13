// GALD, AS THE BATTLE SCREEN SEES HIM.
//
// The story's one fight, and the reason `BattleOpponent` exists at all:
// he is a person in the world with a name, a life and four answers
// waiting on the other side of him, and he must never be made into a
// species to get onto a battlefield.
//
// One definition, in one place, because there are two doors into this
// fight — the story's own, on the forest path, and the DEV ADMIN
// preview — and a man who is 盗賊 ガルド through one of them and
// something slightly different through the other is not a man being
// tested, he is two men.

import { GALD_BATTLE } from '../../content/enemies/galdBattle';
import { GALD_DEFEATED_LINES } from '../../content/dialogue/galdEncounter';
import { personOpponent, type BattleOpponent } from './opponent';

/**
 * Him, with his numbers and his own words for going down.
 *
 * The line is the one from `galdEncounter` — 「……くそ……。」 — rather
 * than a sentence written here about him. He is beaten, not dead, and
 * what a beaten man says is content's business: this file must not be
 * somewhere a second version of his voice can grow.
 *
 * A function rather than a constant so that nothing can hold on to one
 * copy and mutate it out from under the other door.
 */
export function galdOpponent(): BattleOpponent {
  return personOpponent({
    artId: 'gald',
    name: GALD_BATTLE.name,
    defeatedText: GALD_DEFEATED_LINES[0].text,
    spec: GALD_BATTLE,
  });
}
