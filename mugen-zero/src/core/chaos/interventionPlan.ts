// What Kaos does as a fight begins — all of it, in one decision.
//
// She had two things she could do and now she has three, and they are
// mutually exclusive on purpose: a fight that opens with a blessing AND
// a summoned creature is two gifts stacked on one moment, and neither
// of them lands. So one roll decides whether she does anything at all
// (unchanged, and still mostly "no"), and a second decides whether what
// she does is the usual help or an attempt at an ARCANA.
//
// The old roll is untouched underneath this: `rollChaosIntervention`
// still means exactly what it meant, and the four blessings still
// behave exactly as they did. This module only chooses between them.

import {
  rollChaosIntervention,
  type ChaosInterventionDef,
  type ChaosInterventionId,
  type Rng,
} from './chaosIntervention';
import { SUMMON_CONFIG, canSummon, rollSummon, type SummonOutcome } from '../summon/summon';
import {
  pickAccident,
  type AccidentRecord,
  type SummonAccidentDef,
} from '../summon/summonAccident';

/** An ARCANA she could reach for, and how much of it there is. */
export interface SummonCandidate {
  arcanaId: string;
  progress: number;
}

/**
 * One of three things, never two.
 *
 * A SUMMON plan is only ever an INCOMPLETE one: a complete memory is
 * not something that happens to the player at the start of a fight, it
 * is something they choose to spend, so it never appears here.
 */
export type InterventionPlan =
  | { kind: 'NONE' }
  | { kind: 'MODIFIER'; def: ChaosInterventionDef }
  | {
      kind: 'SUMMON';
      arcanaId: string;
      progress: number;
      outcome: SummonOutcome;
      /**
       * What crossed, when the outcome is ACCIDENT. Null otherwise, and
       * the two always agree: an ACCIDENT without a candidate is not a
       * state this can be in.
       */
      accident: SummonAccidentDef | null;
    };

export interface PlanOptions {
  defs: readonly ChaosInterventionDef[];
  rng?: Rng;
  chance?: number;
  /**
   * The unfinished memories she could try to rebuild. Complete ones do
   * not belong here — they are the player's to spend.
   */
  candidates?: readonly SummonCandidate[];
  arcanaShare?: number;
  /** Development only. */
  forcedChaos?: ChaosInterventionId | null;
  /** What could cross an unfinished memory here, and where the player
   *  already stands with each of them. */
  accidents?: readonly SummonAccidentDef[];
  accidentRecords?: readonly AccidentRecord[];
  /** ARCANA the player owns outright, which can never cross by accident. */
  acquiredArcanaIds?: readonly string[];
  /** Where and when this fight is, for candidates that care. */
  location?: string | null;
  year?: number | null;
  /** Today, in absolute world days, for cooldowns. */
  day?: number | null;
  accidentChance?: number;
  /**
   * Development only: make this fight open with an attempt at a summon,
   * and settle how it goes. Ignored when there is nothing to summon —
   * a forced summon must never invent a memory the player has not made.
   */
  forcedSummon?: SummonOutcome | null;
}

/**
 * What happens at the start of this fight.
 *
 * Order matters and is the whole of the exclusivity rule: first "does
 * she do anything", then "is it an ARCANA", then — only if it is not —
 * which blessing. Nothing can produce both.
 */
export function planIntervention(options: PlanOptions): InterventionPlan {
  const candidates = (options.candidates ?? []).filter((c) => canSummon(c.progress) && c.progress < 100);
  const rng = options.rng ?? Math.random;

  // Development only, and only when the player actually has an
  // unfinished memory: this settles the outcome, not the existence.
  if (options.forcedSummon && candidates.length > 0) {
    const chosen = candidates[0];
    return settle(options, chosen, rng, options.forcedSummon);
  }

  const def = rollChaosIntervention({
    defs: options.defs,
    rng,
    chance: options.chance,
    forced: options.forcedChaos ?? null,
  });
  // She is staying out of this one. Nothing else is rolled.
  if (!def) return { kind: 'NONE' };

  // A blessing was named on purpose — that is what the tester asked
  // for, and a summon must not quietly replace it.
  const share = options.arcanaShare ?? SUMMON_CONFIG.arcanaShare;
  if (!options.forcedChaos && candidates.length > 0 && rng() < share) {
    const chosen = candidates[Math.min(candidates.length - 1, Math.floor(rng() * candidates.length))];
    const plan = settle(options, chosen, rng, null);
    // canSummon already held, so this cannot be NONE; the check is here
    // so a future change to the rules cannot silently produce a summon
    // of nothing.
    if (plan.kind === 'SUMMON') return plan;
  }

  return { kind: 'MODIFIER', def };
}

/**
 * How one attempt at one unfinished memory turns out.
 *
 * The accident is asked about first, and this is the important part of
 * the order: it is not a rarer grade of success that a very good roll
 * upgrades into. It is a different thing happening instead — the
 * memory did not hold OR fail, it was crossed — so it is settled
 * before the ordinary die is ever thrown, and only ever when the world
 * already had something that could cross it.
 */
function settle(
  options: PlanOptions,
  chosen: SummonCandidate,
  rng: Rng,
  forced: SummonOutcome | null,
): InterventionPlan {
  const accident = pickAccident({
    defs: options.accidents ?? [],
    progress: chosen.progress,
    records: options.accidentRecords,
    acquiredArcanaIds: options.acquiredArcanaIds,
    day: options.day ?? null,
    location: options.location ?? null,
    year: options.year ?? null,
    chance: options.accidentChance,
    rng,
    forced: forced === 'ACCIDENT',
  });
  if (accident) {
    return {
      kind: 'SUMMON',
      arcanaId: chosen.arcanaId,
      progress: chosen.progress,
      outcome: 'ACCIDENT',
      accident,
    };
  }
  // Asked for an accident and the world had none to give: an ordinary
  // fight, not a pretend one. Development switches settle outcomes,
  // never existence.
  const outcome = rollSummon({ progress: chosen.progress, rng, forced });
  if (!outcome) return { kind: 'NONE' };
  return {
    kind: 'SUMMON',
    arcanaId: chosen.arcanaId,
    progress: chosen.progress,
    outcome,
    accident: null,
  };
}
