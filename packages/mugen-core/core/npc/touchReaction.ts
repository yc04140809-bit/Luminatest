// TOUCHING SOMEBODY BEHIND A COUNTER — what they say, and with what face.
//
// NPCタッチ反応システム (2026-10-07). A person in a shop is tapped and
// answers with one short line and a change of face. Which line is decided
// here, from content (content/npc) and from what the world is like right
// now; nothing here draws, waits or remembers between visits.
//
// THE DRAW, in four kinds (weights per person):
//
//   NORMAL       their everyday lines
//   EMOTION      a line from one of the faces in the current mood pool
//   CONDITIONAL  a line that only holds in some state of the world
//   PREMIUM      a rare line: what they do not usually say
//
// TAPPED AGAIN AND AGAIN in one visit, the mood shifts: from `chain.warm`
// taps on the emotion pool widens, and from `chain.tired` on it is the
// tired faces (呆れ・照れ・怒り) and the rare line a little more often.
//
// Room left, not built: visit counts, time of day, years passed and other
// people's lines are more `TouchCondition` kinds — the draw does not change.

/**
 * The faces a person can make. The first seven are the basic set; the
 * rest are the spec's extra faces (目を閉じて笑う, ジト目) and 照れ笑い.
 */
export type NpcExpression =
  | 'NORMAL'
  | 'HAPPY'
  | 'AMAZED'
  | 'SAD'
  | 'ANGRY'
  | 'EMBARRASSED'
  | 'EXASPERATED'
  | 'SMILE_EYES_CLOSED'
  | 'JITO'
  | 'SHY';

export const BASIC_EXPRESSIONS: readonly NpcExpression[] = [
  'NORMAL',
  'HAPPY',
  'AMAZED',
  'SAD',
  'ANGRY',
  'EMBARRASSED',
  'EXASPERATED',
];

/** What must hold of the world for a line to be said. */
export type TouchCondition =
  /** Gald's four answers have been given (any answer). */
  | { kind: 'GALD_DECIDED' }
  /** The first boss route has reached at least this far (stage index, 0 = NONE). */
  | { kind: 'ARC_AT_LEAST'; stage: number };

/** A line with its face, said only while its condition holds. */
export interface TouchLine {
  text: string;
  expression: NpcExpression;
  when?: TouchCondition;
}

export type TouchKind = 'NORMAL' | 'EMOTION' | 'CONDITIONAL' | 'PREMIUM';

export interface NpcTouchDef {
  npcId: string;
  /** As shown over what they say. */
  name: string;
  /** The face they rest on. */
  baseExpression: NpcExpression;
  /** Lines tied to each face (the everyday ones are NORMAL's). */
  lines: Partial<Record<NpcExpression, readonly string[]>>;
  /** Lines that hold only in some state of the world. */
  conditional: readonly TouchLine[];
  /** The rare ones. */
  premium: readonly TouchLine[];
  /** Relative weights of the four kinds, for the first taps of a visit. */
  weights: Record<TouchKind, number>;
  /** From which tap of a visit the mood shifts. */
  chain: { warm: number; tired: number };
  /** Which faces the EMOTION draw picks from, by mood. */
  moods: { calm: readonly NpcExpression[]; warm: readonly NpcExpression[]; tired: readonly NpcExpression[] };
  /**
   * A line said with a face other than its group's (e.g. 「……また忘れ物？」
   * is 呆れ, said with ジト目). By the line's text.
   */
  lineFaces?: Readonly<Record<string, NpcExpression>>;
}

/** What the draw reads of the world. */
export interface TouchFacts {
  galdDecided: boolean;
  /** The first boss route's stage, as an index (0 = NONE). */
  arcStage: number;
}

export interface TouchReaction {
  kind: TouchKind;
  expression: NpcExpression;
  text: string;
}

export function touchConditionHolds(when: TouchCondition | undefined, facts: TouchFacts): boolean {
  if (!when) return true;
  switch (when.kind) {
    case 'GALD_DECIDED':
      return facts.galdDecided;
    case 'ARC_AT_LEAST':
      return facts.arcStage >= when.stage;
  }
}

/** The mood a tap is in: the n-th tap of this visit (1 = the first). */
export function touchMood(def: NpcTouchDef, tap: number): 'calm' | 'warm' | 'tired' {
  if (tap >= def.chain.tired) return 'tired';
  if (tap >= def.chain.warm) return 'warm';
  return 'calm';
}

/** The kind weights for a mood: more feeling as the taps go on, and the rare line a little likelier when tired. */
function weightsFor(def: NpcTouchDef, mood: 'calm' | 'warm' | 'tired'): Record<TouchKind, number> {
  const w = def.weights;
  if (mood === 'calm') return w;
  if (mood === 'warm') return { ...w, NORMAL: w.NORMAL * 0.5, EMOTION: w.EMOTION + w.NORMAL * 0.5 };
  return { NORMAL: 0, EMOTION: w.NORMAL + w.EMOTION, CONDITIONAL: w.CONDITIONAL, PREMIUM: w.PREMIUM * 2 };
}

function pickOne<T>(xs: readonly T[], rng: () => number): T {
  return xs[Math.min(xs.length - 1, Math.floor(Math.max(0, rng()) * xs.length))];
}

/**
 * ONE TAP'S ANSWER. `tap` is which tap of this visit it is (1 = the first);
 * `last` is the line said just before, which is not said twice running
 * when anything else could be. A kind with nothing to say in this world
 * (no condition holds) falls back to the everyday lines.
 */
export function pickTouchReaction(
  def: NpcTouchDef,
  tap: number,
  facts: TouchFacts,
  last: string | null = null,
  rng: () => number = Math.random,
): TouchReaction {
  const mood = touchMood(def, tap);
  const moodFaces = def.moods[mood];
  const candidates: Record<TouchKind, TouchLine[]> = {
    NORMAL: (def.lines[def.baseExpression] ?? []).map((text) => ({ text, expression: def.baseExpression })),
    EMOTION: moodFaces.flatMap((expression) => (def.lines[expression] ?? []).map((text) => ({ text, expression }))),
    CONDITIONAL: def.conditional.filter((l) => touchConditionHolds(l.when, facts)),
    PREMIUM: def.premium.filter((l) => touchConditionHolds(l.when, facts)),
  };
  const weights = weightsFor(def, mood);
  const kinds = (['NORMAL', 'EMOTION', 'CONDITIONAL', 'PREMIUM'] as const).filter(
    (k) => weights[k] > 0 && candidates[k].length > 0,
  );
  const total = kinds.reduce((sum, k) => sum + weights[k], 0);
  let left = Math.min(0.999999, Math.max(0, rng())) * total;
  let kind: TouchKind = kinds[kinds.length - 1] ?? 'NORMAL';
  for (const k of kinds) {
    left -= weights[k];
    if (left < 0) {
      kind = k;
      break;
    }
  }
  let pool = candidates[kind];
  if (pool.length === 0) {
    kind = 'NORMAL';
    pool = candidates.NORMAL;
  }
  const fresh = pool.filter((l) => l.text !== last);
  const line = pickOne(fresh.length > 0 ? fresh : pool, rng);
  const text = line?.text ?? '';
  return { kind, expression: def.lineFaces?.[text] ?? line?.expression ?? def.baseExpression, text };
}
