import { APP_DB_NAME } from './save';
import { resetPlayClock } from './playClock';

/**
 * 管理者モード — THE SAVE THROWN AWAY BETWEEN PLAYERS (作者 2026-11-02: 試遊・展示で、スタッフが次の人のために).
 *
 * The game is one life: nothing in it starts over (作者 — やり直しは出来ない). Starting over is the admin's
 * alone: the settings' last row, opened with the lock number, then asked twice. The number is written here
 * on purpose — it keeps a visitor's finger off it, it is not a secret.
 *
 * HOW IT IS THROWN AWAY: the game holds its save open while it runs, and a database held open is not
 * deleted. So the request is written down and the page starts again; on the way up, before any world opens
 * it, the save is deleted (`runPendingReset`, from main.tsx). The device's settings stay; the play's
 * stopwatch goes with the save, as the debug tool's does (dev/ResetSave.tsx).
 */
export const ADMIN_LOCK = '4148999';

const PENDING_KEY = 'mugen-admin-reset-pending';

/** Whether the number typed opens the admin's row (spaces round it forgiven). */
export function adminUnlocks(typed: string): boolean {
  return typed.trim() === ADMIN_LOCK;
}

/** Asked twice and confirmed: written down, and the page started again from its title. */
export function requestSaveReset(): void {
  try {
    localStorage.setItem(PENDING_KEY, '1');
  } catch {
    /* without storage there is no save to keep either */
  }
  window.location.assign(window.location.pathname);
}

function deleteSave(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(APP_DB_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      request.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

/** On the way up: a reset asked for is done before anything opens the save. Whether one was. */
export async function runPendingReset(): Promise<boolean> {
  let pending = false;
  try {
    pending = localStorage.getItem(PENDING_KEY) === '1';
    if (pending) localStorage.removeItem(PENDING_KEY);
  } catch {
    return false;
  }
  if (!pending) return false;
  resetPlayClock();
  return deleteSave();
}
