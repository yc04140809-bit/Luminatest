// WHAT COULD BECOME OF SOMEBODY — and the word is COULD.
//
// This is the last step of the engine and the one with the strictest
// limit on it: it FINDS candidates and it stops. Nothing here writes a
// future into the world, changes a person, or touches canon. A bloom
// coming back from this function means "the conditions for this shape
// of her life are now met" — not "this is what happens to her".
//
// Which is why a bloom's requirements are asked about the world rather
// than about the player. A bloom does not know what the player did. It
// knows what is true of somebody now, and the player's doings are one
// of several reasons things become true.

import { toAbsoluteDay, type WorldClock } from '../time/calendar';
import { seedKind, type SeedKindDef } from './defs';
import { atLeast, grownSeed } from './growth';
import { holdsVine } from './vine';
import type { WorldBloom, WorldBloomDef, WorldSeed, WorldVine } from './types';

export interface BloomInput {
  defs: readonly WorldBloomDef[];
  seeds: readonly WorldSeed[];
  vines: readonly WorldVine[];
  kinds: readonly SeedKindDef[];
  now: WorldClock;
  /** The day the world started, for `afterDays`. */
  since: WorldClock;
}

/**
 * Whether one shape of a life is currently possible, and why or why not.
 *
 * The reasons are returned alongside the answer because a world engine
 * that can only say "no" is a world engine nobody can develop against:
 * the question a person asks at four in the morning is never "is it
 * ready" but "what is it still waiting for".
 */
export interface BloomCheck {
  def: WorldBloomDef;
  met: boolean;
  /** One line per requirement, in the order they were written. */
  reasons: readonly { requirement: string; met: boolean; detail: string }[];
}

export function checkBloom(def: WorldBloomDef, input: BloomInput): BloomCheck {
  const { seeds, vines, kinds, now, since } = input;
  const reasons: { requirement: string; met: boolean; detail: string }[] = [];

  for (const want of def.requirements.seeds) {
    const whose = want.npcId ?? def.npcId;
    const label =
      `seed ${want.type}` +
      (whose === def.npcId ? '' : ` of ${whose}`) +
      (want.atLeast ? ` ≥ ${want.atLeast}` : '') +
      (want.atMost ? ` ≤ ${want.atMost}` : '');
    const stored = seeds.find((seed) => seed.targetNpcId === whose && seed.type === want.type);
    const kind = stored ? seedKind(kinds, stored.type) : null;

    if (!stored || !kind) {
      // Never planted. That fails a floor and — unless the content says
      // otherwise — satisfies a ceiling: somebody who never had it does
      // not have it now.
      const met = want.atLeast === undefined && (want.absentCounts ?? true);
      reasons.push({ requirement: label, met, detail: 'まだ蒔かれていない' });
      continue;
    }
    const seed = grownSeed(stored, kind, now);
    // Content that bounds a seed neither way has asked nothing; saying
    // so out loud beats silently passing a requirement nobody wrote.
    const bounded = want.atLeast !== undefined || want.atMost !== undefined;
    const met =
      bounded &&
      (want.atLeast === undefined || atLeast(seed.status, want.atLeast)) &&
      (want.atMost === undefined || !atLeast(seed.status, want.atMost) || seed.status === want.atMost);
    reasons.push({
      requirement: bounded ? label : `${label} (条件が書かれていない)`,
      met,
      detail: `${seed.status} (${seed.strength.toFixed(2)})`,
    });
  }

  const wantVine = def.requirements.vine;
  if (wantVine) {
    const met = holdsVine(vines, def.npcId, wantVine.target, wantVine.relationType);
    reasons.push({
      requirement: `vine ${wantVine.relationType} → ${wantVine.target}`,
      met,
      detail: met ? '結ばれている' : 'まだ結ばれていない',
    });
  }

  const afterDays = def.requirements.afterDays;
  if (afterDays !== undefined) {
    const elapsed = toAbsoluteDay(now) - toAbsoluteDay(since);
    const met = elapsed >= afterDays;
    reasons.push({
      requirement: `${afterDays}日以上`,
      met,
      detail: `${elapsed}日経過`,
    });
  }

  return { def, met: reasons.every((reason) => reason.met), reasons };
}

/**
 * Every shape of a life whose conditions are met right now.
 *
 * Recomputed rather than remembered, so a candidate whose seed has
 * since faded quietly stops being a candidate. A bloom that has been
 * acted on is somebody else's business to record — this function has no
 * opinion about anything that has already happened.
 */
export function bloomCandidates(input: BloomInput): WorldBloom[] {
  return input.defs
    .map((def) => checkBloom(def, input))
    .filter((check) => check.met)
    .map((check) => ({
      id: check.def.id,
      npcId: check.def.npcId,
      requirements: check.def.requirements,
      result: check.def.result,
      status: 'CANDIDATE' as const,
      foundAt: input.now,
    }));
}

/** Everything, met or not, for a developer looking at why. */
export function allBloomChecks(input: BloomInput): BloomCheck[] {
  return input.defs.map((def) => checkBloom(def, input));
}
