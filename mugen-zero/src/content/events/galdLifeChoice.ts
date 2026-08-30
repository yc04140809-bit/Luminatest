// Content data for Gald's first-encounter life choice events.

import type { LifeChoiceId } from '../../core/flow/types';
import type { GaldLifeChoiceEventType, MemoryEventType } from '../../core/memory/types';
import type { CharacterState } from '../../core/characters/types';

/**
 * One fixed id for the final life choice of Gald's first encounter:
 * whichever of the four outcomes happens claims this slot, and the
 * write-once store guarantees no contradictory second outcome.
 */
export const GALD_LIFE_CHOICE_EVENT_ID = 'evt_gald_first_encounter_life_choice';

export const GALD_LIFE_CHOICE_EVENT_TYPE: Record<LifeChoiceId, GaldLifeChoiceEventType> = {
  KILL: 'PLAYER_KILLED_GALD',
  SPARE: 'PLAYER_SPARED_GALD',
  HELP: 'PLAYER_HELPED_GALD',
  CAPTURE: 'PLAYER_CAPTURED_GALD',
};

export const GALD_LIFE_CHOICE_TYPE_TO_CHOICE: Record<GaldLifeChoiceEventType, LifeChoiceId> = {
  PLAYER_KILLED_GALD: 'KILL',
  PLAYER_SPARED_GALD: 'SPARE',
  PLAYER_HELPED_GALD: 'HELP',
  PLAYER_CAPTURED_GALD: 'CAPTURE',
};

/** Japanese labels for the WORLD MEMORY viewer. */
export const MEMORY_EVENT_LABEL: Record<MemoryEventType, string> = {
  PLAYER_KILLED_GALD: '森の盗賊にとどめを刺した',
  PLAYER_SPARED_GALD: '森の盗賊を見逃した',
  PLAYER_HELPED_GALD: '森の盗賊の傷を治療した',
  PLAYER_CAPTURED_GALD: '森の盗賊を衛兵へ引き渡した',
  GALD_LEAVES_BANDITS: '森の盗賊が、盗賊団を離れた',
  GALD_ARRIVES_IN_ALDEN: 'ひとりの男が、アルデンに流れ着いた',
  GALD_BECOMES_BAKER: '男は、パン屋として生き始めた',
  PLAYER_REUNITED_WITH_GALD: 'パン屋で、あの盗賊と再会した',
  WORLD_TIME_SHIFTED: '世界の時が、大きく流れた',
};

/**
 * CURRENT-state consequences applied atomically with the choice event.
 * Minimal by design: only what the fact itself makes true right now
 * (a killed man is not alive). Everything else is the event engine's job.
 */
export const GALD_LIFE_CHOICE_STATE_EFFECTS: Partial<
  Record<LifeChoiceId, Partial<CharacterState>>
> = {
  KILL: { alive: false },
};
