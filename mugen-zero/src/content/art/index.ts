// The bound front door: the resolver, pointed at the game's own art.
//
// Screens import these two and nothing else from the art layer. The
// registries stay injectable underneath (core/art takes one as an
// argument) so a preview or a test can ask about a different set of
// pictures without the game's own being involved.

import { enemyArt, partyArt } from '../../core/art/artRegistry';
import type { EnemyArtState, PartyArtState, ResolvedArt } from '../../core/art/artStates';
import { ENEMY_ART } from './enemyArt';
import { PARTY_ART } from './partyArt';

export function enemyArtFor(id: string, state: EnemyArtState): ResolvedArt<EnemyArtState> {
  return enemyArt(ENEMY_ART, id, state);
}

export function partyArtFor(id: string, state: PartyArtState): ResolvedArt<PartyArtState> {
  return partyArt(PARTY_ART, id, state);
}

export { ENEMY_ART, ENEMY_ART_STATES, MOSS_RABBIT_ART } from './enemyArt';
export { PARTY_ART, PARTY_ART_STATES, HERO_ART, KAOS_ART } from './partyArt';
