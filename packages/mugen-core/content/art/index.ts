// The bound front door: the resolver, pointed at the game's own art.
//
// Screens import these two and nothing else from the art layer. The
// registries stay injectable underneath (core/art takes one as an
// argument) so a preview or a test can ask about a different set of
// pictures without the game's own being involved.

import { enemyArt, partyArt } from '../../core/art/artRegistry';
import type { EnemyArtState, PartyArtState, ResolvedArt } from '../../core/art/artStates';
import type { ArcanaVisual, ArcanaVisualRef } from '../../core/arcana/arcana';
import { ENEMY_ART } from './enemyArt';
import { PARTY_ART } from './partyArt';

export function enemyArtFor(id: string, state: EnemyArtState): ResolvedArt<EnemyArtState> {
  return enemyArt(ENEMY_ART, id, state);
}

export function partyArtFor(id: string, state: PartyArtState): ResolvedArt<PartyArtState> {
  return partyArt(PARTY_ART, id, state);
}

/**
 * The drawing an ARCANA page names, looked up at the moment of drawing.
 *
 * An arcana definition holds a `{ artId, state }` and no picture, so
 * that reading the definitions — which `world.ts` does on every boot —
 * does not load the art. This turns the name back into something a
 * screen can paint, through the same registry and the same fallback
 * chain the battlefield uses, so the book and the battlefield cannot
 * drift apart.
 *
 * Null when the subject has no drawing, or has one with no box
 * measured: a page needs the rectangle to cut the figure out of its
 * file, and guessing one would misplace the drawing rather than omit
 * it. Callers show their empty frame instead, which is what the
 * undrawn pages already do.
 */
export function arcanaVisual(ref: ArcanaVisualRef | null): ArcanaVisual | null {
  if (!ref) return null;
  const { asset } = enemyArt(ENEMY_ART, ref.artId, ref.state);
  if (!asset?.src || !asset.box) return null;
  return { src: asset.src, box: asset.box };
}

export { ENEMY_ART, ENEMY_ART_STATES, MOSS_RABBIT_ART } from './enemyArt';
export { PARTY_ART, PARTY_ART_STATES, HERO_ART, KAOS_ART, GALD_ART } from './partyArt';
