// READING A FORGE CHARACTER, FOR PEOPLE AND FOR THE GAME.
//
// Small helpers over a deploy file. Nothing here derives anything the
// author did not write: a label worked out from type and role, a name to
// show, and — for a human — the facts that are true now, kept apart from
// what they could become.

import type { ForgeDeployPackage, ForgeKind, ForgeSkillLevel } from './types';

/** HUMAN, MONSTER or BOSS — worked out from type and role, never stored. */
export function forgeKindOf(item: Pick<ForgeDeployPackage, 'characterType' | 'encounterRole'>): ForgeKind {
  if (item.characterType === 'human') return 'HUMAN';
  return item.encounterRole === 'BOSS' ? 'BOSS' : 'MONSTER';
}

export const FORGE_KIND_LABEL: Record<ForgeKind, string> = {
  HUMAN: '人間',
  MONSTER: '通常モンスター',
  BOSS: 'BOSS',
};

/**
 * What to call them on a screen.
 *
 * A human by their name. A monster by its own name if it has one, and
 * otherwise by its species — for display only: the individual name in
 * the record stays null, because nobody has given it one.
 */
export function forgeDisplayName(payload: ForgeDeployPackage): string {
  const identity = payload.identity;
  if (payload.characterType === 'human') return identity.name;
  return identity.individualName ?? identity.speciesName ?? identity.name;
}

/**
 * FORGE's occupationMode values (SOURCE VERIFIED 2026-10-02): UNSET,
 * FUTURE_ASPIRATION, CURRENT_OR_AGE_APPROPRIATE. FORGE derives it; the
 * game only reads it, never works it out again.
 */
export const OCCUPATION_CURRENT = 'CURRENT_OR_AGE_APPROPRIATE';
/**
 * LEGACY, read only: the bridge package v1.0's samples wrote
 * `CURRENT_FACT`, which FORGE itself never outputs. Kept so the old test
 * fixtures still read; never written, never the specification.
 */
const LEGACY_OCCUPATION_CURRENT = 'CURRENT_FACT';

/**
 * WHAT IS TRUE OF A HUMAN NOW, as opposed to what they could become.
 *
 * Skills are `currentSkills` exactly — the aptitudes (potential) are
 * not consulted, so a gifted swordsman who has never held a sword has no
 * sword skill here. The occupation is theirs only when FORGE's lifeStage
 * says it is current (or fitting their age); a child's "wants to be a
 * knight" comes back as an aspiration and nothing else. FORGE's lifeStage
 * is taken as it is: nothing here recomputes it. Monsters have none of
 * this: null.
 */
export function forgeHumanCurrentFacts(payload: ForgeDeployPackage): {
  skills: Record<string, ForgeSkillLevel>;
  occupation: string | null;
  aspiration: string | null;
} | null {
  if (payload.characterType !== 'human') return null;
  const occupation = typeof payload.profile?.occupation === 'string' && payload.profile.occupation ? payload.profile.occupation : null;
  const mode = payload.lifeStage?.occupationMode;
  return {
    skills: { ...(payload.currentSkills ?? {}) },
    occupation: mode === OCCUPATION_CURRENT || mode === LEGACY_OCCUPATION_CURRENT ? occupation : null,
    aspiration: mode === 'FUTURE_ASPIRATION' ? occupation : null,
  };
}
