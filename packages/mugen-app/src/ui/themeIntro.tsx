import { useEffect, useRef, useState } from 'react';
import { audioManager } from '../platform/audio';
import { isNativeShell } from '../platform/androidBack';
// The name as drawn (作者 2026-10-30: the title picture's lettering, cut out on black — mugen-zero-logo-blackplate).
import logo from '@mugen/assets/files/backgrounds/mugen-zero-logo-blackplate.webp';
import './themeIntro.css';

/**
 * 「また、ここで。」 BEFORE THE TITLE (2026-10-30 タスクC).
 *
 * Every launch begins here: on black, the name and the song's title, and the song played whole, once
 * (platform/audio.ts `playOpeningTheme` — MUSIC_ASSETS.OPENING_THEME, not looped, so no part of it is
 * repeated). Its end, or SKIP — on screen from the first launch — and the title, whose own piece
 * (TITLE_MAIN) starts only then: while the song plays nothing else is asked for (App: THEME_CHOICE is
 * silent while this is shown) and the player holds the room for it anyway, so the two never overlap.
 *
 * A browser will not play a note before the page is touched, so there it first asks for a tap
 * (「タップで開始」); the Android app may play at once (its WebView needs no gesture), so it does.
 * A song that cannot be played — none in the slot, music off, refused — goes straight on to the title.
 */
export function ThemeIntro({ onDone }: { onDone: () => void }) {
  const native = isNativeShell();
  const [phase, setPhase] = useState<'TAP' | 'PLAYING'>(native ? 'PLAYING' : 'TAP');
  const started = useRef(false);
  const done = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    doneRef.current();
  };
  const start = () => {
    if (started.current) return;
    started.current = true;
    audioManager.unlock();
    setPhase('PLAYING');
    if (!audioManager.playOpeningTheme(finish)) finish();
  };
  // The app plays at once; a browser waits for its tap.
  useEffect(() => {
    if (native) start();
  }, []);

  const skip = () => {
    if (!started.current) return finish();
    // Down over half a second, then the title (the theme's own exit calls `finish`, once).
    if (audioManager.isOpeningPlaying()) audioManager.fadeOutOpeningTheme();
    else finish();
  };

  return (
    <div
      className="screen theme-intro"
      data-testid="theme-intro"
      data-phase={phase}
      onClick={phase === 'TAP' ? start : undefined}
      role="presentation"
    >
      <div className="ti-words">
        <img className="ti-logo-art" src={logo} alt="" aria-hidden="true" data-testid="theme-intro-logo" />
        {/* The name in letters, for whoever reads the page without the picture (out of sight). */}
        <h1 className="ti-logo">MUGEN ZERO</h1>
        <p className="ti-song" data-testid="theme-intro-song">
          『また、ここで。』
        </p>
        {phase === 'TAP' && (
          <p className="ti-tap" data-testid="theme-intro-tap">
            タップで開始
          </p>
        )}
      </div>
      <button
        className="ti-skip"
        data-testid="theme-intro-skip"
        onClick={(e) => {
          e.stopPropagation();
          skip();
        }}
      >
        SKIP
      </button>
    </div>
  );
}

/**
 * The dev server's tests start at the title, as they always have: a cookie (`mugen_dev_theme_intro=off`,
 * set for the whole suite by playwright.config) passes this screen. DEV only — a build never reads it.
 */
export function themeIntroSkipped(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return document.cookie.split('; ').includes('mugen_dev_theme_intro=off');
  } catch {
    return false;
  }
}
