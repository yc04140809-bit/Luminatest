import { Capacitor } from '@capacitor/core';
import { Haptics } from '@capacitor/haptics';

/**
 * A SHORT, LIGHT BUZZ — "気づいた" — never a long shake (作者「探索システムPoC 改善指示書」2026-10-18).
 *
 * On the phone it goes through the device's own vibrator (Capacitor Haptics; the APK declares
 * VIBRATE): the web `navigator.vibrate` alone does nothing in the Android WebView without that
 * permission, which is why the first build never buzzed. In a browser it falls back to
 * `navigator.vibrate`. Nothing here may stop the walk: every failure is swallowed.
 *
 *   light  an ordinary thing noticed, a golden find — one short tap
 *   rare   something rare, the rainbow — a tap a little longer, then a short one
 */
export type BuzzStrength = 'light' | 'rare';

/** How long each buzz is (ms): light one short tap; rare a firmer one, then a short one. Never a long shake. */
export const BUZZ_MS: Readonly<Record<BuzzStrength, readonly [number, number?]>> = { light: [30], rare: [45, 30] };
/** From the start of the first tap to the second. */
export const BUZZ_GAP_MS = 110;

/** What was last asked for — for the DEV log and the tests (a browser has no vibrator to watch). */
export const buzzLog: { strength: BuzzStrength; via: 'native' | 'web' | 'none' }[] = [];

export function buzz(strength: BuzzStrength): void {
  let via: 'native' | 'web' | 'none' = 'none';
  try {
    if (Capacitor.isNativePlatform()) {
      via = 'native';
      // `vibrate` at the device's own strength: the plugin's light `impact` is 50ms at 110/255, which
      // many phones barely show (作者 実機 2026-10-23: 振動が無い).
      const [first, second] = BUZZ_MS[strength];
      void Haptics.vibrate({ duration: first }).catch(() => undefined);
      if (second) window.setTimeout(() => void Haptics.vibrate({ duration: second }).catch(() => undefined), BUZZ_GAP_MS);
    } else if (typeof navigator.vibrate === 'function') {
      via = 'web';
      const [first, second] = BUZZ_MS[strength];
      navigator.vibrate(second ? [first, BUZZ_GAP_MS - first, second] : first);
    }
  } catch {
    // A device without it, or a plugin that failed to load: nothing, and the walk goes on.
  }
  buzzLog.push({ strength, via });
  if (buzzLog.length > 20) buzzLog.shift();
}
