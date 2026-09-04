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
    return {
      kind: 'SUMMON',
      arcanaId: chosen.arcanaId,
      progress: chosen.progress,
      outcome: options.forcedSummon,
    };
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
    const outcome = rollSummon({ progress: chosen.progress, rng });
    // canSummon already held, so this cannot be null; the check is here
    // so a future change to the rules cannot silently produce a summon
    // of nothing.
    if (outcome) {
      return { kind: 'SUMMON', arcanaId: chosen.arcanaId, progress: chosen.progress, outcome };
    }
  }

  return { kind: 'MODIFIER', def };
}
