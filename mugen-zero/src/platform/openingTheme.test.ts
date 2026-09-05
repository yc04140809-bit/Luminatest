// Whether the opening theme is wanted. No sound is involved: this is
// the decision, tested apart from the thing that makes the noise.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../assets/manifest', () => ({
  MUSIC_ASSETS: { OPENING_THEME: '/test/opening.mp3' },
  BGM_ASSETS: { title: null, forest: null, battle: null, bakery: null },
  SE_ASSETS: { select: null, memory: null, timeshift: null, reunion: null },
}));

import { audioManager } from './audio';
import {
  forgetOpeningSession,
  openingPlayedThisSession,
  shouldPlayOpening,
  startOpeningTheme,
} from './openingTheme';

beforeEach(() => {
  forgetOpeningSession();
  vi.stubGlobal(
    'Audio',
    class {
      volume = 1;
      loop = false;
      constructor(public src: string) {}
      play() {
        return Promise.resolve();
      }
      pause() {}
      addEventListener() {}
    },
  );
  audioManager.stopOpeningTheme();
  audioManager.unlock();
  audioManager.setVolumes(0.6, 0.8);
});

afterEach(() => {
  audioManager.stopOpeningTheme();
  vi.unstubAllGlobals();
});

describe('shouldPlayOpening', () => {
  it('plays once per run of the app by default', () => {
    expect(shouldPlayOpening('ONCE_PER_SESSION', 0.6)).toBe(true);
  });

  it('never plays when the player has turned the opening off', () => {
    expect(shouldPlayOpening('OFF', 0.6)).toBe(false);
  });

  it('always plays under ALWAYS', () => {
    expect(shouldPlayOpening('ALWAYS', 0.6)).toBe(true);
  });

  it('obeys the existing BGM switch in every mode', () => {
    // Music off is music off. The opening does not get an exemption.
    expect(shouldPlayOpening('ONCE_PER_SESSION', 0)).toBe(false);
    expect(shouldPlayOpening('ALWAYS', 0)).toBe(false);
    expect(shouldPlayOpening('OFF', 0)).toBe(false);
  });
});

describe('startOpeningTheme', () => {
  it('plays the first time and stays quiet the second', () => {
    expect(startOpeningTheme('ONCE_PER_SESSION', 0.6)).toBe(true);
    audioManager.stopOpeningTheme();
    expect(openingPlayedThisSession()).toBe(true);
    expect(startOpeningTheme('ONCE_PER_SESSION', 0.6)).toBe(false);
  });

  it('plays every time under ALWAYS', () => {
    expect(startOpeningTheme('ALWAYS', 0.6)).toBe(true);
    audioManager.stopOpeningTheme();
    expect(startOpeningTheme('ALWAYS', 0.6)).toBe(true);
  });

  it('does not use up the one play when nothing actually began', () => {
    // Nothing can be made to sound here. The player must still get
    // their one opening later, once something can.
    vi.stubGlobal('Audio', function () {
      throw new Error('no audio in this environment');
    });
    expect(startOpeningTheme('ONCE_PER_SESSION', 0.6)).toBe(false);
    expect(openingPlayedThisSession()).toBe(false);
  });

  it('marks nothing when the music is off', () => {
    expect(startOpeningTheme('ONCE_PER_SESSION', 0)).toBe(false);
    expect(openingPlayedThisSession()).toBe(false);
  });

  it('does not survive being forgotten, so ADMIN can hear it again', () => {
    startOpeningTheme('ONCE_PER_SESSION', 0.6);
    audioManager.stopOpeningTheme();
    forgetOpeningSession();
    expect(openingPlayedThisSession()).toBe(false);
    expect(startOpeningTheme('ONCE_PER_SESSION', 0.6)).toBe(true);
  });
});
