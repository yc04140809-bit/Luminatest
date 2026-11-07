import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * THE OPENING'S MUSIC, LET GO AND BROUGHT BACK (TIGS 2026-10-23).
 *
 * The opening's first note waits a beat of quiet (OPENING_START_DELAY_MS) so it
 * arrives with the screen rather than on top of it. At the power off the piece
 * is let go, and with the funny face it comes back — the power off was the
 * quiet, so it comes straight back rather than after another second.
 *
 * The music files are stood in for (as the Artifact's own audio test does):
 * what is under test is the player, not the files.
 */
vi.mock('@mugen/assets/music', () => ({
  BGM_ASSETS: { OPENING: 'opening.mp3', ALDEN_VILLAGE: 'alden.mp3', TITLE_MAIN: 'title.mp3' },
  MUSIC_ASSETS: { OPENING_THEME: null },
  SE_ASSETS: {},
}));
vi.mock('@mugen/assets/appMusic', () => ({ APP_BGM_ASSETS: {}, APP_BGM_FALLBACK: {} }));
vi.mock('@mugen/assets/sfx', () => ({ SFX_FILES: {} }));

const { AudioManager, BGM_FADE_MS, OPENING_START_DELAY_MS } = await import('./audio');

class FakeAudio {
  static made: FakeAudio[] = [];
  src: string;
  loop = false;
  volume = 1;
  playing = false;
  paused = true;
  ended = false;
  currentTime = 0;
  preload = '';
  constructor(src: string) {
    this.src = src;
    FakeAudio.made.push(this);
  }
  play() {
    this.playing = true;
    this.paused = false;
    return Promise.resolve();
  }
  pause() {
    this.playing = false;
    this.paused = true;
  }
  load() {}
  addEventListener() {}
  removeEventListener() {}
}

const sounding = () => FakeAudio.made.filter((a) => a.playing && a.volume > 0);

function ready() {
  const manager = new AudioManager();
  manager.setVolumes(0.35, 0.8);
  manager.unlock();
  FakeAudio.made = [];
  return manager;
}

beforeEach(() => {
  FakeAudio.made = [];
  vi.useFakeTimers();
  vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the opening piece', () => {
  it('waits its beat of quiet the first time it starts', () => {
    const manager = ready();
    manager.playBgm('OPENING');
    vi.advanceTimersByTime(OPENING_START_DELAY_MS - 50);
    expect(sounding()).toHaveLength(0);
    vi.advanceTimersByTime(100 + BGM_FADE_MS);
    expect(sounding().map((a) => a.src)).toEqual(['opening.mp3']);
  });

  it('let go at the power off, comes straight back with the funny face — no second beat of quiet', () => {
    const manager = ready();
    manager.playBgm('OPENING');
    vi.advanceTimersByTime(OPENING_START_DELAY_MS + BGM_FADE_MS);
    manager.fadeOutBgm(); // the power off (App's hush)
    vi.advanceTimersByTime(BGM_FADE_MS + 50);
    expect(sounding()).toHaveLength(0);
    manager.playBgm('OPENING'); // the funny face
    vi.advanceTimersByTime(BGM_FADE_MS + 50);
    expect(sounding().map((a) => a.src)).toEqual(['opening.mp3']);
  });

  it('waits again once something else has played in between (a new start, not a return)', () => {
    const manager = ready();
    manager.playBgm('OPENING');
    vi.advanceTimersByTime(OPENING_START_DELAY_MS + BGM_FADE_MS);
    manager.fadeOutBgm();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 50);
    manager.playBgm('OPENING');
    vi.advanceTimersByTime(BGM_FADE_MS + 50);
    expect(sounding().map((a) => a.src)).not.toContain('opening.mp3');
    vi.advanceTimersByTime(OPENING_START_DELAY_MS);
    expect(sounding().map((a) => a.src)).toContain('opening.mp3');
  });

  it('never plays twice at once, however often it is asked for', () => {
    const manager = ready();
    for (let i = 0; i < 5; i++) manager.playBgm('OPENING');
    vi.advanceTimersByTime(OPENING_START_DELAY_MS + BGM_FADE_MS);
    manager.fadeOutBgm();
    for (let i = 0; i < 5; i++) manager.playBgm('OPENING');
    vi.advanceTimersByTime(BGM_FADE_MS + 50);
    expect(sounding()).toHaveLength(1);
  });
});
