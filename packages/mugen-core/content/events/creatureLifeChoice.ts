// The four answers, given to something that lives in the world rather
// than to a person with a name.
//
// The events themselves are generic: WHAT was decided is the type, and
// WHO it was decided about is the actor on the event. That is why one
// set of four types covers every creature there will ever be — and why
// the label for one has to be built rather than looked up, since the
// name belongs to the actor and not to the fact.

import type { LifeChoiceId } from '../../core/flow/types';
import type {
  CreatureLifeChoiceEventType,
  MemoryEvent,
  MemoryEventType,
} from '../../core/memory/types';
import { individualName } from '../enemies/species';
import { MEMORY_EVENT_LABEL } from './galdLifeChoice';

export const CREATURE_LIFE_CHOICE_EVENT_TYPE: Record<LifeChoiceId, CreatureLifeChoiceEventType> = {
  KILL: 'PLAYER_KILLED_CREATURE',
  SPARE: 'PLAYER_SPARED_CREATURE',
  HELP: 'PLAYER_HELPED_CREATURE',
  CAPTURE: 'PLAYER_CAPTURED_CREATURE',
};

export const CREATURE_LIFE_CHOICE_TYPE_TO_CHOICE: Record<CreatureLifeChoiceEventType, LifeChoiceId> =
  {
    PLAYER_KILLED_CREATURE: 'KILL',
    PLAYER_SPARED_CREATURE: 'SPARE',
    PLAYER_HELPED_CREATURE: 'HELP',
    PLAYER_CAPTURED_CREATURE: 'CAPTURE',
  };

/** What the world wrote down, once the creature's name is filled in. */
const CREATURE_LABEL: Record<CreatureLifeChoiceEventType, (name: string) => string> = {
  PLAYER_KILLED_CREATURE: (name) => `森で、${name}の命を絶った`,
  PLAYER_SPARED_CREATURE: (name) => `森で、${name}を逃がした`,
  PLAYER_HELPED_CREATURE: (name) => `森で、${name}を助けた`,
  PLAYER_CAPTURED_CREATURE: (name) => `森で、${name}を連れて帰った`,
};

function isCreatureEvent(type: MemoryEventType): type is CreatureLifeChoiceEventType {
  return type in CREATURE_LABEL;
}

/**
 * What one fact says, in the player's words.
 *
 * Most facts have a fixed sentence. A fact about a creature does not:
 * it is about one particular animal, so its sentence is built from the
 * actor the event carries.
 */
export function memoryEventLabel(event: Pick<MemoryEvent, 'type' | 'actors'>): string {
  if (isCreatureEvent(event.type)) {
    const subject = event.actors.find((actor) => actor !== 'PLAYER') ?? '';
    return CREATURE_LABEL[event.type](individualName(subject));
  }
  return MEMORY_EVENT_LABEL[event.type] ?? event.type;
}
