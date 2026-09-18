// Content data for Gald's first-encounter life choice events.

import type { LifeChoiceId } from '../../core/flow/types';
import type {
  CreatureLifeChoiceEventType,
  GaldLifeChoiceEventType,
  MemoryEventType,
} from '../../core/memory/types';
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

/**
 * Japanese labels for the WORLD MEMORY viewer.
 *
 * Every fact whose sentence is fixed. A fact about a creature is about
 * one particular animal, so its sentence is built from the event's
 * actor instead — see memoryEventLabel in creatureLifeChoice.ts, which
 * is what screens should call.
 */
export const MEMORY_EVENT_LABEL: Record<
  Exclude<MemoryEventType, CreatureLifeChoiceEventType>,
  string
> = {
  PLAYER_KILLED_GALD: '森の盗賊にとどめを刺した',
  PLAYER_SPARED_GALD: '森の盗賊を見逃した',
  PLAYER_HELPED_GALD: '森の盗賊の傷を治療した',
  PLAYER_CAPTURED_GALD: '森の盗賊を衛兵へ引き渡した',
  GALD_LEAVES_BANDITS: '森の盗賊が、盗賊団を離れた',
  GALD_ARRIVES_IN_ALDEN: 'ひとりの男が、アルデンに流れ着いた',
  GALD_BECOMES_BAKER: '男は、パン屋として生き始めた',
  GALD_WALKS_THE_ROAD: '傷の癒えた男が、街道へ出た',
  GALD_BECOMES_HEALER: '男は、街道で人の傷を診るようになった',
  GALD_STANDS_TRIAL: '捕らえられた男が、アルデンで裁きを受けた',
  GALD_COMPLETES_SENTENCE: '男は、科された務めを終えた',
  GALD_WORKS_FOR_ALDEN: '男は、村の仕事で日銭を稼ぐようになった',
  GALD_IS_BURIED: '森の外れに、小さな石が積まれた',
  GALD_GRAVE_TENDED: '誰かが、その石積みに花を置いていく',
  PLAYER_REUNITED_WITH_GALD: 'パン屋で、あの盗賊と再会した',
  PLAYER_MET_GALD_ON_THE_ROAD: '街道の救護所で、あの盗賊と再会した',
  PLAYER_MET_GALD_IN_ALDEN: '村外れの作業場で、あの盗賊と再会した',
  PLAYER_FOUND_GALD_GRAVE: '森の墓で、あの盗賊の名を見つけた',
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
