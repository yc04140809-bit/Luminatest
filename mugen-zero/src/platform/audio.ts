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
import { SFX_ASSETS, SFX_GAIN, SFX_RETRIGGER_MS, type SfxId } from '../content/audio/sfx';

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

/**
 * How long the opening waits before it starts.
 *
 * A second, and only the opening: every other piece begins the moment
 * the player walks into the room it belongs to. The title is not a
 * room. It is a picture somebody has just arrived at, and music that
 * arrives at the same instant arrives ON TOP of that rather than with
 * it — the beat of quiet is what makes the first note land.
 *
 * It is a DELAY, not a schedule: whatever else happens in that second
 * — the player taps through to the prologue, the music is turned off,
 * a different piece is asked for — wins, because the timer checks
 * what the game is currently asking for rather than replaying what it
 * asked for a second ago.
 */
export const OPENING_START_DELAY_MS = 1000;

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
  private bgmDelay: ReturnType<typeof setTimeout> | null = null;
  private bgmOut: HTMLAudioElement | null = null;
  private gestureListening = false;
  /**
   * THE EFFECTS BUS, AFTER MASTER.
   *
   * One field, not two. There were briefly a `seVolume` and an
   * `sfxVolume` holding the same number, from the days when SE and SFX
   * were different words for the one slider. The panel has four buses
   * now and every one of them is a real number the player set, so the
   * duplicate went.
   */
  private sfxVolume = 0.8;
  /** MASTER, as last set. Kept only so the buses can be recomputed. */
  private masterVolume = 1;
  /**
   * Reserved, and read by nothing: no line is spoken yet.
   *
   * Held so that the day a voice track exists, the number it plays at
   * is already here and already the player's.
   */
  private voiceVolume = 0.8;
  /** When each sound last played, for the retrigger guard. */
  private sfxLastAt = new Map<SfxId, number>();
  private unlocked = false;
  private currentBgmId: BgmId | null = null;
  /** What was on before it. Reported, never used to decide. */
  private previousBgmId: BgmId | null = null;
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

  /**
   * The four buses, as the player has them.
   *
   * MASTER is folded in here and nowhere else: every field below is
   * the level a sound ACTUALLY plays at, so the rest of the manager
   * goes on reading one number per bus and there is no second place
   * that could forget to apply it. MASTER at zero is silence by the
   * same route as BGM at zero, which is the route already written.
   *
   * `master` and `voice` default so that the many callers who only
   * ever cared about music and effects still read correctly.
   */
  setVolumes(bgmVolume: number, sfxVolume: number, masterVolume = 1, voiceVolume = 0.8): void {
    this.masterVolume = clampVolume(masterVolume);
    bgmVolume = clampVolume(this.masterVolume * bgmVolume);
    this.bgmVolume = bgmVolume;
    this.sfxVolume = clampVolume(this.masterVolume * sfxVolume);
    this.voiceVolume = clampVolume(this.masterVolume * voiceVolume);
    // Not while a crossfade owns it: its volume is being driven on
    // purpose, and the fade sets the final level when it lands.
    if (this.bgm && !this.bgmFade) this.bgm.volume = clampVolume(bgmVolume);
    // TURNED DOWN TO NOTHING: HELD, NOT THROWN AWAY.
    //
    // It used to release the element, and that was a mid-track restart
    // with a slider in front of it: a player who dragged BGM through
    // zero and back came back to the top of the piece rather than to
    // the bar they were on. The element is paused instead — silent by
    // the same measure, since a paused element makes no sound — and
    // picked back up where it was when the slider comes off nought.
    if (bgmVolume <= 0) {
      this.endBgmFade();
      this.bgm?.pause();
    } else if (this.bgm) {
      // Turned back on: the same bar of the same piece.
      this.resumeHeld();
    } else if (this.currentBgmId) {
      // Nothing held — the scene asked while the music was off, or a
      // resume failed. Start what the scene says belongs here.
      this.startBgm(this.currentBgmId, { fade: true });
    }
    // The opening follows the same slider as everything else — there is
    // no second volume for it — but not while it is fading out, where
    // its volume is being driven towards zero on purpose.
    if (this.opening && !this.openingFade) this.opening.volume = bgmVolume;
    // Turned the music off mid-song: stop, do not merely go quiet.
    if (this.opening && bgmVolume <= 0) this.stopOpeningTheme();
  }

  /**
   * The four buses as they actually come out, MASTER already folded in.
   *
   * For looking at — a settings screen showing what a slider will do,
   * and the tests that check MASTER really is over the top of the
   * other three. Nothing in the game decides anything from it.
   */
  volumes(): { master: number; bgm: number; sfx: number; voice: number } {
    return {
      master: this.masterVolume,
      bgm: this.bgmVolume,
      sfx: this.sfxVolume,
      voice: this.voiceVolume,
    };
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
   * A phone that has been put away stops singing, and sings again when
   * it is picked back up.
   *
   * Paused rather than stopped, so coming back is the same piece from
   * the same place rather than a song starting over. What comes back is
   * whatever the game is asking for NOW — `resumeIfSilent` reads the
   * current answer, so a player who took a call in the forest and came
   * back to a fight comes back to the fight's music, not the forest's.
   *
   * The opening theme is deliberately not resumed. It is a song the
   * game waits on, and one that restarts itself halfway through after
   * an interruption is worse than one that quietly ends.
   */
  private watchVisibility(): void {
    if (this.watchingVisibility || typeof document === 'undefined') return;
    this.watchingVisibility = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.opening?.pause();
        this.bgm?.pause();
        return;
      }
      // AND BACK AGAIN — which is the half that was missing, and the
      // reason "the music never comes back" was reported as a bug in
      // the exploration BGM. The scene had restored it perfectly; the
      // ELEMENT was paused, by this handler or by the phone's own media
      // policy, and nothing ever asked it to play again.
      //
      // Only the room's own music: the opening theme is a song the game
      // waits for, and a song that resumes itself in the middle after a
      // phone call is worse than one that does not.
      this.resumeIfSilent();
    });
  }

  /**
   * Whether the piece we are holding is actually making a sound.
   *
   * NOT "is there an element". An element that exists and is paused is
   * silence, and every guard in here used to accept it as music — so a
   * page that had been hidden, a browser that suspended its media, or a
   * `play()` the autoplay policy refused left the game silent for the
   * rest of the session, with an element sitting there satisfying the
   * check. A fade counts as sounding: the incoming element is a tick
   * away from playing and must not be started twice.
   */
  private bgmIsSounding(): boolean {
    if (this.bgmFade || this.bgmDelay) return true;
    return !!this.bgm && !this.bgm.paused;
  }

  /**
   * Ask again for whatever the game is currently asking for.
   *
   * The scene is the truth about what should be playing, so there is
   * nothing to remember and nothing to restore FROM: this simply puts
   * the current answer back on the air if it is not on it. Safe to call
   * as often as anything likes — it does nothing at all when the music
   * is already sounding, is deliberately off, or is mid-fade.
   */
  resumeIfSilent(): void {
    if (!this.currentBgmId || !this.musicIsOn()) return;
    if (this.bgmIsSounding()) return;
    // THE PIECE WE ARE HOLDING IS PICKED BACK UP, NOT PLAYED AGAIN.
    if (this.resumeHeld()) return;
    this.startBgm(this.currentBgmId, { fade: false });
  }

  /**
   * Carry on with the piece already in hand, from the bar it is on.
   *
   * THIS IS THE DIFFERENCE BETWEEN RESUMING AND RESTARTING, and it is
   * the whole of a bug that was reported as "the music cuts off partway
   * and goes back to the top". A phone that is put away, locked, or
   * interrupted by a call pauses the element; every route back used to
   * build a NEW one, which is the same piece of music from nought —
   * so a player who glanced at a message two minutes into the forest
   * came back to the first bar of it.
   *
   * Returns whether there was something to carry on with, so the
   * caller knows whether it still has to start one.
   *
   * A `play()` the browser refuses DROPS the element rather than
   * leaving it held: the refusal usually means this element is no
   * longer usable, and one that stays held would be resumed again and
   * again forever. Letting it go means the next ask builds a fresh one,
   * which is the old behaviour and the right fallback.
   */
  private resumeHeld(): boolean {
    const held = this.bgm;
    if (!held || !held.src || held.ended) return false;
    if (!held.paused) return true;
    try {
      void Promise.resolve(held.play()).catch(() => {
        if (this.bgm === held) {
          this.release(held);
          this.bgm = null;
        }
      });
    } catch {
      this.release(held);
      this.bgm = null;
      return false;
    }
    return true;
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
    if (typeof document === 'undefined') return;
    // BEFORE the gesture guard, and before the unlocked one: a page
    // that is already unlocked still gets put away and picked back up,
    // and that is exactly the case where the music would otherwise stay
    // paused for the rest of the session.
    this.watchVisibility();
    if (this.gestureListening || this.unlocked) return;
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
   * What is on, what was on before it, and whether it is really
   * sounding.
   *
   * FOR LOOKING AT, NOT FOR DECIDING WITH. `previous` is a record of
   * what happened, and nothing reads it to work out what should play:
   * the scene is the truth about that, which is why coming out of a
   * fight needs nothing remembered — the player is back in the forest,
   * so the forest is what belongs there. A restore driven by a
   * remembered value is a second answer that can disagree with the
   * first, and the first is the one on screen.
   */
  bgmState(): { current: BgmId | null; previous: BgmId | null; sounding: boolean } {
    return {
      current: this.currentBgmId,
      previous: this.previousBgmId,
      sounding: this.bgmIsSounding(),
    };
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
    // SOUNDING, not merely existing — see `bgmIsSounding`. A paused
    // element used to satisfy this, and the music never came back.
    if (this.currentBgmId === id && (this.bgmIsSounding() || !this.unlocked)) return;
    // ASKED FOR AGAIN WHILE IT IS MERELY PAUSED — a screen that
    // re-rendered while the page was in the background, say. That is
    // not a scene change and must not sound like one: the piece we are
    // holding carries on rather than starting over.
    if (this.currentBgmId === id && this.musicIsOn() && this.resumeHeld()) return;
    if (this.currentBgmId !== id) this.previousBgmId = this.currentBgmId;
    this.currentBgmId = id;
    this.startBgm(id, { fade: true, wait: true });
  }

  /**
   * Actually put an element on the air, fading the last one out.
   *
   * Separate from `playBgm` because `unlock()` needs to start what was
   * already asked for WITHOUT the no-op guard above — at that moment
   * the id is already current and nothing is playing, which is exactly
   * the case the guard exists to swallow.
   */
  private startBgm(id: BgmId, { fade, wait = false }: { fade: boolean; wait?: boolean }): void {
    // A pending opening is cancelled by anything at all: this is the
    // next request arriving, and the one that was waiting is no longer
    // what the game wants.
    if (this.bgmDelay) {
      clearTimeout(this.bgmDelay);
      this.bgmDelay = null;
    }
    /**
     * THE OPENING, AND ONLY THE OPENING, WAITS A BEAT.
     *
     * `wait` is passed rather than worked out, and that is the whole
     * of why this is correct: the first version asked "is this the
     * opening, and is nothing playing?" — which is still true a second
     * later when the timer re-enters, so it set another timer, and the
     * music never started at all. A caller says whether it is asking
     * for the wait; the timer asks without it.
     *
     * It is a DELAY, not a schedule. A second later the game may want
     * something else entirely — the player tapped through to the
     * prologue, the music was turned off — so the timer checks what is
     * being asked for NOW rather than replaying what was asked for
     * then.
     */
    if (wait && id === 'OPENING') {
      this.retireCurrentBgm(false);
      this.bgmDelay = setTimeout(() => {
        this.bgmDelay = null;
        if (this.currentBgmId === 'OPENING' && !this.bgm) {
          this.startBgm('OPENING', { fade: true, wait: false });
        }
      }, OPENING_START_DELAY_MS);
      return;
    }
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
    if (this.currentBgmId) this.previousBgmId = this.currentBgmId;
    this.currentBgmId = null;
    if (this.bgmDelay) {
      clearTimeout(this.bgmDelay);
      this.bgmDelay = null;
    }
    this.endBgmFade();
    this.release(this.bgm);
    this.bgm = null;
  }

  playSe(id: SeId): void {
    const src = SE_ASSETS[id];
    if (!src || !this.unlocked) return;
    try {
      const audio = new Audio(src);
      audio.volume = this.sfxVolume;
      void audio.play().catch(() => {});
    } catch {
      /* ignore */
    }
  }

  /**
   * A SOUND, BY THE NAME OF THE MOMENT IT BELONGS TO.
   *
   * `playSfx('battle_slash_hit')`, from anywhere, and never
   * `new Audio(...)` in a component: one door, so "what can the game
   * make a noise about" has one answer, every sound goes through one
   * volume, and the day there is a MASTER / BGM / SFX / VOICE panel it
   * is wired here and nowhere else.
   *
   * Silence is the normal case today — no sounds are bundled — and it
   * is not an error. The asking is real from the first day, so the day
   * the files arrive nothing but the map changes.
   *
   * FIRED AND FORGOTTEN. A sound effect is not a piece of music: it is
   * not held, not tracked, not stopped, and a second one over the top
   * of the first is usually right. The one thing held back is the SAME
   * sound arriving again inside `SFX_RETRIGGER_MS`, because a fight at
   * twice speed asks for the same blow twice as often and the ear has
   * already heard it.
   */
  playSfx(id: SfxId): void {
    const src = SFX_ASSETS[id];
    if (!src || !this.unlocked || this.sfxVolume <= 0) return;
    const now = Date.now();
    const last = this.sfxLastAt.get(id) ?? 0;
    if (now - last < SFX_RETRIGGER_MS) return;
    this.sfxLastAt.set(id, now);
    try {
      const audio = new Audio(src);
      audio.volume = clampVolume(this.sfxVolume * (SFX_GAIN[id] ?? 1));
      void audio.play().catch(() => {
        /* refused, or no device — a sound effect is never worth an error */
      });
    } catch {
      /* ignore */
    }
  }
}

export const audioManager = new AudioManager();

/**
 * One sound, by the name of the moment it belongs to.
 *
 * The free function every screen actually calls, so that nothing in
 * the UI has to know there is a manager — `playSfx('ui_confirm')` is
 * the whole of the interface, and there is exactly one implementation
 * of it behind that name.
 */
export function playSfx(id: SfxId): void {
  audioManager.playSfx(id);
}
