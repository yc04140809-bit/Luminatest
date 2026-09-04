// Which battle screen to show, and how to get at the prototype.
//
// Development only, and OFF by default: a player who never opens DEV
// ADMIN sees exactly the battle screen they saw before. The whole point
// of the flag is that a prototype which turns out to be wrong costs one
// tap to abandon rather than a revert.

import { DEV_ADMIN_ENABLED } from './devMode';

const UI_KEY = 'mugen-battle-ui';
const FINISHABLE_KEY = 'mugen-battle-start-finishable';

export type BattleUiChoice = 'OLD' | 'PROTOTYPE';

/** Which battle UI the forest fight should use. 'OLD' unless told. */
export function battleUi(): BattleUiChoice {
  if (!DEV_ADMIN_ENABLED) return 'OLD';
  try {
    return localStorage.getItem(UI_KEY) === 'PROTOTYPE' ? 'PROTOTYPE' : 'OLD';
  } catch {
    return 'OLD';
  }
}

export function setBattleUi(choice: BattleUiChoice): void {
  write(UI_KEY, choice === 'PROTOTYPE' ? 'PROTOTYPE' : null);
}

/**
 * Start the fight with the creature already beatable, so the moment the
 * commands turn into the four answers can be looked at without playing
 * a whole battle first.
 */
export function startFinishable(): boolean {
  if (!DEV_ADMIN_ENABLED) return false;
  try {
    return localStorage.getItem(FINISHABLE_KEY) === 'ON';
  } catch {
    return false;
  }
}

export function setStartFinishable(on: boolean): void {
  write(FINISHABLE_KEY, on ? 'ON' : null);
}

function write(key: string, value: string | null): void {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    /* blocked storage: the flag simply stays off */
  }
}
