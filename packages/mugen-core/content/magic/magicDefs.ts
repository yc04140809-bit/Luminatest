// The spells themselves.
//
// Five. On purpose: a starting spell that is strictly better than
// swinging a sword turns two characters into one character, and a list
// of ten nobody has enemies for is ten things to balance and nothing to
// choose between. These are not the same kind of answer — what she
// does to the thing in front of you, what she does for you once it has
// landed, what she puts between you before it does, and what she does
// to the shape of the whole fight — so the tray asks a real question
// every time it is opened. Two of them do hurt the creature, and they
// are not interchangeable either: one goes through a raised guard and
// the other is what a raised guard is for.

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

/**
 * 彗星撃 — provisional name.
 *
 * The big one, and deliberately not a bigger 星光弾: it is the other
 * side of the same coin.
 *
 * THE BOLT goes past a raised knife and costs almost nothing, which
 * makes it the answer to a creature that has covered up — small, and
 * it does not care what is in the way.
 *
 * THIS does care. It is weight rather than precision, so a guard
 * blunts it exactly as a guard blunts a sword — and against a creature
 * standing open it is two swings in one turn. The choice between them
 * is therefore not "which is stronger" but "is anything in the way",
 * which is a question the fight already asks every few turns.
 *
 * WHY IT DOES NOT REPLACE ANYTHING. Twenty for sixteen is worse power
 * for power than nine for six, so a fight fought entirely on comets
 * runs her dry in three turns; the bolt is what she can afford to keep
 * doing. And a swing is eight to twelve for nothing at all, which is
 * still the only thing that can be done every turn of a long fight and
 * still the only thing that takes a creature's footing.
 */
export const COMET_STRIKE: MagicDef = {
  id: 'comet_strike',
  name: '彗星撃',
  line: 'ケイオスの頭上で光が凝り、尾を引いて落ちた。',
  mpCost: 16,
  // Two of the player's swings, in the turn one of them would take.
  power: 20,
  type: 'MAGIC',
  element: 'STAR',
  target: 'ONE_ENEMY',
  effect: 'DAMAGE',
  animation: 'STAR_COMET',
  unlock: 'AWAKENING',
  // The difference that makes it a choice rather than an upgrade: this
  // one is weight, and a raised guard is for weight.
  blockedByGuard: true,
  // Light still knocks nobody over, however much of it there is.
  // Breaking a guard stays the sword's job.
  poiseCost: 0,
};

/**
 * 星霞 — provisional name.
 *
 * THE ONE THAT DOES NOTHING THIS TURN.
 *
 * Everything else she has pays out the moment it is cast: the bolt
 * takes health off, the shield stands in front of the next blow, the
 * light closes the gap. This one changes a number and hands the
 * creature its turn, and a player who casts it on the last exchange of
 * a fight has thrown away eight power and a turn.
 *
 * Which is the whole reason it exists. It is the first thing she can do
 * that is a JUDGEMENT about how long the fight has left rather than an
 * answer to what just happened — and it is the shape every support
 * spell after it will have, so the shape is worth getting right once
 * with something small.
 *
 * Deliberately modest: a fifth off what reaches the party, for four
 * turns. Against the small creatures of the greenwood that is a point
 * or two a blow, which is honest — it is not meant to end fights, it is
 * meant to be worth casting in one that is going to be long.
 */
export const STAR_HAZE: MagicDef = {
  id: 'star_haze',
  name: '星霞',
  line: 'ケイオスが息を吐くと、うすい星明かりが相手の目の前に流れた。',
  mpCost: 8,
  // A boost's numbers are in `boost`, the way a shield's are in `ward`.
  power: 0,
  type: 'MAGIC',
  element: 'STAR',
  target: 'ONE_ENEMY',
  effect: 'DEBUFF',
  boost: { stat: 'enemyAttack', factor: 0.8, turns: 4 },
  animation: 'STAR_WARD',
  unlock: 'AWAKENING',
  // Neither of these means anything to a spell that strikes nobody.
  blockedByGuard: false,
  poiseCost: 0,
};

export const MAGIC_DEFS: readonly MagicDef[] = [
  STARLIGHT_BOLT,
  COMET_STRIKE,
  MENDING_LIGHT,
  STAR_SHIELD,
  STAR_HAZE,
];
