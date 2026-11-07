// HOW THE PLAYER LIKES EXPLORING TO FEEL — per device, never the world.
//
// The same rule as battleBgmChoice.ts: a preference, so localStorage. Two
// switches (作者「探索システムPoC 改善指示書」2026-10-18): the light buzz as a
// thing is first noticed, and the place's small moves (wind, leaves, dust).
// Both on unless turned off; blocked storage leaves them on.

export type ExplorePref = 'vibration' | 'ambience';

const KEY: Record<ExplorePref, string> = {
  vibration: 'mugen-explore-vibration',
  ambience: 'mugen-explore-ambience',
};

export function explorePref(pref: ExplorePref): boolean {
  try {
    return localStorage.getItem(KEY[pref]) !== 'off';
  } catch {
    return true;
  }
}

export function setExplorePref(pref: ExplorePref, on: boolean): void {
  try {
    localStorage.setItem(KEY[pref], on ? 'on' : 'off');
  } catch {
    /* blocked storage: the choice lasts this session at most */
  }
}
