import { Component, useEffect, useState, type ErrorInfo, type ReactNode } from 'react';
import { audioManager } from '../../platform/audio';

/**
 * エラー時の受け皿 (A3, 作者採用 2026-11-04).
 *
 * If a screen breaks while it is being drawn, React would leave the page blank — a judge on their own phone, with
 * nothing to press. Here the whole game is caught instead: a quiet screen says so, that what was played is kept
 * (every answer and every day is written to the save as it happens), and one button goes back to the title, where
 * 「つづきから」 takes it up again. 「また、ここで。」 is not played again on the way: it was heard this launch.
 *
 * What broke is kept on the device (the last one only, `mugen-last-error`) and shown small, so it can be told.
 * Written to stand on its own: nothing here may be what broke.
 */
const LAST_ERROR_KEY = 'mugen-last-error';
const BACK_FROM_CRASH_KEY = 'mugen-back-from-crash';

export interface CrashRecord {
  at: string;
  message: string;
  stack: string;
  /** Where it was caught: a screen being drawn (and the crash screen shown), or one that went unseen (B3). */
  kind?: CrashKind;
}

/** RENDER: a screen broke while drawn. ERROR / PROMISE: an error nothing caught, the game going on (B3). */
export type CrashKind = 'RENDER' | 'ERROR' | 'PROMISE';

export function recordCrash(error: unknown, componentStack = '', kind: CrashKind = 'RENDER'): CrashRecord {
  const e = error instanceof Error ? error : new Error(String(error));
  const record = {
    at: new Date().toISOString(),
    message: e.message.slice(0, 300),
    stack: `${e.stack ?? ''}\n${componentStack}`.slice(0, 2000),
    kind,
  };
  try {
    localStorage.setItem(LAST_ERROR_KEY, JSON.stringify(record));
  } catch {
    /* blocked storage: shown, not kept */
  }
  return record;
}

/**
 * NOT EVERYTHING THAT GOES WRONG BREAKS A SCREEN (B3, 作者採用 2026-11-06): an error in what a button does, or in
 * something that finishes later, leaves the game going and the page as it was — and was kept nowhere. Kept now, as
 * the last error (the same record), the screen untouched. Not the harmless ones a browser says on its own (a sound
 * not allowed before the first touch, a sound cut off by the next, a layout's resize loop): those would overwrite
 * the error worth telling.
 */
export function isHarmless(error: unknown): boolean {
  const name = error instanceof Error || error instanceof DOMException ? error.name : '';
  const message = error instanceof Error || error instanceof DOMException ? error.message : String(error ?? '');
  return name === 'NotAllowedError' || name === 'AbortError' || /ResizeObserver loop/.test(message);
}

let listening = false;
export function listenForStrayErrors(target: Window = window): void {
  if (listening) return;
  listening = true;
  target.addEventListener('error', (e) => {
    // A picture or a sound that did not load is an element's own event, not a script error.
    if (!(e instanceof ErrorEvent)) return;
    const error = e.error ?? e.message;
    if (!isHarmless(error)) recordCrash(error, e.filename ? `at ${e.filename}:${e.lineno}:${e.colno}` : '', 'ERROR');
  });
  target.addEventListener('unhandledrejection', (e) => {
    if (!isHarmless(e.reason)) recordCrash(e.reason, '', 'PROMISE');
  });
}

/** The last thing that broke on this device, if any (for a report). */
export function lastCrash(): CrashRecord | null {
  try {
    const raw = localStorage.getItem(LAST_ERROR_KEY);
    return raw ? (JSON.parse(raw) as CrashRecord) : null;
  } catch {
    return null;
  }
}

/** What this page load was started as, read once (asked again — React asks twice in development — the same). */
let cameBack: boolean | null = null;

/** Back at the title after a crash: true for this one page load (the mark is forgotten as it is read). */
export function backFromCrash(): boolean {
  if (cameBack === null) {
    try {
      cameBack = sessionStorage.getItem(BACK_FROM_CRASH_KEY) === '1';
      sessionStorage.removeItem(BACK_FROM_CRASH_KEY);
    } catch {
      cameBack = false;
    }
  }
  return cameBack;
}

function backToTitle(): void {
  try {
    sessionStorage.setItem(BACK_FROM_CRASH_KEY, '1');
  } catch {
    /* the intro then plays again: no harm */
  }
  window.location.assign(window.location.pathname);
}

export class GameErrorBoundary extends Component<{ children: ReactNode }, { crash: CrashRecord | null }> {
  state: { crash: CrashRecord | null } = { crash: null };

  static getDerivedStateFromError(error: unknown) {
    return { crash: { at: new Date().toISOString(), message: error instanceof Error ? error.message : String(error), stack: '' } };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('The game broke while drawing a screen', error);
    this.setState({ crash: recordCrash(error, info.componentStack ?? '') });
    // The music and any word being said go quiet with it (if the sound is not what broke).
    try {
      audioManager.fadeOutBgm();
      audioManager.stopVoice();
    } catch {
      /* silent already, or past saving */
    }
  }

  render() {
    const { crash } = this.state;
    if (!crash) return this.props.children;
    return (
      <div className="crash-screen" role="alertdialog" aria-modal="true" aria-labelledby="crash-title" data-testid="crash-screen">
        <div className="crash-card">
          <h1 id="crash-title" className="crash-title">
            問題が起きました
          </h1>
          <p className="crash-note">
            ここまでの記録は残っています。
            <br />
            タイトルの「つづきから」で再開できます。
          </p>
          <button type="button" className="btn primary" data-testid="crash-resume" onClick={backToTitle}>
            タイトルへもどる
          </button>
          <p className="crash-code" data-testid="crash-code">
            {crash.message}
          </p>
          <p className="crash-code" data-testid="crash-build">
            build {__MUGEN_BUILD__}
          </p>
        </div>
      </div>
    );
  }
}

/**
 * DEBUG BUILDS ONLY: a screen breaks on request (`window.dispatchEvent(new Event('mugen-dev-crash'))`), so the
 * catching can be seen and tested. Compile time, like every other debug tool: a release build has none of it.
 */
export function DevCrashOnRequest() {
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const on = () => setBroken(true);
    window.addEventListener('mugen-dev-crash', on);
    return () => window.removeEventListener('mugen-dev-crash', on);
  }, []);
  if (broken) throw new Error('DEV: a screen broken on request');
  return null;
}
