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

export class AudioManager {
  private bgmVolume = 0.6;
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
    if (this.bgm) this.bgm.volume = bgmVolume;
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
    if (audio) {
      try {
        audio.pause();
        audio.src = '';
      } catch {
        /* already gone */
      }
    }
    done?.();
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
    if (this.currentBgmId) this.playBgm(this.currentBgmId);
  }

  playBgm(id: BgmId): void {
    this.currentBgmId = id;
    const src = BGM_ASSETS[id];
    if (!src || !this.unlocked) return; // silence, not an error
    if (this.bgm) {
      this.bgm.pause();
      this.bgm = null;
    }
    try {
      const audio = new Audio(src);
      audio.loop = true;
      audio.volume = this.bgmVolume;
      void audio.play().catch(() => {
        /* autoplay refused — stay silent */
      });
      this.bgm = audio;
    } catch {
      this.bgm = null;
    }
  }

  stopBgm(): void {
    this.currentBgmId = null;
    this.bgm?.pause();
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
