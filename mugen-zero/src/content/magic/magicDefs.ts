// The spells themselves.
//
// One. On purpose: a starting spell that is strictly better than
// swinging a sword turns two characters into one character, and a list
// of six nobody has enemies for is six things to balance and nothing to
// choose between.

import type { MagicDef } from '../../core/magic/magic';

/**
 * 星光弾 — provisional name.
 *
 * A little weaker than a sword against something with no opinion, and
 * the reason to cast it anyway is that a raised guard does not stop it.
 * It also does not knock anybody down, which is what a sword is for. So
 * the choice in front of a bandit who has covered up is a real one:
 * hit him to break the guard, or shoot past it.
 */
export const STARLIGHT_BOLT: MagicDef = {
  id: 'starlight_bolt',
  name: '星光弾',
  line: 'ケイオスの指先に、星が一つ灯った。',
  mpCost: 6,
  // The player's own blows are 8–12. This is below that on purpose.
  power: 9,
  type: 'MAGIC',
  element: 'STAR',
  target: 'ONE_ENEMY',
  animation: 'STAR_BOLT',
  unlock: 'AWAKENING',
  blockedByGuard: false,
  poiseCost: 0,
};

export const MAGIC_DEFS: readonly MagicDef[] = [STARLIGHT_BOLT];
