// Development only: force what the next arrival in the forest turns out
// to be, so each of the three routes can actually be tested rather than
// waited for.
//
// It is never shown in a production build (the DEV ADMIN gate hides the
// only way to set it) and it is never read in one either. It lives in
// localStorage so it survives the reload a world reset does.

import { DEV_ADMIN_ENABLED } from './devMode';
import type { DiscoveryCategory } from '../game/exploration/discovery';

const STORAGE_KEY = 'mugen-debug-encounter';

function isCategory(value: unknown): value is DiscoveryCategory {
  return value === 'EVENT' || value === 'ITEM' || value === 'BATTLE';
}

/** The forced category, or null to let the weights decide. */
export function debugEncounterType(): DiscoveryCategory | null {
  if (!DEV_ADMIN_ENABLED) return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return isCategory(raw) ? raw : null;
  } catch {
    return null;
  }
}

export function setDebugEncounterType(category: DiscoveryCategory | null): void {
  try {
    if (category) localStorage.setItem(STORAGE_KEY, category);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* blocked storage: the tester falls back to walking until it happens */
  }
}
