// The spells themselves.
//
// Three. On purpose: a starting spell that is strictly better than
// swinging a sword turns two characters into one character, and a list
// of six nobody has enemies for is six things to balance and nothing to
// choose between. These are not the same kind of answer — what she
// does to the thing in front of you, what she does for you once it has
// landed, and what she puts between you before it does — so the tray
// asks a real question every time it is opened.

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
  effect: 'DAMAGE',
  animation: 'STAR_BOLT',
  unlock: 'AWAKENING',
  blockedByGuard: false,
  poiseCost: 0,
};

/**
 * 癒しの光 — provisional name.
 *
 * The only way health has ever come back inside a fight, and the first
 * reason 《身構える》 has ever been part of a plan rather than a way of
 * surviving a turn: bracing gathers 8, this costs 12, so mending is
 * something the player spends two quiet turns buying and then chooses
 * the moment for.
 *
 * The numbers are set so it can hold a losing fight open without
 * winning one. Twenty-two is about five of Gald's blows; costing more
 * than bracing gathers means a player who does nothing but mend is
 * spending three turns for every two the creature spends, dealing
 * nothing, and going nowhere — which is exactly what standing there
 * healing ought to feel like.
 *
 * It takes the turn. Kaos does one thing per turn like everybody else;
 * that rule is the whole reason she was allowed into the fight.
 */
export const MENDING_LIGHT: MagicDef = {
  id: 'mending_light',
  name: '癒しの光',
  line: 'ケイオスの手のひらから、やわらかな光がこぼれた。',
  mpCost: 12,
  // Health restored, not damage. Roughly five of Gald's blows.
  power: 22,
  type: 'MAGIC',
  element: 'STAR',
  target: 'ALLY',
  effect: 'MEND',
  animation: 'STAR_MEND',
  unlock: 'AWAKENING',
  // Neither of these means anything to a spell aimed at your own side.
  // Written out rather than left to a default so that nothing reads a
  // zero and concludes something about mending.
  blockedByGuard: false,
  poiseCost: 0,
};

/**
 * 星盾 — provisional name.
 *
 * The third answer, and the one that is neither of the other two: not
 * what she does to him and not what she does after he has landed, but
 * what she puts between you before he does.
 *
 * WHY IT IS WORTH A TURN. Against a man swinging for three it is the
 * smallest of the three spells, and that is correct — there is nothing
 * to protect anybody from yet. It earns its keep when he stops
 * covering up: in his last quarter he swings half again as hard and
 * guards almost never, which is exactly the moment the star bolt's
 * reason to exist (going through a guard) evaporates and mending
 * becomes a race. Four blows softened, bought one turn before they
 * arrive, is a different shape of answer from healing them afterwards.
 *
 * It also stacks with 《身構える》, which halves the blow before this
 * is taken off it — so the two together are the most a player can put
 * in front of one swing, at the cost of two turns and the power.
 *
 * THE CUT IS A REQUEST. The battle holds a ceiling on any one ward,
 * whatever granted it, and this asks for exactly that ceiling: a spell
 * that costs a turn and eight power has earned the most a ward is
 * allowed to be. If the ceiling moves, this moves with it and nothing
 * here needs editing.
 */
export const STAR_SHIELD: MagicDef = {
  id: 'star_shield',
  name: '星盾',
  line: 'ケイオスが手をかざすと、淡い光が薄い膜になって広がった。',
  mpCost: 8,
  // A shield's numbers are two, and they are below.
  power: 0,
  type: 'MAGIC',
  element: 'STAR',
  target: 'ALLY',
  effect: 'WARD',
  ward: { cut: 0.35, blows: 4 },
  animation: 'STAR_WARD',
  unlock: 'AWAKENING',
  // Neither of these means anything to a spell aimed at your own side.
  blockedByGuard: false,
  poiseCost: 0,
};

export const MAGIC_DEFS: readonly MagicDef[] = [STARLIGHT_BOLT, MENDING_LIGHT, STAR_SHIELD];
