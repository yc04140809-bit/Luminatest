// Optional haptics. Absent API, unsupported device or a player who turned
// it off all resolve to "do nothing" — never to an error.

let enabled = true;

export function setHapticEnabled(value: boolean): void {
  enabled = value;
}

export function isHapticSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

/** A short, single pulse. Reserved for real moments (a choice, a memory). */
export function vibrate(durationMs = 18): void {
  if (!enabled || !isHapticSupported()) return;
  try {
    navigator.vibrate(durationMs);
  } catch {
    /* ignore */
  }
}
