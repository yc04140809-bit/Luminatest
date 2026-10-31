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
vi.mock('@mugen/assets', () => ({
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

/**
 * And two sounds that do exist, because what is under test is the
 * PLAYER's behaviour with sound present — which is the behaviour that
 * has to be right on the day the files arrive.
 *
 * The folder is what decides which sounds exist now, so this stands in
 * for the folder. `battle_hit` is in SFX_PRELOAD, so unlocking builds
 * an element for it before any test does anything — which is the
 * point of priming and is why `ready()` forgets what it saw.
 */
vi.mock('@mugen/assets/sfx', () => ({
  SFX_FILES: { battle_hit: 'slash.mp3', ui_tap: 'tap.mp3' },
}));

const { AudioManager, BGM_FADE_MS, OPENING_START_DELAY_MS } = await import('./audio');
const { SFX_RETRIGGER_MS } = await import('@mugen/content/audio/sfx');

/** A stand-in for the browser's element, recording what was done to it. */
class FakeAudio {
  static made: FakeAudio[] = [];
  /**
   * HOW MANY TIMES EACH FILE WAS ACTUALLY STARTED.
   *
   * Counting ELEMENTS stopped answering "did the sound play?" the day
   * primed sounds began reusing one — the element already exists, so
   * nothing is constructed and the sound is heard anyway. Counting
   * plays answers it either way.
   */
  static plays: Record<string, number> = {};
  src: string;
  loop = false;
  volume = 1;
  playing = false;
  paused = true;
  ended = false;
  /**
   * WHERE IN THE PIECE IT IS. Not moved by this fake — nothing here
   * advances a clock — but a restart sets it back to nought, and that
   * is the difference the resume tests are actually about. A test that
   * only counted elements could not tell a resume from a rebuild that
   * happened to reuse the same file name.
   */
  currentTime = 0;
  constructor(src: string) {
    this.src = src;
    FakeAudio.made.push(this);
  }
  play() {
    this.playing = true;
    this.paused = false;
    FakeAudio.plays[this.src] = (FakeAudio.plays[this.src] ?? 0) + 1;
    return Promise.resolve();
  }
  pause() {
    this.playing = false;
    this.paused = true;
  }
  /**
   * PRIMING CALLS THIS, and a fake without it makes the manager throw
   * — which it catches, so the sound is quietly never primed and the
   * whole feature tests as a no-op. The real element has always had it.
   */
  preload = '';
  load() {}
  addEventListener() {}
  removeEventListener() {}
}

/** Everything still making a sound. */
function sounding(): FakeAudio[] {
  return FakeAudio.made.filter((a) => a.playing && a.volume > 0);
}

/** How many times that file was started since the last reset. */
const playsOf = (src: string) => FakeAudio.plays[src] ?? 0;

beforeEach(() => {
  FakeAudio.made = [];
  FakeAudio.plays = {};
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
  // UNLOCKING IS SETUP, NOT BEHAVIOUR. The first touch primes the
  // fight's sounds — that is what makes the first swing prompt — and
  // every test below counts the elements the MUSIC makes. So the
  // register is cleared here, once, rather than every test learning
  // to subtract the priming.
  FakeAudio.made = [];
  FakeAudio.plays = {};
  return manager;
}

/**
 * PRIMING: the fight's noises, fetched while nothing is happening.
 *
 * A swing is drawn on the frame its noise belongs to, and a sound
 * fetched at that moment arrives after it. So the first touch — the
 * title, the theme screen, nothing being timed — builds and loads the
 * handful the fight will need.
 */
describe('the fight’s sounds, made ready in advance', () => {
  it('builds them on the first touch, and not before it', () => {
    const manager = new AudioManager();
    manager.setVolumes(0.35, 0.8);
    expect(FakeAudio.made, 'nothing at all until the player touches').toHaveLength(0);
    manager.unlock();
    const primed = FakeAudio.made.filter((a) => a.src === 'slash.mp3');
    expect(primed, 'a delivered fight sound is fetched up front').toHaveLength(1);
    expect(primed[0].playing, 'fetched, not played').toBe(false);
  });

  it('touches nothing twice', () => {
    const manager = ready();
    manager.unlock();
    expect(FakeAudio.made.filter((a) => a.src === 'slash.mp3')).toHaveLength(0);
  });

  /** A primed sound is reused rather than rebuilt, which is the gain. */
  it('plays the one it already has', () => {
    const manager = ready();
    manager.playSfx('battle_hit');
    expect(playsOf('slash.mp3'), 'it sounded').toBe(1);
    expect(FakeAudio.made, 'and nothing was built to do it').toHaveLength(0);
  });

  /**
   * UNLESS IT IS STILL SOUNDING. Two blows landing together are two
   * noises; rewinding the first would make them one.
   */
  it('builds a second only when the first is still going', () => {
    const manager = ready();
    manager.playSfx('battle_hit');
    vi.advanceTimersByTime(SFX_RETRIGGER_MS + 10);
    manager.playSfx('battle_hit');
    expect(FakeAudio.made, 'the overlap gets an element of its own').toHaveLength(1);
  });
});

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
    // The music it was asked for, alongside whatever the touch primed.
    const music = FakeAudio.made.filter((a) => a.src === 'opening.mp3');
    expect(music).toHaveLength(1);
    expect(music[0].playing).toBe(true);
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

  /**
   * SILENT AT NOUGHT, AND STILL ON THE SAME BAR.
   *
   * This used to release the element, which is a mid-piece restart
   * with a slider in front of it: drag BGM through zero and back and
   * the forest began again from the top. Silence is what turning it
   * off has to mean; starting over is not.
   */
  it('goes quiet without losing its place when the music is turned off', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    const piece = sounding()[0];
    piece.currentTime = 61;

    manager.setVolumes(0, 0.8);
    expect(sounding(), 'nothing is audible at nought').toHaveLength(0);

    // And turning it back on is the same element, on the same bar.
    manager.setVolumes(0.5, 0.8);
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0]).toBe(piece);
    expect(sounding()[0].currentTime, 'the bar it was on').toBe(61);
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

/**
 * THE OPENING WAITS A BEAT, AND NOTHING ELSE DOES.
 *
 * A second of quiet before the first note, so the music arrives WITH
 * the title rather than on top of it. It is a delay and not a
 * schedule: whatever the game wants a second later is what happens.
 */
describe('the beat of quiet before the opening', () => {
  it('does not sound for about a second, and then does', () => {
    const manager = ready();
    manager.playBgm('OPENING');
    expect(sounding()).toHaveLength(0);
    vi.advanceTimersByTime(OPENING_START_DELAY_MS - 50);
    expect(sounding(), 'still quiet just before the beat is up').toHaveLength(0);
    vi.advanceTimersByTime(100 + BGM_FADE_MS);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('opening.mp3');
  });

  it('is the opening\'s alone: every other room begins at once', () => {
    const manager = ready();
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(BGM_FADE_MS + 50);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('alden.mp3');
  });

  /**
   * The case that makes this a delay. A player who taps straight past
   * the title gets the room they walked into, not the piece that was
   * still waiting to start behind them.
   */
  it('is cancelled by whatever the player does in that second', () => {
    const manager = ready();
    manager.playBgm('OPENING');
    vi.advanceTimersByTime(400);
    manager.playBgm('ALDEN_VILLAGE');
    vi.advanceTimersByTime(OPENING_START_DELAY_MS + BGM_FADE_MS);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('alden.mp3');
  });

  it('is cancelled by stopping, and leaves nothing behind to fire', () => {
    const manager = ready();
    manager.playBgm('OPENING');
    manager.stopBgm();
    vi.advanceTimersByTime(OPENING_START_DELAY_MS + BGM_FADE_MS);
    expect(sounding()).toHaveLength(0);
  });

  /**
   * And the unlock case, which is the one a phone actually takes: the
   * title asks for its music while nothing can be heard, the player
   * taps, and the beat of quiet runs from THERE.
   */
  it('runs from the first touch when the page was not yet unlocked', () => {
    const manager = new AudioManager();
    manager.setVolumes(0.35, 0.8);
    manager.playBgm('OPENING');
    expect(FakeAudio.made).toHaveLength(0);
    manager.unlock();
    // Unlock starts what was asked for without a fade, and without the
    // wait: the beat of quiet has already been served by the player
    // taking a second to touch the screen.
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('opening.mp3');
  });
});

/**
 * THE MUSIC COMING BACK.
 *
 * Reported as "the exploration BGM does not restore after a fight",
 * and the scene had been restoring it perfectly the whole time: what
 * failed was the ELEMENT. A page that has been hidden, a phone that
 * suspended its media, an autoplay policy that refused a `play()` —
 * all three leave an element that exists and is silent, and every
 * guard in here used to accept that as music. The game then sat there
 * quiet for the rest of the session with nothing asking again.
 */
describe('an element that exists and is silent', () => {
  it('is not mistaken for music when the same piece is asked for again', () => {
    const manager = ready();
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    const first = FakeAudio.made[0];
    expect(first.playing).toBe(true);

    // The phone takes it away — a call, a lock screen, another app.
    first.pause();
    expect(manager.bgmState().sounding).toBe(false);

    // Asking for the same forest again now DOES something, where it
    // used to be swallowed as "already playing".
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('forest.mp3');
  });

  it('is put back on the air by asking, without being asked which piece', () => {
    const manager = ready();
    manager.playBgm('TAVERN');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    FakeAudio.made[0].pause();
    expect(sounding()).toHaveLength(0);

    manager.resumeIfSilent();
    vi.advanceTimersByTime(100);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('tavern.mp3');
  });

  /**
   * AND IT CARRIES ON RATHER THAN STARTING AGAIN.
   *
   * The bug this is here for was reported as "the music cuts off
   * partway through and goes back to the beginning", and on a phone
   * that is exactly what it was: the page is hidden, the element is
   * paused, and every route back used to build a NEW element — which
   * is the same piece of music from nought. A player who glanced at a
   * message two minutes into the forest came back to the first bar.
   */
  it('carries the piece on from where it was, rather than starting it again', () => {
    const manager = ready();
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    const piece = sounding()[0];
    piece.currentTime = 127.5;
    const made = FakeAudio.made.length;

    // The phone is put away, and picked back up.
    piece.pause();
    manager.resumeIfSilent();
    vi.advanceTimersByTime(100);

    expect(FakeAudio.made, 'no second copy of the piece').toHaveLength(made);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0]).toBe(piece);
    expect(sounding()[0].currentTime, 'the bar it was on').toBe(127.5);
  });

  /**
   * The same, by the other door: a screen that re-rendered while the
   * page was in the background asks for its own music again. That is
   * not a scene change and must not sound like one.
   */
  it('does not restart the piece when the scene asks for it again while paused', () => {
    const manager = ready();
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    const piece = sounding()[0];
    piece.currentTime = 44;
    const made = FakeAudio.made.length;

    piece.pause();
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);

    expect(FakeAudio.made).toHaveLength(made);
    expect(sounding()[0]).toBe(piece);
    expect(sounding()[0].currentTime).toBe(44);
  });

  /**
   * A DIFFERENT piece is still a change, paused or not: walking out of
   * the forest into another room is a scene change and sounds like one.
   */
  it('still changes piece when the scene does, even from a paused one', () => {
    const manager = ready();
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    FakeAudio.made[0].pause();

    manager.playBgm('TAVERN');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(sounding()).toHaveLength(1);
    expect(sounding()[0].src).toBe('tavern.mp3');
  });

  it('does nothing at all when the music is already sounding', () => {
    const manager = ready();
    manager.playBgm('TAVERN');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    const made = FakeAudio.made.length;
    manager.resumeIfSilent();
    manager.resumeIfSilent();
    expect(FakeAudio.made).toHaveLength(made);
  });

  it('does nothing when the music is deliberately off', () => {
    const manager = ready();
    manager.playBgm('TAVERN');
    manager.setVolumes(0, 0.8);
    const made = FakeAudio.made.length;
    manager.resumeIfSilent();
    expect(FakeAudio.made).toHaveLength(made);
    expect(sounding()).toHaveLength(0);
  });
});

/**
 * WHAT IS ON, AND WHAT WAS ON. For looking at — `previous` is a record
 * of what happened and nothing decides with it. The scene is the truth
 * about what should play, which is why coming out of a fight needs
 * nothing remembered.
 */
describe('MASTER, over the top of the other three', () => {
  it('multiplies every bus, and is not a fourth thing to remember', () => {
    const manager = new AudioManager();
    manager.setVolumes(0.5, 0.8, 0.5, 0.6);
    const v = manager.volumes();
    expect(v.master).toBe(0.5);
    expect(v.bgm).toBeCloseTo(0.25);
    expect(v.sfx).toBeCloseTo(0.4);
    expect(v.voice).toBeCloseTo(0.3);
  });

  it('at zero is silence, by the same route BGM at zero already was', () => {
    const manager = new AudioManager();
    manager.setVolumes(0.8, 0.8, 0);
    expect(manager.volumes().bgm).toBe(0);
    expect(manager.volumes().sfx).toBe(0);
  });

  it('leaves the buses alone when nobody has said otherwise', () => {
    // The many callers that only ever cared about music and effects
    // must go on reading correctly: MASTER defaults to all the way up.
    const manager = new AudioManager();
    manager.setVolumes(0.35, 0.8);
    expect(manager.volumes().master).toBe(1);
    expect(manager.volumes().bgm).toBeCloseTo(0.35);
    expect(manager.volumes().sfx).toBeCloseTo(0.8);
  });

  it('never lets a bus out above one, whatever it is handed', () => {
    const manager = new AudioManager();
    manager.setVolumes(2, 2, 2);
    const v = manager.volumes();
    expect(v.bgm).toBe(1);
    expect(v.sfx).toBe(1);
  });
});

describe('the state, as something that can be looked at', () => {
  it('names the piece now and the piece before it', () => {
    const manager = ready();
    expect(manager.bgmState()).toEqual({ current: null, previous: null, sounding: false });
    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(manager.bgmState().current).toBe('GREENWOOD_FOREST');
    expect(manager.bgmState().previous).toBeNull();
    expect(manager.bgmState().sounding).toBe(true);

    manager.playBgm('NORMAL_BATTLE'); // no file in the stand-in: silence
    expect(manager.bgmState().current).toBe('NORMAL_BATTLE');
    expect(manager.bgmState().previous).toBe('GREENWOOD_FOREST');

    manager.playBgm('GREENWOOD_FOREST');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    expect(manager.bgmState().current).toBe('GREENWOOD_FOREST');
    expect(manager.bgmState().previous).toBe('NORMAL_BATTLE');
  });

  it('does not count asking for the same piece as a change', () => {
    const manager = ready();
    manager.playBgm('TAVERN');
    vi.advanceTimersByTime(BGM_FADE_MS + 100);
    manager.playBgm('TAVERN');
    manager.playBgm('TAVERN');
    expect(manager.bgmState().previous).toBeNull();
  });
});

/**
 * SOUND EFFECTS — fired and forgotten, and one door for all of them.
 */
describe('a sound, by the name of the moment it belongs to', () => {
  it('plays, and is not held on to', () => {
    const manager = ready();
    manager.playSfx('battle_hit');
    expect(playsOf('slash.mp3')).toBe(1);
    // Whichever element carried it — a primed one or a fresh one — a
    // sound effect is never a loop.
    for (const a of FakeAudio.made) expect(a.loop, 'a sound effect never loops').toBe(false);
  });

  it('is silent, and not an error, for a sound nobody has delivered', () => {
    const manager = ready();
    expect(() => manager.playSfx('battle_win')).not.toThrow();
    expect(FakeAudio.made).toHaveLength(0);
  });

  it('says nothing before the player has touched the page', () => {
    const manager = new AudioManager();
    manager.setVolumes(0.35, 0.8);
    manager.playSfx('battle_hit');
    expect(FakeAudio.made).toHaveLength(0);
  });

  it('is silent when the effects are turned off', () => {
    const manager = ready();
    manager.setVolumes(0.35, 0);
    manager.playSfx('battle_hit');
    expect(FakeAudio.made).toHaveLength(0);
  });

  /**
   * Twice speed asks for the same blow twice as often, and a sound on
   * every one of them is a machine-gun rather than a sword. The second
   * inside the window simply does not play — the ear heard the first.
   */
  it('holds back the same sound arriving again too soon', () => {
    const manager = ready();
    manager.playSfx('battle_hit');
    manager.playSfx('battle_hit');
    manager.playSfx('battle_hit');
    expect(playsOf('slash.mp3'), 'three asks, one sword').toBe(1);
  });

  it('does not hold back a DIFFERENT sound in the same moment', () => {
    const manager = ready();
    manager.playSfx('battle_hit');
    manager.playSfx('ui_tap');
    expect(playsOf('slash.mp3')).toBe(1);
    expect(playsOf('tap.mp3')).toBe(1);
  });

  it('plays it again once the window has passed', () => {
    const manager = ready();
    manager.playSfx('battle_hit');
    vi.advanceTimersByTime(400);
    manager.playSfx('battle_hit');
    expect(playsOf('slash.mp3')).toBe(2);
  });

  /** A sound trimmed in the table is quieter than the slider alone. */
  it('trims the ones that would wear a player out', () => {
    const manager = ready();
    manager.setVolumes(0.35, 1);
    manager.playSfx('ui_tap');
    const tap = FakeAudio.made.find((a) => a.src === 'tap.mp3')!;
    expect(tap.volume).toBeCloseTo(0.6, 5);
  });

  it('is never worth an error, however badly the browser behaves', () => {
    vi.stubGlobal('Audio', function () {
      throw new Error('no audio on this device');
    });
    const manager = ready();
    expect(() => manager.playSfx('battle_hit')).not.toThrow();
  });
});
