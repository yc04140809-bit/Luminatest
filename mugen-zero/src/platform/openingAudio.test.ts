// The opening theme's audio behaviour, with a song in the slot.
//
// There is no real song yet, so the manifest is mocked here to put one
// there: without it playOpeningTheme can only ever be tested returning
// false, which proves nothing about the part that matters — that the
// thing ends exactly once, however it ends.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../assets/manifest', () => ({
  MUSIC_ASSETS: { OPENING_THEME: '/test/opening.mp3' },
  BGM_ASSETS: { title: null, forest: null, battle: null, bakery: null },
  SE_ASSETS: { select: null, memory: null, timeshift: null, reunion: null },
}));

import { AudioManager, OPENING_FADE_MS } from './audio';

interface FakeAudio {
  src: string;
  volume: number;
  loop: boolean;
  paused: boolean;
  play: () => Promise<void>;
  pause: () => void;
  addEventListener: (type: string, fn: () => void) => void;
  fire: (type: string) => void;
}

let made: FakeAudio[] = [];

function installFakeAudio(): void {
  made = [];
  vi.stubGlobal(
    'Audio',
    class {
      src: string;
      volume = 1;
      loop = false;
      paused = false;
      private handlers: Record<string, (() => void)[]> = {};
      constructor(src: string) {
        this.src = src;
        made.push(this as unknown as FakeAudio);
      }
      play() {
        return Promise.resolve();
      }
      pause() {
        this.paused = true;
      }
      addEventListener(type: string, fn: () => void) {
        (this.handlers[type] ??= []).push(fn);
      }
      fire(type: string) {
        for (const fn of this.handlers[type] ?? []) fn();
      }
    },
  );
}

beforeEach(() => {
  installFakeAudio();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function playing(): AudioManager {
  const manager = new AudioManager();
  manager.unlock();
  manager.setVolumes(0.6, 0.8);
  return manager;
}

describe('AudioManager — opening theme', () => {
  it('does not start before a user gesture has unlocked audio', () => {
    const manager = new AudioManager();
    manager.setVolumes(0.6, 0.8);
    expect(manager.playOpeningTheme()).toBe(false);
    expect(made).toHaveLength(0);
  });

  it('starts once and reports that it did', () => {
    const manager = playing();
    expect(manager.playOpeningTheme()).toBe(true);
    expect(manager.isOpeningPlaying()).toBe(true);
    expect(made).toHaveLength(1);
    expect(made[0].loop).toBe(false);
  });

  it('never starts a second copy over the first', () => {
    const manager = playing();
    manager.playOpeningTheme();
    expect(manager.playOpeningTheme()).toBe(false);
    expect(made).toHaveLength(1);
  });

  it('stays silent when the music volume is zero', () => {
    const manager = new AudioManager();
    manager.unlock();
    manager.setVolumes(0, 0.8);
    expect(manager.playOpeningTheme()).toBe(false);
    expect(made).toHaveLength(0);
  });

  it('follows the existing BGM volume rather than a volume of its own', () => {
    const manager = playing();
    manager.playOpeningTheme();
    expect(made[0].volume).toBe(0.6);
    manager.setVolumes(0.2, 0.8);
    expect(made[0].volume).toBeCloseTo(0.2);
  });

  it('stops — not merely quietens — when the music is turned off mid-song', () => {
    const manager = playing();
    const done = vi.fn();
    manager.playOpeningTheme(done);
    manager.setVolumes(0, 0.8);
    expect(manager.isOpeningPlaying()).toBe(false);
    expect(made[0].paused).toBe(true);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('calls back exactly once when the song ends by itself', () => {
    const manager = playing();
    const done = vi.fn();
    manager.playOpeningTheme(done);
    made[0].fire('ended');
    expect(done).toHaveBeenCalledTimes(1);
    expect(manager.isOpeningPlaying()).toBe(false);
  });

  it('fades out over the shared constant and then calls back once', () => {
    const manager = playing();
    const done = vi.fn();
    manager.playOpeningTheme(done);
    manager.fadeOutOpeningTheme();
    // Still sounding part-way through, and quieter than it started.
    vi.advanceTimersByTime(OPENING_FADE_MS / 2);
    expect(manager.isOpeningPlaying()).toBe(true);
    expect(made[0].volume).toBeLessThan(0.6);
    expect(done).not.toHaveBeenCalled();
    vi.advanceTimersByTime(OPENING_FADE_MS);
    expect(manager.isOpeningPlaying()).toBe(false);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire when SKIP is pressed twice', () => {
    const manager = playing();
    const done = vi.fn();
    manager.playOpeningTheme(done);
    manager.fadeOutOpeningTheme();
    manager.fadeOutOpeningTheme();
    vi.advanceTimersByTime(OPENING_FADE_MS * 2);
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('does not double-fire when the song also ends during a fade', () => {
    const manager = playing();
    const done = vi.fn();
    manager.playOpeningTheme(done);
    manager.fadeOutOpeningTheme();
    vi.advanceTimersByTime(OPENING_FADE_MS * 2);
    made[0].fire('ended'); // a late 'ended' from the element we released
    expect(done).toHaveBeenCalledTimes(1);
  });

  it('stopping an opening that is not playing is harmless', () => {
    const manager = playing();
    expect(() => manager.stopOpeningTheme()).not.toThrow();
    expect(() => manager.fadeOutOpeningTheme()).not.toThrow();
  });

  it('can play again after it has finished, so ALWAYS is possible', () => {
    const manager = playing();
    manager.playOpeningTheme();
    manager.stopOpeningTheme();
    expect(manager.playOpeningTheme()).toBe(true);
    expect(made).toHaveLength(2);
  });
});
