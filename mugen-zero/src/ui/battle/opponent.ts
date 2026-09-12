// WHO THE BATTLE SCREEN IS FIGHTING.
//
// The screen used to take an `EnemySpeciesDef` — a CREATURE — and that
// made it a creature screen. It is the game's battle screen, and the
// fight the whole vertical slice is built to arrive at is against a
// man: Gald, who is a person in the world with a name, a life and four
// answers waiting on the other side of him, and who is not a species
// and must never be made into one to get onto a battlefield.
//
// So the screen asks for this instead. It is the four things a fight
// actually needs to know about the other side, and nothing else:
//
//   - what to call them,
//   - which drawings are theirs,
//   - what is said when they go down,
//   - and the numbers.
//
// A creature is turned into one of these; so is a man; so is whatever
// the next one is. Nothing about the screen changes to add either.

import type { EnemySpec } from '../../game/battle/battleLogic';
import { specOf } from '../../game/battle/enemySpec';
import type { EnemySpeciesDef } from '../../content/enemies/species';
import type { EnemyArtState, PartyArtState, ResolvedArt } from '../../core/art/artStates';
import { enemyArtFor, partyArtFor } from '../../content/art';

/**
 * How far up the field they are, which is how far away they are.
 *
 * FAR is a small animal across a clearing; NEAR is a person at arm's
 * length. It decides which pair of enemy slots the formation uses, and
 * it exists because a ground line measured for something sixty pixels
 * tall puts a person's head through the panel above them.
 */
export type StandsAt = 'FAR' | 'NEAR';

export interface BattleOpponent {
  /**
   * The id the art layer and the size registry know them by.
   *
   * Also the id the turn order uses, so two of the same species in one
   * fight are two entries with one id — which is correct: they are the
   * same KIND of thing, drawn the same way.
   */
  artId: string;
  /** What the plate calls them. */
  name: string;
  /** What is said over them once they are down. */
  defeatedText: string;
  /** The fight's own numbers, exactly as the battle already uses them. */
  spec: EnemySpec;
  /** Where on the field they stand. */
  stands: StandsAt;
  /**
   * Their picture for a pose, or the nearest thing that has been drawn.
   *
   * A function rather than a registry name because the two registries
   * are genuinely different: a creature's states are EnemyArtState and a
   * person's are PartyArtState, and a fight should not have to know
   * which of the two it is looking at.
   */
  artFor: (state: EnemyArtState) => ResolvedArt<string>;
}

/** A creature, as an opponent. */
export function creatureOpponent(species: EnemySpeciesDef): BattleOpponent {
  return {
    artId: species.speciesId,
    name: species.name,
    defeatedText: species.defeatedText,
    spec: specOf(species),
    stands: 'FAR',
    artFor: (state) => enemyArtFor(species.speciesId, state),
  };
}

/**
 * How a creature's pose translates to a person's.
 *
 * The battle asks for the pose the MOMENT deserves — standing, hit,
 * down — and those moments are the same whoever is in them. What
 * differs is only which registry has the drawing, and these are the
 * same three words in the other registry's vocabulary. Anything with no
 * counterpart falls back to standing, which is what the art layer would
 * have done anyway.
 */
const AS_PERSON: Partial<Record<EnemyArtState, PartyArtState>> = {
  front: 'battle_idle',
  attack: 'battle_attack',
  damage: 'battle_damage',
  down: 'battle_down',
  portrait: 'portrait',
};

/**
 * A person, as an opponent.
 *
 * Their drawings come from the party registry because that is where a
 * person's drawings live — Gald is in it as somebody the player meets,
 * long before and long after he is somebody they fight.
 */
export function personOpponent(args: {
  artId: string;
  name: string;
  defeatedText: string;
  spec: EnemySpec;
}): BattleOpponent {
  return {
    artId: args.artId,
    name: args.name,
    defeatedText: args.defeatedText,
    spec: args.spec,
    // A person is fought at arm's length, and is drawn as tall as one.
    stands: 'NEAR',
    artFor: (state) => partyArtFor(args.artId, AS_PERSON[state] ?? 'battle_idle'),
  };
}
