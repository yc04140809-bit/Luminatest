import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { useEffect, useRef } from 'react';
import type { Screen } from '@mugen/core/flow/types';

/**
 * THE ONE HARDWARE BUTTON ANDROID HAS, AND WHAT IT MEANS HERE.
 *
 * Unhandled, it closes the app from wherever you are. That is wrong
 * everywhere in this game and catastrophic in two places: mid-scene,
 * and mid-decision.
 *
 * WHAT BACK MUST NEVER DO, and why each one is listed rather than
 * left to a default:
 *
 *   It must never undo a story decision. The four answers about Gald
 *   are asked once per world, and a back button that walked out of
 *   them would be a way to take the choice again.
 *   It must never interrupt a scene. A cutscene that can be reversed
 *   is a cutscene whose ending is negotiable.
 *   It must never leave a fight. Walking out of a battle is not a
 *   thing the game has rules for.
 *
 * So the table below is EXPLICIT AND PARTIAL, and anything absent
 * SWALLOWS the press rather than guessing. Swallowing is the safe
 * failure: the player presses again and nothing happens, which is
 * annoying. The unsafe failure loses their world.
 */
export type BackAction = Screen | 'EXIT' | null;

const BACK: Partial<Record<Screen, BackAction>> = {
  // The way out of the game, and the only one.
  TITLE: 'EXIT',
  // The village is home. Back from anywhere off it comes back to it.
  EXPLORE: 'HOME',
  GREENWOOD: 'EXPLORE',
  ITEM_SHOP: 'EXPLORE',
  BAG: 'HOME',
  WORLD_MEMORY: 'HOME',
  ARCHIVE: 'HOME',
  STATUS: 'HOME',
  // HOME itself swallows it. Closing the game from the village by
  // pressing back once is not something anybody meant to do.
  HOME: null,
};

export function isNativeShell(): boolean {
  return Capacitor.isNativePlatform();
}

/** Where a press should go, or null to swallow it. */
export function backTargetFor(screen: Screen): BackAction {
  return BACK[screen] ?? null;
}

export function exitNativeApp(): void {
  void CapacitorApp.exitApp();
}

/**
 * Listens once, and always asks the CURRENT screen what to do.
 *
 * The handler is held in a ref rather than re-registered: Capacitor's
 * listeners stack, and a second registration would run the press
 * twice — which, on a screen whose back goes home, is a visible
 * double navigation.
 *
 * NATIVE ONLY. The web build has the browser's own back button and
 * its own history, and this must not touch either.
 */
export function useAndroidBackButton(onBack: () => void): void {
  const handler = useRef(onBack);
  handler.current = onBack;

  useEffect(() => {
    if (!isNativeShell()) return;
    const added = CapacitorApp.addListener('backButton', () => handler.current());
    return () => {
      void added.then((h) => h.remove());
    };
  }, []);
}
