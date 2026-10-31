// THE ANDROID BACK BUTTON, AND WHERE IT IS ALLOWED TO LEAD.
//
// On a phone the back gesture is the most-pressed control the game
// has, and it is the only one the game did not define: left alone,
// Android closes the app with it. That is the wrong answer almost
// everywhere and a dangerous one in a few places, so `backTarget.ts`
// says, for every screen MUGEN ZERO has, exactly what a back press
// means. This file is the wiring that reads it.
//
// NONE OF IT APPLIES TO THE WEB. The listener below is registered only
// when the game is running inside the Android shell; in a browser
// nothing is bound and the back gesture keeps whatever the browser
// gives it.

import { useEffect, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as NativeApp } from '@capacitor/app';
import { backTargetFor, type BackAction } from './backTarget';

export { backTargetFor, type BackAction };

/** True when the game is running inside the Android shell. */
export function isNativeShell(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

/** Closes the app. Android only; a no-op anywhere else. */
export async function exitNativeApp(): Promise<void> {
  if (!isNativeShell()) return;
  await NativeApp.exitApp().catch((e: unknown) => {
    console.warn('Could not close the app', e);
  });
}

/**
 * Binds the hardware back button, on Android and nowhere else.
 *
 * The handler is read from a ref rather than captured, so the listener
 * is registered exactly once for the life of the app: re-registering it
 * on every render would be a new listener per render, and Capacitor
 * runs all of them.
 */
export function useAndroidBackButton(onBack: () => void): void {
  const latest = useRef(onBack);
  latest.current = onBack;

  useEffect(() => {
    if (!isNativeShell()) return;
    let cancelled = false;
    let remove: (() => void) | null = null;

    void NativeApp.addListener('backButton', () => latest.current())
      .then((handle) => {
        if (cancelled) {
          void handle.remove();
          return;
        }
        remove = () => void handle.remove();
      })
      .catch((e: unknown) => {
        // A shell that cannot give us the button is not a reason to
        // refuse to run; it only means Android keeps its default.
        console.warn('Android back button unavailable', e);
      });

    return () => {
      cancelled = true;
      remove?.();
    };
  }, []);
}
