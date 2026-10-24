import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * THE HANDOVER FROM THE THEME TO THE ROOM.
 *
 * On a real device the player reported the village going silent once
 * the opening theme finished. HOME's music is not missing — the scene
 * map has said `ALDEN_VILLAGE` all along and the file ships — so what
 * is in question is the HANDOVER: the theme holds the room while it
 * plays, and `finishOpening` is supposed to start whatever the game
 * has asked for by the time the song is over.
 *
 * `audio.test.ts` cannot see that path. It mocks `OPENING_THEME` as
 * null, so the theme channel is never used with a file in it, and its
 * fake element swallows `addEventListener`, so the `ended` that calls
 * `finishOpening` can never fire. This file supplies both.
 */
vi.mock('@mugen/assets', () => ({
  BGM_ASSETS: {
    OPENING: 'opening.mp3',
    KAOS_EVENT: 'kaos.mp3',
    ALDEN_VILLAGE: 'alden.mp3',
    TAVERN: 'tavern.mp3',
    GREENWOOD_FOREST: 'forest.mp3',
    NORMAL_BATTLE: 'battle.mp3',
  },
  // THE DIFFERENCE. The real manifest points this at the opening
  // recording; the other suite points it at nothing.
  MUSIC_ASSETS: { OPENING_THEME: 'theme.mp3' },
  SE_ASSETS: { select: null, memory: null, timeshift: null, reunion: null },
}));

const { AudioManager, BGM_FADE_MS } = await import('./audio');

/** A stand-in that actually keeps its listeners, so `ended` can happen. */
class FakeAudio {
  static made: FakeAudio[] = [];
  src: string;
  loop = false;
  volume = 1;
  playing = false;
  paused = true;
  currentTime = 0;
  private listeners = new Map<string, Set<() => void>>();
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
  addEventListener(type: string, fn: () => void) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: () => void) {
    this.listeners.get(type)?.delete(fn);
  }
  /** The song reaching its end, the way a browser reports it. */
  finish() {
    this.playing = false;
    this.paused = true;
    for (const fn of this.listeners.get('ended') ?? []) fn();
  }
}

const sounding = () => FakeAudio.made.filter((a) => a.playing && a.volume > 0);
const madeOf = (src: string) => FakeAudio.made.filter((a) => a.src === src);

beforeEach(() => {
  FakeAudio.made = [];
  vi.useFakeTimers();
  vi.stubGlobal('Audio', FakeAudio);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

/** Unlocked, music on — a player who has already touched the screen. */
function ready() {
  const manager = new AudioManager();
  manager.setVolumes(0.35, 0.8);
  manager.unlock();
  return manager;
}

/** Let a crossfade finish. */
function settle() {
  vi.advanceTimersByTime(BGM_FADE_MS * 2 + 50);
}

describe('the opening theme hands the room back', () => {
  /**
   * THE WHOLE JOURNEY A PLAYER MAKES, in the order they make it.
   *
   * 聴く on the theme screen, the title, the prologue, Kaos, and then
   * Alden — with the theme playing over all of it, because it is
   * longer than the walk. Then the song ends, and the village must be
   * there underneath it.
   */
  it('the village is playing once the song is over', () => {
    const manager = ready();

    const started = manager.playOpeningTheme();
    expect(started, 'the theme has a file and should start').toBe(true);
    const theme = madeOf('theme.mp3')[0];
    expect(theme.playing).toBe(true);
    expect(theme.loop, 'the theme plays once').toBe(false);

    // The screens the player walks through while it plays. Each asks
    // for its own music and each is held: two pieces at once would be
    // the bug this holding exists to prevent.
    manager.playBgm('OPENING'); // PROLOGUE
    manager.playBgm('KAOS_EVENT'); // …and then she speaks
    manager.playBgm('ALDEN_VILLAGE'); // HOME
    settle();
    expect(sounding().map((a) => a.src), 'only the theme, while it lasts').toEqual(['theme.mp3']);

    // The song ends on its own.
    theme.finish();
    settle();

    expect(
      sounding().map((a) => a.src),
      'the village must be playing when the theme is over',
    ).toEqual(['alden.mp3']);
    expect(madeOf('alden.mp3')[0].loop, 'a room does not stop having an atmosphere').toBe(true);
  });

  /** The same, for a player who presses SKIP instead of listening. */
  it('the village is playing after a skip, too', () => {
    const manager = ready();
    manager.playOpeningTheme();
    manager.playBgm('ALDEN_VILLAGE');
    manager.fadeOutOpeningTheme(200);
    vi.advanceTimersByTime(400);
    settle();
    expect(sounding().map((a) => a.src)).toEqual(['alden.mp3']);
  });

  /** And the handover does not double up if HOME asks again after it. */
  it('HOME asking again changes nothing', () => {
    const manager = ready();
    manager.playOpeningTheme();
    manager.playBgm('ALDEN_VILLAGE');
    madeOf('theme.mp3')[0].finish();
    settle();
    const before = madeOf('alden.mp3').length;
    manager.playBgm('ALDEN_VILLAGE');
    settle();
    expect(madeOf('alden.mp3').length, 'no second village').toBe(before);
    expect(sounding().map((a) => a.src)).toEqual(['alden.mp3']);
  });
});
