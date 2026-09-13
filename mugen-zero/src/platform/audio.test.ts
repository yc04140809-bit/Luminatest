import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * SIX PIECES OF MUSIC THAT DO NOT EXIST YET.
 *
 * Every slot in the real manifest is null while no audio is bundled,
 * which is the correct shipping state and useless for testing a
 * player: nothing is ever constructed. So the manifest is stood in for
 * here — the six ids are the real ones, the sources are not — and what
 * is under test is the PLAYER's behaviour with music present, which is
 * the behaviour that has to be right on the day the files arrive.
 */
vi.mock('../assets/manifest', () => ({
  BGM_ASSETS: {
    OPENING: 'opening.mp3',
    KAOS_EVENT: 'kaos.mp3',
    ALDEN_VILLAGE: 'alden.mp3',
    TAVERN: 'tavern.mp3',
    GREENWOOD_FOREST: 'forest.mp3',
    // One deliberately still empty: a scene whose music has not been
    // delivered must be SILENT, not "whatever was playing before".
    NORMAL_BATTLE: null,
  },
  MUSIC_ASSETS: { OPENING_THEME: null },
  SE_ASSETS: { select: null, memory: null, timeshift: null, reunion: null },
}));

const { AudioManager, BGM_FADE_MS } = await import('./audio');

/** A stand-in for the browser's element, recording what was done to it. */
class FakeAudio {
  static made: FakeAudio[] = [];
  src: string;
  loop = false;
  volume = 1;
  playing = false;
  paused = false;
  constructor(src: string) {
    this.src = src;
    FakeAudio.made.push(this);
  }
  play() {
    this.playing = true;
    return Promise.resolve();
  }
  pause() {
    this.playing = false;
    this.paused = true;
  }
  addEventListener() {}
  removeEventListener() {}
}

/** Everything still making a sound. */
function sounding(): FakeAudio[] {
  return FakeAudio.made.filter((a) => a.playing && a.volume > 0);
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

function ready() {
  const manager = new AudioManager();
  manager.setVolumes(0.35, 0.8);
  manager.unlock();
  return manager;
}

describe('nothing sounds before the player has touched the page', () => {
  it('constructs no audio at all until it is unlocked', () => {
    const manager = new AudioManager();
    manager.playBgm('ALDEN_VILLAGE');
    expect(FakeAudio.made).toHaveLength(0);
  });

  /**
   * And then it starts what was asked for. This is what makes the
   * title's music begin on the very tap that leaves the title rather
   * than a screen later: the request was made while nothing could be
   * heard, and it was remembered.
   */
  it('starts what the game asked for while it could not be heard', () => {
    const manager = new AudioManager();
    manager.setVolumes(0.35, 0.8);
    manager.playBgm('OPENING');
    expect(FakeAudio.made).toHaveLength(0);
    manager.unlock();
    expect(FakeAudio.made).toHaveLength(1);
    expect(FakeAudio.made[0].src).toBe('opening.mp3');
    expect(FakeAudio.made[0].playing).toBe(true);
  });
});

describe('a piece of music, playing', () => {
  it('loops, because a room does not stop having an atmosphere', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    expect(FakeAudio.made[0].loop).toBe(true);
  });

  it('comes in at the volume the settings asked for', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(FakeAudio.made[0].volume).toBeCloseTo(0.35, 5);
  });

  /**
   * THE RE-RENDER RULE. A screen asks for its music every time React
   * draws it, and React draws it whenever anything at all changes. A
   * player walking through the forest must not restart the forest.
   */
  it('is not restarted by being asked for again', () => {
    const manager = ready();
    manager.playBgm('GREENWOOD_FOREST');
    const first = FakeAudio.made[0];
    for (let i = 0; i < 20; i++) manager.playBgm('GREENWOOD_FOREST');
    expect(FakeAudio.made).toHaveLength(1);
    expect(first.playing).toBe(true);
    expect(first.paused).toBe(false);
  });
});

describe('one piece becoming another', () => {
  it('crosses over rather than cutting', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    manager.playBgm('GREENWOOD_FOREST');
    // Halfway: both are audible, one rising and one falling. That is
    // what a crossfade IS, and a cut would show up here as one of them
    // being gone already.
    vi.advanceTimersByTime(BGM_FADE_MS / 2);
    const [alden, forest] = FakeAudio.made;
    expect(alden.volume).toBeGreaterThan(0);
    expect(alden.volume).toBeLessThan(0.35);
    expect(forest.volume).toBeGreaterThan(0);
    expect(forest.volume).toBeLessThan(0.35);
  });

  it('leaves exactly one of them sounding when it has finished', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('forest.mp3');
    expect(sounding()[0].volume).toBeCloseTo(0.35, 5);
  });

  /**
   * THE ONE THAT MATTERS ON A REAL DEVICE. A player taps through three
   * screens faster than a fade: village, tavern, forest. Without this,
   * each change adds an element and nothing takes one away — three
   * pieces of music, all looping, for the rest of the session.
   */
  it('never stacks, however fast the player moves', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(40);
    manager.playBgm('TAVERN');
    vi.advanceTimersByTime(40);
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(40);
    manager.playBgm('KAOS_EVENT');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('kaos.mp3');
  });

  /**
   * A scene whose music has not been delivered is SILENT. The
   * alternative — leaving the last room playing — is worse than
   * silence: it tells the player the fight is still the forest.
   */
  it('goes quiet for a scene with no music rather than carrying the last one in', () => {
    const manager = ready();
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    manager.playBgm('NORMAL_BATTLE'); // null slot in this stand-in
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(0);
  });
});

describe('leaving, and coming back', () => {
  it('stops outright when the screen has nothing to say', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    manager.stopBgm();
    expect(sounding()).toHaveLength(0);
    expect(manager.currentBgm()).toBeNull();
  });

  it('plays again after a stop, because the id was forgotten with it', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    manager.stopBgm();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(1);
  });

  it('stops rather than merely going quiet when the music is turned off', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    manager.setVolumes(0, 0.8);
    expect(sounding()).toHaveLength(0);
    // And turning it back on picks the scene up again.
    manager.setVolumes(0.5, 0.8);
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].volume).toBeCloseTo(0.5, 5);
  });

  it('follows the slider while it is playing', () => {
    const manager = ready();
    manager.playBgm('TAVERN');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    manager.setVolumes(0.8, 0.8);
    expect(FakeAudio.made[0].volume).toBeCloseTo(0.8, 5);
  });
});

describe('when the browser will not cooperate', () => {
  it('is silent rather than broken if the element cannot be made', () => {
    vi.stubGlobal('Audio', function () {
      throw new Error('no audio on this device');
    });
    const manager = ready();
    expect(() => manager.playBgm('ALDEN_VILLAGE')).not.toThrow();
    expect(() => manager.stopBgm()).not.toThrow();
  });

  it('is silent rather than broken if play() is refused', () => {
    class Refusing extends FakeAudio {
      play() {
        return Promise.reject(new Error('autoplay blocked'));
      }
    }
    vi.stubGlobal('Audio', Refusing);
    const manager = ready();
    expect(() => manager.playBgm('ALDEN_VILLAGE')).not.toThrow();
  });

  it('accepts volume changes and a stop with nothing loaded', () => {
    const manager = new AudioManager();
    expect(() => manager.setVolumes(0.3, 0.9)).not.toThrow();
    expect(() => manager.stopBgm()).not.toThrow();
    expect(() => manager.playSe('memory')).not.toThrow();
  });
});
