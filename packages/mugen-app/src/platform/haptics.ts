import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * A SHORT, LIGHT BUZZ — "気づいた" — never a long shake (作者「探索システムPoC 改善指示書」2026-10-18).
 *
 * On the phone it goes through the device's own vibrator (Capacitor Haptics; the APK declares
 * VIBRATE): the web `navigator.vibrate` alone does nothing in the Android WebView without that
 * permission, which is why the first build never buzzed. In a browser it falls back to
 * `navigator.vibrate`. Nothing here may stop the walk: every failure is swallowed.
 *
 *   light  an ordinary thing noticed — one light tap
 *   rare   something rare — a tap a little firmer, then a light one
 */
export type BuzzStrength = 'light' | 'rare';

/** What was last asked for — for the DEV log and the tests (a browser has no vibrator to watch). */
export const buzzLog: { strength: BuzzStrength; via: 'native' | 'web' | 'none' }[] = [];

export function buzz(strength: BuzzStrength): void {
  let via: 'native' | 'web' | 'none' = 'none';
  try {
    if (Capacitor.isNativePlatform()) {
      via = 'native';
      if (strength === 'rare') {
        void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined);
        window.setTimeout(() => void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined), 90);
      } else {
        void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
      }
    } else if (typeof navigator.vibrate === 'function') {
      via = 'web';
      navigator.vibrate(strength === 'rare' ? [18, 60, 12] : 14);
    }
  } catch {
    // A device without it, or a plugin that failed to load: nothing, and the walk goes on.
  }
  buzzLog.push({ strength, via });
  if (buzzLog.length > 20) buzzLog.shift();
}
