import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEV_ADMIN_ENABLED,
  DEV_LOCK_CODE,
  devUnlocked,
  isDevLockCode,
  lockDevAgain,
  markDevUnlocked,
} from './devMode';

/**
 * The lock on the developer tools.
 *
 * Worth saying once more here, where somebody reading the tests will
 * see it: this is a PIN compared in the browser. It is a speed bump
 * that keeps an ordinary player from wandering into developer tools,
 * and it is not authentication. The real exclusion for a public build
 * is DEV_ADMIN_ENABLED, which removes the entry and the screens.
 */

beforeEach(() => lockDevAgain());

describe('the code', () => {
  it('is four characters, and the first of them is a zero', () => {
    expect(DEV_LOCK_CODE).toBe('0909');
    expect(DEV_LOCK_CODE).toHaveLength(4);
  });

  it('is compared as typed, so the leading zero cannot be lost', () => {
    // "0909" through a number is 909, and a lock that also opens on
    // 909 is a different lock from the one anybody was told about.
    expect(isDevLockCode('0909')).toBe(true);
    expect(isDevLockCode('909')).toBe(false);
    expect(isDevLockCode(String(Number('0909')))).toBe(false);
  });

  it('refuses everything else, including nearly-right', () => {
    for (const wrong of ['', ' 0909', '0909 ', '09090', '1234', 'ｏ909']) {
      expect(isDevLockCode(wrong)).toBe(false);
    }
  });
});

describe('having opened it', () => {
  it('starts shut', () => {
    expect(devUnlocked()).toBe(false);
  });

  it('stays open for the rest of this run of the app', () => {
    markDevUnlocked();
    expect(devUnlocked()).toBe(DEV_ADMIN_ENABLED);
  });

  it('is remembered in memory and nowhere else', () => {
    // The whole reason this is a module variable. A borrowed or shared
    // phone must not stay unlocked forever on the strength of one past
    // visit, and anything written to storage would do exactly that.
    markDevUnlocked();
    const stored = JSON.stringify(
      typeof localStorage === 'undefined' ? {} : { ...localStorage },
    );
    expect(stored).not.toContain('0909');
    expect(stored.toLowerCase()).not.toContain('unlock');
  });

  it('can be shut again', () => {
    markDevUnlocked();
    lockDevAgain();
    expect(devUnlocked()).toBe(false);
  });
});

describe('a build with the tools switched off', () => {
  it('answers "not unlocked" whatever happened before', () => {
    // devUnlocked() is gated on the build flag as well as the session,
    // so a production build cannot be talked into saying yes.
    markDevUnlocked();
    if (!DEV_ADMIN_ENABLED) expect(devUnlocked()).toBe(false);
    else expect(devUnlocked()).toBe(true);
  });
});
