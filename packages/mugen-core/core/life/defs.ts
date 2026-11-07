// WHAT AN ACTION LEAVES BEHIND, and what makes it take.
//
// Two tables, both small, and neither of them is a rule engine. The
// test of that is simple: adding a new future must not require editing
// either one. It does not — a new future is a bloom, and a bloom asks
// about seeds that already exist.

import type { NpcCore } from './types';

/**
 * A thing that can be done in the world, and the mark it leaves.
 *
 * One entry per KIND of doing, not per doing-to-somebody. 「魔法を見せる」
 * is one entry whether it is shown to a child, a priest or a thief —
 * what differs is who it lands on, and that is the NPC's half.
 */
export interface WorldActionDef {
  id: string;
  /** What it plants in the people it reaches. Null: it leaves no mark. */
  plants: string | null;
  /**
   * How hard it lands, 0..1, before the person it lands on.
   *
   * The whole of the action's contribution. An action cannot be written
   * so as to guarantee an outcome, because this is multiplied by the
   * person's own resonance and that is never 1.
   */
  impact: number;
  /**
   * Who feels it.
   *
   * 'TARGET'    the person it was done to, and nobody else
   * 'WITNESSES' everyone who was there, the target included
   * 'ACTOR'     the person who did it, and nobody else
   *
   * A kindness done to one person in an empty room and the same
   * kindness done in a crowded square are different events in a living
   * world, and this field is the difference.
   *
   * 'ACTOR' is the one that needs saying out loud, because the default
   * everywhere else is that doing a thing does not plant it in
   * yourself — otherwise the player would germinate their own futures
   * every time they cast a spell. But a man walking out of the forest
   * with nobody watching is a thing that happens TO him, done BY him,
   * and it is most of what actually changes anybody. Content has to ask
   * for it, one entry at a time.
   */
  reaches: 'TARGET' | 'WITNESSES' | 'ACTOR';
}

/**
 * A kind of seed, and what in a person makes it grow.
 *
 * This is the half of the world that says why the same afternoon
 * changes one person and not the one standing next to them.
 */
export interface SeedKindDef {
  type: string;
  /**
   * What it catches on. Any one of these matching adds to how strongly
   * it lands; an aptitude adds in proportion to how much of it there is.
   */
  resonates: {
    traits?: readonly string[];
    values?: readonly string[];
    desires?: readonly string[];
    aptitude?: string;
  };
  /**
   * What in a person makes it take LESS.
   *
   * The other half of a personality, and a trait list without it is a
   * list of advantages. A girl who is a little timid is not somebody
   * the idea of leaving home fails to reach — it reaches her and lands
   * softer, which is a different and more interesting thing than not
   * catching at all. It never blocks: something that has caught is not
   * un-caught by temperament, only made smaller.
   */
  dampens?: readonly string[];
  /**
   * How much of it is left after a hundred days of nobody feeding it.
   *
   * 0.5 is a daydream; 0.95 is the kind of thing a person does not get
   * over. Written per kind rather than per person because it is a fact
   * about the wanting, not about the wanter.
   */
  keepsPer100Days: number;
  /**
   * Whether reaching ROOTED is a thing that cannot be undone.
   *
   * The difference between a wanting and a change. A dream can be let
   * go of — Lina may stop practising behind the well, and a world where
   * she cannot has no room for anybody giving up on anything. But a man
   * who spent four months binding other people's wounds has not got a
   * strong opinion, he has become somebody, and six quiet years do not
   * put him back where he started.
   *
   * Off unless content asks for it, because the honest default is that
   * things fade. Where it is on, the seed's strength never falls below
   * the rooting threshold once it has genuinely been there — it can
   * still deepen, and everything above the threshold still wears.
   */
  permanentOnceRooted?: boolean;
  /** What it is called where a developer has to read a trace. */
  label: string;
}

/**
 * WHAT THIS PERSON MAKES OF THAT IMPRESSION, 0..1.
 *
 * The floor is not zero and that is deliberate: anything can leave a
 * mark on anybody, and a world where only the pre-qualified can be
 * changed is a world where nothing the player does to a stranger
 * matters. The ceiling is not 1 either — nobody is entirely made of one
 * wanting, so no single action can fill somebody up.
 */
export const RESONANCE_FLOOR = 0.15;
export const RESONANCE_CEILING = 0.95;
const PER_MATCH = 0.2;
const APTITUDE_WEIGHT = 0.4;

/**
 * What one part of somebody that pulls the other way costs it.
 *
 * A quarter each, multiplied, so two of them is a little over half and
 * no number of them reaches zero. Temperament makes things harder; it
 * does not make them impossible, and a world where it did would have
 * people who cannot be changed at all.
 */
export const DAMPEN_SHARE = 0.25;

/**
 * WHETHER IT CATCHES ON THIS PERSON AT ALL.
 *
 * Asked before how much, and separately, because they are different
 * questions and conflating them is what fills a world with meaningless
 * seeds. Somebody with no part of them that this touches is not
 * somebody it touches a little — they walked past, and a world that
 * records a faint wanting for every bystander is a world whose
 * records say nothing.
 *
 * This is also what keeps the cost of a village honest: a hundred
 * people in a square produce seeds for the handful the thing actually
 * caught on, not a hundred rows that will decay to nothing unread.
 */
export function catchesOn(kind: SeedKindDef, core: NpcCore): boolean {
  const { traits = [], values = [], desires = [], aptitude } = kind.resonates;
  if (traits.some((trait) => core.traits.includes(trait))) return true;
  if (values.some((held) => core.values.includes(held))) return true;
  if (desires.some((want) => core.desires.includes(want))) return true;
  if (aptitude) {
    const has = core.aptitudes[aptitude];
    return Number.isFinite(has) && has > 0;
  }
  return false;
}

export function resonance(kind: SeedKindDef, core: NpcCore): number {
  let value = RESONANCE_FLOOR;
  const { traits = [], values = [], desires = [], aptitude } = kind.resonates;
  for (const trait of traits) if (core.traits.includes(trait)) value += PER_MATCH;
  for (const held of values) if (core.values.includes(held)) value += PER_MATCH;
  for (const want of desires) if (core.desires.includes(want)) value += PER_MATCH;
  if (aptitude) {
    const has = core.aptitudes[aptitude];
    if (Number.isFinite(has) && has > 0) value += Math.min(1, has) * APTITUDE_WEIGHT;
  }
  for (const trait of kind.dampens ?? []) {
    if (core.traits.includes(trait)) value *= 1 - DAMPEN_SHARE;
  }
  return Math.max(RESONANCE_FLOOR * (1 - DAMPEN_SHARE), Math.min(RESONANCE_CEILING, value));
}

/** Looked up by id, with an honest answer when content is wrong. */
export function actionDef(
  defs: readonly WorldActionDef[],
  id: string,
): WorldActionDef | null {
  return defs.find((def) => def.id === id) ?? null;
}

export function seedKind(defs: readonly SeedKindDef[], type: string): SeedKindDef | null {
  return defs.find((def) => def.type === type) ?? null;
}
