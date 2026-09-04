// Development only: force what the next arrival in the forest turns out
// to be, so each of the three routes can actually be tested rather than
// waited for.
//
// It is never shown in a production build (the DEV ADMIN gate hides the
// only way to set it) and it is never read in one either. It lives in
// localStorage so it survives the reload a world reset does.

import { DEV_ADMIN_ENABLED } from './devMode';
import type { DiscoveryCategory } from '../game/exploration/discovery';
import type { EnemyAction } from '../game/battle/battleLogic';
import type { ChaosInterventionId } from '../core/chaos/chaosIntervention';
import type { SummonOutcome } from '../core/summon/summon';

const STORAGE_KEY = 'mugen-debug-encounter';
const ENEMY_ACTION_KEY = 'mugen-debug-enemy-action';
const STORY_TRIGGER_KEY = 'mugen-debug-story-trigger';
const CHAOS_KEY = 'mugen-debug-chaos';
const SUMMON_KEY = 'mugen-debug-summon';

function isCategory(value: unknown): value is DiscoveryCategory {
  return value === 'EVENT' || value === 'ITEM' || value === 'BATTLE';
}

/** The forced category, or null to let the weights decide. */
export function debugEncounterType(): DiscoveryCategory | null {
  if (!DEV_ADMIN_ENABLED) return null;
  const raw = read(STORAGE_KEY);
  return isCategory(raw) ? raw : null;
}

export function setDebugEncounterType(category: DiscoveryCategory | null): void {
  write(STORAGE_KEY, category);
}

/** Make the creature do one thing on every turn it gets. */
export function debugEnemyAction(): EnemyAction | null {
  if (!DEV_ADMIN_ENABLED) return null;
  const raw = read(ENEMY_ACTION_KEY);
  return raw === 'ATTACK' || raw === 'SKILL' ? raw : null;
}

export function setDebugEnemyAction(action: EnemyAction | null): void {
  write(ENEMY_ACTION_KEY, action);
}

/**
 * Settle whether the next victory turns the creature into somebody,
 * instead of waiting for the dice. null leaves it to the rates.
 */
export function debugStoryTrigger(): boolean | null {
  if (!DEV_ADMIN_ENABLED) return null;
  const raw = read(STORY_TRIGGER_KEY);
  return raw === 'ON' ? true : raw === 'OFF' ? false : null;
}

export function setDebugStoryTrigger(value: boolean | null): void {
  write(STORY_TRIGGER_KEY, value === null ? null : value ? 'ON' : 'OFF');
}

/**
 * Settle what Kaos does at the start of the next fight, instead of
 * waiting for the dice to show all four. Never in a build a player can
 * reach: the only way to set it is DEV ADMIN.
 */
export function debugChaosIntervention(): ChaosInterventionId | null {
  if (!DEV_ADMIN_ENABLED) return null;
  const raw = read(CHAOS_KEY);
  return raw === 'NONE' ||
    raw === 'CHAOS_BLESSING' ||
    raw === 'CHAOS_GUARD' ||
    raw === 'CHAOS_WEAKEN' ||
    raw === 'CHAOS_BREAK'
    ? raw
    : null;
}

export function setDebugChaosIntervention(id: ChaosInterventionId | null): void {
  write(CHAOS_KEY, id);
}

/**
 * Settle how an incomplete summon goes, instead of waiting for a die
 * that is only reached in a fraction of a fraction of fights. Never in
 * a build a player can reach: the only way to set it is DEV ADMIN, and
 * it is ignored entirely unless the player really does hold an
 * unfinished memory.
 */
export function debugSummon(): SummonOutcome | null {
  if (!DEV_ADMIN_ENABLED) return null;
  const raw = read(SUMMON_KEY);
  return raw === 'SUCCESS' || raw === 'FAILURE' || raw === 'ACCIDENT' ? raw : null;
}

export function setDebugSummon(outcome: SummonOutcome | null): void {
  write(SUMMON_KEY, outcome);
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* blocked storage: the tester falls back to playing until it happens */
  }
}
