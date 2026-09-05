// The opening theme, as the app sees it.
//
// Two things are kept apart here on purpose: the AudioManager knows how
// to make and stop a sound, openingTheme.ts knows whether one is
// wanted, and this knows only whether the SKIP control belongs on
// screen. No timeline, no cue list, no scene graph — the song plays,
// and one control can end it early.

import { useCallback, useEffect, useRef, useState } from 'react';
import { audioManager } from '../../platform/audio';
import {
  markOpeningPlayed,
  shouldPlayOpening,
  startOpeningTheme,
} from '../../platform/openingTheme';
import type { OpeningPlayMode } from '../../platform/settings';
import { OPENING_REHEARSAL_MS, openingRehearsal } from '../../dev/openingRehearsal';

export interface OpeningTheme {
  /** True only while there is something a SKIP would actually end. */
  playing: boolean;
  /** Call from the first real user gesture, and only from there. */
  begin: (mode: OpeningPlayMode, bgmVolume: number) => void;
  skip: () => void;
}

export function useOpeningTheme(): OpeningTheme {
  const [playing, setPlaying] = useState(false);
  const rehearsalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * The one exit.
   *
   * The song ending by itself, SKIP, the music being turned off and
   * leaving the app all arrive here, so the control comes off screen
   * once and by one route. Calling it twice — which SKIP does, once
   * directly and once when the fade finishes — is calling it once.
   */
  const end = useCallback(() => {
    if (rehearsalTimer.current) {
      clearTimeout(rehearsalTimer.current);
      rehearsalTimer.current = null;
    }
    setPlaying(false);
  }, []);

  const begin = useCallback(
    (mode: OpeningPlayMode, bgmVolume: number) => {
      // Already singing: a second tap is not a second song.
      if (audioManager.isOpeningPlaying()) return;
      // Asked before anything is attempted, so that the DEV stand-in
      // below is refused by exactly the same rules as a real song:
      // music off, opening off, or already had one this run.
      if (!shouldPlayOpening(mode, bgmVolume)) return;
      if (startOpeningTheme(mode, bgmVolume, end)) {
        setPlaying(true);
        return;
      }
      // Nothing began — no song in the slot, or autoplay refused. That
      // is silence and the game carries straight on, except in DEV
      // where the control itself is being looked at.
      if (!openingRehearsal()) return;
      markOpeningPlayed();
      setPlaying(true);
      rehearsalTimer.current = setTimeout(end, OPENING_REHEARSAL_MS);
    },
    [end],
  );

  const skip = useCallback(() => {
    // The sound leaves over half a second; the control leaves now, so
    // the tap is felt immediately and cannot be made twice.
    audioManager.fadeOutOpeningTheme();
    end();
  }, [end]);

  // Leaving the app stops the theme. Nothing survives the unmount.
  useEffect(
    () => () => {
      if (rehearsalTimer.current) clearTimeout(rehearsalTimer.current);
      audioManager.stopOpeningTheme();
    },
    [],
  );

  return { playing, begin, skip };
}
