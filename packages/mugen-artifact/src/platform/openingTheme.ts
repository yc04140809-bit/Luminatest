// Whether the opening theme should play right now.
//
// Kept apart from the audio manager on purpose: the manager knows how
// to make a sound, and this knows whether one is wanted. The rule is
// the sort of thing that changes on somebody's opinion, and it should
// be changeable without going anywhere near an Audio element.

import { audioManager } from './audio';
import type { OpeningPlayMode } from './settings';

/**
 * Whether it has already played during this run of the app.
 *
 * Module memory, deliberately not storage. "Once per session" means
 * once per opening of the app — closing it and coming back is a new
 * session and gets the theme again, which is what a session means to
 * the person holding the phone.
 */
let playedThisSession = false;

export function openingPlayedThisSession(): boolean {
  return playedThisSession;
}

/** For tests, and for an ADMIN preview that wants to hear it again. */
export function forgetOpeningSession(): void {
  playedThisSession = false;
}

/**
 * Counts this run's opening as spent without playing one.
 *
 * The one caller is the DEV stand-in for a song that does not exist
 * yet: it stands in for the playing as well as for the sound, so that
 * "once per run" behaves the same whether or not there is a file.
 */
export function markOpeningPlayed(): void {
  playedThisSession = true;
}

/**
 * Whether the theme is wanted, before anybody tries to make a sound.
 *
 * Three states, and the music switch on top of all of them: somebody
 * who turned the music off gets no opening either. An opening that
 * ignores the volume slider is the single rudest thing a phone game
 * can do.
 */
export function shouldPlayOpening(mode: OpeningPlayMode, bgmVolume: number): boolean {
  if (bgmVolume <= 0) return false;
  if (mode === 'OFF') return false;
  if (mode === 'ALWAYS') return true;
  return !playedThisSession;
}

/**
 * Plays it if it is wanted, and says whether anything started.
 *
 * The session is marked the moment it actually begins, not when it is
 * asked for — a refused autoplay or an empty slot must not use up the
 * one play somebody was going to get.
 */
export function startOpeningTheme(
  mode: OpeningPlayMode,
  bgmVolume: number,
  onDone?: () => void,
): boolean {
  if (!shouldPlayOpening(mode, bgmVolume)) return false;
  const started = audioManager.playOpeningTheme(onDone);
  if (started) playedThisSession = true;
  return started;
}
