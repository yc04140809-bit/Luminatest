// The registries themselves, and the two functions screens call.
//
// Kept apart from artStates.ts so the rules can be tested without any
// image imports, and apart from the content so that adding a creature is
// an entry in a data file rather than a change here.

import {
  ENEMY_FALLBACK,
  PARTY_FALLBACK,
  resolveArt,
  type ArtSet,
  type EnemyArtState,
  type PartyArtState,
  type ResolvedArt,
} from './artStates';

export type EnemyArtSet = ArtSet<EnemyArtState>;
export type PartyArtSet = ArtSet<PartyArtState>;

export type EnemyArtRegistry = Readonly<Record<string, EnemyArtSet>>;
export type PartyArtRegistry = Readonly<Record<string, PartyArtSet>>;

/**
 * Which picture of this creature.
 *
 * The registry is passed in rather than reached for, so a test, a
 * preview or a future second world can ask the same question of a
 * different set of pictures. The content module below binds the real
 * one; nothing else needs to.
 */
export function enemyArt(
  registry: EnemyArtRegistry,
  id: string,
  state: EnemyArtState,
): ResolvedArt<EnemyArtState> {
  return resolveArt(registry[id], state, ENEMY_FALLBACK);
}

export function partyArt(
  registry: PartyArtRegistry,
  id: string,
  state: PartyArtState,
): ResolvedArt<PartyArtState> {
  return resolveArt(registry[id], state, PARTY_FALLBACK);
}
