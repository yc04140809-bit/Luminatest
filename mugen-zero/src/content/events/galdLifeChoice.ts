// Content data for Gald's first-encounter life choice events.

import type { LifeChoiceId } from '../../core/flow/types';
import type { GaldLifeChoiceEventType } from '../../core/memory/types';

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
export const MEMORY_EVENT_LABEL: Record<GaldLifeChoiceEventType, string> = {
  PLAYER_KILLED_GALD: '森の盗賊にとどめを刺した',
  PLAYER_SPARED_GALD: '森の盗賊を見逃した',
  PLAYER_HELPED_GALD: '森の盗賊の傷を治療した',
  PLAYER_CAPTURED_GALD: '森の盗賊を衛兵へ引き渡した',
};
