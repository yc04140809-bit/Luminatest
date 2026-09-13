// AudioManager.
// Every slot may be empty (no third-party audio is bundled yet): a missing
// asset is silence, never a crash. Mobile browsers block autoplay, so
// nothing sounds until the player has interacted with the page.

import {
  BGM_ASSETS,
  MUSIC_ASSETS,
  SE_ASSETS,
  type BgmId,
  type SeId,
} from '../assets/manifest';

/**
 * How long the opening theme takes to get out of the way.
 *
 * Short enough that SKIP feels like it did something immediately, long
 * enough that it is not a cut. One number, here, rather than a literal
 * inside a handler.
 */
export const OPENING_FADE_MS = 500;
/** How often the fade steps. Smooth enough at this length. */
const OPENING_FADE_STEP_MS = 40;

/**
 * How long one piece of music takes to become another.
 *
 * A cut between two loops is the single most noticeable thing a game's
 * audio can do wrong: the player hears the SOFTWARE rather than the
 * place. Half a second is long enough not to be a cut and short enough
 * that walking into the forest still feels like arriving.
 */
export const BGM_FADE_MS = 500;
/** The same step as the opening's. One clock for all fading. */
const BGM_FADE_STEP_MS = 40;

/** Volumes are a browser API and it throws outside nought and one. */
function clampVolume(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export class AudioManager {
  /** Matches DEFAULT_SETTINGS.bgmVolume; App sets the real one on boot. */
  private bgmVolume = 0.35;
  /**
   * The piece now sounding, and the one on its way out.
   *
   * Two elements for the length of a crossfade and never three: a
   * third track arriving mid-fade ends the outgoing one at once rather
   * than stacking, because a player who walks quickly through three
   * rooms must not end up listening to three pieces of music.
   */
  private bgmFade: ReturnType<typeof setInterval> | null = null;
  private bgmOut: HTMLAudioElement | null = null;
  private gestureListening = false;
  private seVolume = 0.8;
  private unlocked = false;
  private currentBgmId: BgmId | null = null;
  private bgm: HTMLAudioElement | null = null;
  /**
   * The opening theme, while it is playing.
   *
   * Exactly one, ever: every entry point checks this first, so a second
   * tap, a re-render or a remount cannot start a second copy over the
   * top of the first. That is the whole of "no double playback".
   */
  private opening: HTMLAudioElement | null = null;
  private openingFade: ReturnType<typeof setInterval> | null = null;
  /** Called once when the theme stops, however it stopped. */
  private openingDone: (() => void) | null = null;
  private watchingVisibility = false;

  setVolumes(bgmVolume: number, seVolume: number): void {
    this.bgmVolume = bgmVolume;
    this.seVolume = seVolume;
    // Not while a crossfade owns it: its volume is being driven on
    // purpose, and the fade sets the final level when it lands.
    if (this.bgm && !this.bgmFade) this.bgm.volume = clampVolume(bgmVolume);
    // Turned the music off mid-piece: stop, do not merely go quiet —
    // a paused-at-zero element is still a piece of music waiting.
    if (bgmVolume <= 0) {
      this.endBgmFade();
      this.release(this.bgm);
      this.bgm = null;
    } else if (!this.bgm && this.currentBgmId) {
      // Turned back on: pick up where the scene says it should be.
      this.startBgm(this.currentBgmId, { fade: true });
    }
    // The opening follows the same slider as everything else — there is
    // no second volume for it — but not while it is fading out, where
    // its volume is being driven towards zero on purpose.
    if (this.opening && !this.openingFade) this.opening.volume = bgmVolume;
    // Turned the music off mid-song: stop, do not merely go quiet.
    if (this.opening && bgmVolume <= 0) this.stopOpeningTheme();
  }

  /** Whether music is allowed to make a sound at all. */
  private musicIsOn(): boolean {
    return this.unlocked && this.bgmVolume > 0;
  }

  /** Whether the opening theme is sounding right now. */
  isOpeningPlaying(): boolean {
    return this.opening !== null;
  }

  /**
   * Starts the opening theme, once.
   *
   * Returns whether anything actually began, so the caller can put its
   * SKIP control on screen only when there is something to skip. It
   * comes back false, quietly, for every ordinary reason: no song in
   * the slot yet, the music turned off, the page not yet touched, or
   * the theme already playing. None of those are errors.
   *
   * `onDone` fires exactly once — whether the song ended by itself, was
   * skipped, or was stopped by leaving the screen — so the thing that
   * happens next happens once. That is the same handler for the natural
   * end and for SKIP on purpose: two paths into one exit cannot
   * double-advance.
   */
  playOpeningTheme(onDone?: () => void): boolean {
    if (this.opening) return false;
    const src = MUSIC_ASSETS.OPENING_THEME;
    if (!src || !this.musicIsOn()) return false;
    try {
      const audio = new Audio(src);
      audio.loop = false;
      audio.volume = this.bgmVolume;
      audio.addEventListener('ended', () => this.finishOpening());
      // A browser that refuses to play is not a failure state: the
      // opening is simply silent, and the game carries on. No retry
      // loop, no second attempt, no muted-autoplay trick.
      void audio.play().catch(() => this.finishOpening());
      this.opening = audio;
      this.openingDone = onDone ?? null;
      this.watchVisibility();
      return true;
    } catch {
      this.opening = null;
      return false;
    }
  }

  /**
   * SKIP: down over half a second, then gone.
   *
   * Calling it twice is calling it once — the fade owns the element
   * from here, and the second call finds one already running.
   */
  fadeOutOpeningTheme(ms: number = OPENING_FADE_MS): void {
    const audio = this.opening;
    if (!audio) return;
    if (this.openingFade) return;
    const steps = Math.max(1, Math.round(ms / OPENING_FADE_STEP_MS));
    const from = audio.volume;
    let step = 0;
    this.openingFade = setInterval(() => {
      step++;
      const next = from * (1 - step / steps);
      audio.volume = Math.max(0, Math.min(1, next));
      if (step >= steps) this.finishOpening();
    }, OPENING_FADE_STEP_MS);
  }

  /** Immediately: leaving the screen, turning the music off, unmount. */
  stopOpeningTheme(): void {
    this.finishOpening();
  }

  /**
   * The one exit. Everything that ends the opening comes through here,
   * so the callback runs once and the element is always released.
   */
  private finishOpening(): void {
    if (this.openingFade) {
      clearInterval(this.openingFade);
      this.openingFade = null;
    }
    const audio = this.opening;
    const done = this.openingDone;
    this.opening = null;
    this.openingDone = null;
    this.release(audio);
    done?.();
    // The song is over, so the room it was played over may be heard.
    // Whatever screen the player is on by now asked for its music while
    // the theme held the room; this is that request, arriving late.
    if (this.currentBgmId && !this.bgm) this.startBgm(this.currentBgmId, { fade: true });
  }

  /**
   * A phone that has been put away stops singing.
   *
   * Paused rather than stopped, and never resumed on its own: coming
   * back to a game that suddenly bursts into song is worse than coming
   * back to silence, and resuming automatically is also the easiest way
   * to end up with two of them.
   */
  private watchVisibility(): void {
    if (this.watchingVisibility || typeof document === 'undefined') return;
    this.watchingVisibility = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.opening?.pause();
        this.bgm?.pause();
      }
    });
  }

  /** Called from a real user gesture; only then may audio start. */
  unlock(): void {
    if (this.unlocked) return;
    this.unlocked = true;
    // Whatever the game asked for while it could not be heard starts
    // now. This is what makes the title's music begin on the very tap
    // that leaves the title, rather than a screen later.
    if (this.currentBgmId) this.startBgm(this.currentBgmId, { fade: false });
  }

  /**
   * ANY first touch of the page unlocks, not only the two buttons that
   * used to call `unlock()` by hand.
   *
   * A phone will not make a sound until the person has done something,
   * and "something" is any pointer or key — not specifically the button
   * whose handler somebody remembered to wire. Listening once, at the
   * document, for the first of them is what makes the music reliably
   * start on a real device rather than only on the two routes somebody
   * remembered to wire.
   * The listeners remove themselves; there is nothing to clean up.
   */
  listenForFirstGesture(): void {
    if (this.gestureListening || this.unlocked || typeof document === 'undefined') return;
    this.gestureListening = true;
    const wake = () => {
      for (const type of ['pointerdown', 'touchstart', 'keydown'] as const) {
        document.removeEventListener(type, wake);
      }
      this.unlock();
    };
    for (const type of ['pointerdown', 'touchstart', 'keydown'] as const) {
      document.addEventListener(type, wake, { passive: true });
    }
  }

  /** Which piece the game has asked for, playing or waiting to. */
  currentBgm(): BgmId | null {
    return this.currentBgmId;
  }

  /**
   * Put this piece on, and leave it alone if it is already on.
   *
   * THE SECOND HALF OF THAT SENTENCE IS THE IMPORTANT ONE. A screen
   * asks for its music on every render, and React renders a screen
   * whenever anything at all about it changes — so a `playBgm` that
   * started a fresh element each time would restart the forest from
   * the top every time a leaf moved, and two of them would overlap for
   * as long as the fade. Asking for what is already playing is not an
   * event; it is the normal case, and it does nothing.
   */
  playBgm(id: BgmId): void {
    if (this.currentBgmId === id && (this.bgm || !this.unlocked)) return;
    this.currentBgmId = id;
    this.startBgm(id, { fade: true });
  }

  /**
   * Actually put an element on the air, fading the last one out.
   *
   * Separate from `playBgm` because `unlock()` needs to start what was
   * already asked for WITHOUT the no-op guard above — at that moment
   * the id is already current and nothing is playing, which is exactly
   * the case the guard exists to swallow.
   */
  private startBgm(id: BgmId, { fade }: { fade: boolean }): void {
    const src = BGM_ASSETS[id];
    // Whatever was playing stops either way: a scene with no music yet
    // is SILENT, not "the last room, still going".
    this.retireCurrentBgm(fade && !!src);
    // THE OPENING THEME GETS THE ROOM TO ITSELF. It is a song the game
    // waits for rather than room tone, and the title screen's own piece
    // would otherwise play underneath it — two pieces of music at once,
    // on the first screen anybody sees. The scene's music is not
    // cancelled, only held: `finishOpening` starts whatever the game
    // has asked for by the time the song is over.
    if (this.opening) return;
    if (!src || !this.musicIsOn()) return; // silence, not an error
    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = fade ? 0 : this.bgmVolume;
      void audio.play().catch(() => {
        /* autoplay refused — stay silent */
      });
      this.bgm = audio;
      if (fade) this.runBgmFade();
      return;
    } catch {
      this.bgm = null;
    }
  }

  /**
   * The outgoing piece: faded if there is something to fade into,
   * stopped outright otherwise.
   *
   * A fade already running is ended rather than joined — the element it
   * was lowering is dropped at once — because two overlapping fades is
   * how three pieces of music end up sounding at the same time.
   */
  private retireCurrentBgm(fade: boolean): void {
    if (this.bgmFade) {
      clearInterval(this.bgmFade);
      this.bgmFade = null;
      this.release(this.bgmOut);
      this.bgmOut = null;
    }
    const going = this.bgm;
    this.bgm = null;
    if (!going) return;
    if (!fade) {
      this.release(going);
      return;
    }
    this.bgmOut = going;
  }

  /** One timer, moving the outgoing piece down and the incoming up. */
  private runBgmFade(): void {
    const steps = Math.max(1, Math.round(BGM_FADE_MS / BGM_FADE_STEP_MS));
    const out = this.bgmOut;
    const outFrom = out?.volume ?? 0;
    const inTo = this.bgmVolume;
    let step = 0;
    this.bgmFade = setInterval(() => {
      step++;
      const through = Math.min(1, step / steps);
      if (out) out.volume = clampVolume(outFrom * (1 - through));
      if (this.bgm) this.bgm.volume = clampVolume(inTo * through);
      if (step >= steps) this.endBgmFade();
    }, BGM_FADE_STEP_MS);
  }

  private endBgmFade(): void {
    if (this.bgmFade) {
      clearInterval(this.bgmFade);
      this.bgmFade = null;
    }
    this.release(this.bgmOut);
    this.bgmOut = null;
    if (this.bgm) this.bgm.volume = clampVolume(this.bgmVolume);
  }

  /** Let go of an element for good. Never throws. */
  private release(audio: HTMLAudioElement | null): void {
    if (!audio) return;
    try {
      audio.pause();
      audio.src = '';
    } catch {
      /* already gone */
    }
  }

  stopBgm(): void {
    this.currentBgmId = null;
    this.endBgmFade();
    this.release(this.bgm);
    this.bgm = null;
  }

  playSe(id: SeId): void {
    const src = SE_ASSETS[id];
    if (!src || !this.unlocked) return;
    try {
      const audio = new Audio(src);
      audio.volume = this.seVolume;
      void audio.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }
}

export const audioManager = new AudioManager();
