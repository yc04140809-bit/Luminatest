// HOW THE PARTY IS DOING WHEN THEY ARE NOT FIGHTING.
//
// THIS DID NOT EXIST UNTIL NOW, and its absence is the whole reason a
// herb could only be drunk in a battle. Every fight began at
// `stats.maxHp` and `stats.maxMp` and nothing carried out of it, so
// there was no wound outside a fight for a herb to close — a bag that
// offered to heal on the road would have been offering to change a
// number that nothing reads.
//
// So there is a condition now: what the party has left, kept between
// fights, healed by the bag and by a night's rest. It is the smallest
// thing that makes the item loop real, and it is deliberately ONE
// object rather than a per-character table — the battle has shared one
// health bar and one pool of magic since it was written, and inventing
// four of them here would be inventing a system the fight does not
// have.
//
// WHAT IT COSTS, SAID PLAINLY: fights no longer always begin at full.
// That is a real change to how the game plays and it is the only way
// field healing means anything — a number the next fight overwrites is
// a number that lies to the player. The free way back is 休息する,
// which restores everything and always will: nobody can be stranded by
// this, whatever their LUMI.

import { type PartyStats } from '../progression/levelStats';

export interface PartyCondition {
  hp: number;
  mp: number;
}

/** Whole and rested, which is what a world with no row for this is. */
export function fullCondition(stats: PartyStats): PartyCondition {
  return { hp: stats.maxHp, mp: stats.maxMp };
}

const whole = (raw: unknown): number | null => {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) ? n : null;
};

/**
 * A stored condition, read against the party they are now.
 *
 * CLAMPED ON READ RATHER THAN ON WRITE, because the ceiling moves: a
 * level gained between one session and the next raises the maximum,
 * and a curve retuned downward lowers it. Storing the absolute number
 * and judging it against today's maximum is the only version of this
 * that survives either.
 *
 * Health floors at ONE. Nobody walks around the world at zero — a
 * fight lost puts the party back on their feet before they are
 * anywhere this is read — so a zero here is damage, not a state.
 */
export function readCondition(raw: unknown, stats: PartyStats): PartyCondition {
  const full = fullCondition(stats);
  if (!raw || typeof raw !== 'object') return full;
  const held = raw as { hp?: unknown; mp?: unknown };
  const hp = whole(held.hp);
  const mp = whole(held.mp);
  return {
    hp: hp === null ? full.hp : Math.max(1, Math.min(full.hp, hp)),
    mp: mp === null ? full.mp : Math.max(0, Math.min(full.mp, mp)),
  };
}

/** Whether there is anything to put back. */
export function isFull(condition: PartyCondition, stats: PartyStats): boolean {
  return condition.hp >= stats.maxHp && condition.mp >= stats.maxMp;
}
