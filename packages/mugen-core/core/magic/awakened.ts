// HAS SHE DONE THIS BEFORE?
//
// The awakening happens inside one fight, but it has to hold afterwards
// — she does not forget between fights. The obvious way to record that
// would be a new key in the saved world, and the obvious way is wrong
// here: it is a second place the same fact lives, it needs a migration,
// and a save written before it exists would say "no" about a player who
// has already seen the scene.
//
// The world already knows. Kaos steps forward during the fight with
// Gald, and the only way past that fight is the four answers — which
// are written into WORLD MEMORY as an event. So "has she done this
// before" is "does the world remember what became of Gald", which is a
// question the save can already answer, at every version it has ever
// been written at.

import { GALD_LIFE_CHOICE_EVENT_TYPE } from '../../content/events/galdLifeChoice';

const AWAKENING_EVENTS = new Set<string>(Object.values(GALD_LIFE_CHOICE_EVENT_TYPE));

/**
 * Whether Kaos has already reached past what she was doing.
 *
 * Takes the event types rather than the world, so it is pure and so a
 * test does not need a database to ask.
 */
export function kaosHasAwakened(eventTypes: readonly string[]): boolean {
  return eventTypes.some((type) => AWAKENING_EVENTS.has(type));
}
