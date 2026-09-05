// DEV ADMIN gate.
// Enabled in dev builds; a production build hides the entry and screens
// entirely unless VITE_ENABLE_DEV_ADMIN=1 is set at build time.

export const DEV_ADMIN_ENABLED =
  import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEV_ADMIN === '1';

/** MVP-only convenience lock. NOT production security. */
export const DEV_LOCK_CODE = '0909';

/**
 * Whether the lock has been opened during this run of the app.
 *
 * Module memory, and deliberately nothing else. Writing "the admin
 * unlocked it" to localStorage would survive the browser being closed,
 * which is the one thing a lock like this must not do: a shared or
 * borrowed phone would be unlocked forever by one past visit. Closing
 * the app asks again.
 */
let unlockedThisSession = false;

export function devUnlocked(): boolean {
  return DEV_ADMIN_ENABLED && unlockedThisSession;
}

export function markDevUnlocked(): void {
  unlockedThisSession = true;
}

/** For tests, and for a future "lock again" control. */
export function lockDevAgain(): void {
  unlockedThisSession = false;
}

/**
 * Whether what was typed opens it.
 *
 * Compared as a string, never as a number: "0909" parsed as a number
 * is 909, and a lock that accepts 909 is a different lock from the one
 * anybody was told about.
 */
export function isDevLockCode(entered: string): boolean {
  return entered === DEV_LOCK_CODE;
}
