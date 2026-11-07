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

/**
 * THE SAME ANSWER, AND THE SAME OBJECT.
 *
 * `ENEMY_ART` is a module constant, so this is a pure function of its
 * two arguments and the result can be kept. Keeping it is not a speed
 * optimisation — the lookup is three property reads — it is about
 * IDENTITY.
 *
 * An arcana definition used to carry its picture as a constant, and
 * `battleArcanaOf` handed that same object down on every render.
 * Naming the art instead (see ArcanaVisualRef) meant resolving it, and
 * a resolver that mints a fresh object each time turns a stable prop
 * into a changing one: `battleArcanaOf` runs in App's render body, so
 * the battlefield began receiving a new `visual` on every frame of a
 * fight. That is real churn in a tree that is animating to a
 * stopwatch, and it showed up as an animation-timing test tipping
 * over. Caching restores exactly the identity the constant had.
 */
const RESOLVED_ENEMY_ART = new Map<string, ResolvedArt<EnemyArtState>>();

export function enemyArtFor(id: string, state: EnemyArtState): ResolvedArt<EnemyArtState> {
  const key = `${id}\u0000${state}`;
  const kept = RESOLVED_ENEMY_ART.get(key);
  if (kept) return kept;
  const resolved = enemyArt(ENEMY_ART, id, state);
  RESOLVED_ENEMY_ART.set(key, resolved);
  return resolved;
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
const RESOLVED_ARCANA_VISUAL = new Map<string, ArcanaVisual | null>();

export function arcanaVisual(ref: ArcanaVisualRef | null): ArcanaVisual | null {
  if (!ref) return null;
  // Kept for the same reason as `enemyArtFor` above: a page's picture
  // must not become a different object every time it is drawn.
  const key = `${ref.artId}\u0000${ref.state}`;
  if (RESOLVED_ARCANA_VISUAL.has(key)) return RESOLVED_ARCANA_VISUAL.get(key)!;
  const { asset } = enemyArtFor(ref.artId, ref.state);
  const visual = asset?.src && asset.box ? { src: asset.src, box: asset.box } : null;
  RESOLVED_ARCANA_VISUAL.set(key, visual);
  return visual;
}

export { ENEMY_ART, ENEMY_ART_STATES, MOSS_RABBIT_ART } from './enemyArt';
export { PARTY_ART, PARTY_ART_STATES, HERO_ART, KAOS_ART, GALD_ART } from './partyArt';
