// Development only: put the opening theme's SKIP control on screen while
// the music slot is still empty.
//
// There is no song yet (MUSIC_ASSETS.OPENING_THEME is null), so nothing
// actually plays, and with nothing playing there is nothing to skip and
// no way to look at the control at all. This switch stands in for the
// song: silent, fixed length, and gone from any build a player can
// reach. It is a rehearsal of the control, never a sound.
//
// It is deliberately NOT a second way of playing music: it makes no
// Audio element and touches no volume. The moment a real song is put in
// the slot this stops being needed.

import { DEV_ADMIN_ENABLED } from './devMode';

const KEY = 'mugen-opening-rehearsal';

/**
 * How long the stand-in lasts before it ends by itself.
 *
 * A number, not a song: it exists so that the natural-end path can be
 * exercised as well as SKIP.
 */
export const OPENING_REHEARSAL_MS = 6000;

export function openingRehearsal(): boolean {
  if (!DEV_ADMIN_ENABLED) return false;
  try {
    return localStorage.getItem(KEY) === 'ON';
  } catch {
    return false;
  }
}

export function setOpeningRehearsal(on: boolean): void {
  try {
    if (on) localStorage.setItem(KEY, 'ON');
    else localStorage.removeItem(KEY);
  } catch {
    /* blocked storage: the switch simply does not persist */
  }
}
