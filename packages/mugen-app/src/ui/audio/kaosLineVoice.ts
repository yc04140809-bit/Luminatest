import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { heroLineVoice, kaosLineVoice } from '../../platform/voice';
import { playVoice } from '../../platform/audio';

/**
 * ケイオス'S WORDS IN CHAPTER 1, HEARD AS THEY COME UP (ボイスパック12, 2026-11-01).
 *
 * Every screen that shows her words (the village's small things, the short exchanges, her word as they set out or
 * come back, the signs, the forest, the look ahead, the ruins, the finale, the first meeting) calls this as one of
 * her lines comes up. What she says is looked up by its text (platform/kaosLines.ts): one recording per text,
 * wherever it is said. A line of someone else's, or one with no recording (her silences 「……。」), says nothing.
 *
 * 主人公's words too (ボイスパック13), the same way: a line whose speaker is the hero as written (`{HERO}` — the
 * line before his name is put in) is looked up by its text (platform/heroLines.ts). His silences (「……。」「？」)
 * say nothing.
 *
 * Once per `key` — the screen and the line — even where a screen is drawn again or an effect runs twice.
 */
const KAOS = 'ケイオス';
const AGAIN_MS = 3000;
/** When each key was last said (a few lines said together each keep their own). */
const said = new Map<string, number>();

export function sayKaosLine(
  key: string,
  line: { speaker?: string | null; text: string } | null | undefined,
  options?: { wait?: boolean },
): boolean {
  if (!line || (line.speaker !== KAOS && line.speaker !== HERO_SPEAKER)) return false;
  const id = line.speaker === KAOS ? kaosLineVoice(line.text) : heroLineVoice(line.text);
  if (!id) return false;
  const now = performance.now();
  if (now - (said.get(key) ?? -Infinity) < AGAIN_MS) return false;
  for (const [k, at] of said) if (now - at >= AGAIN_MS) said.delete(k);
  said.set(key, now);
  playVoice(id, options);
  return true;
}

/** For a test: forget what was said last. */
export function forgetKaosLine(): void {
  said.clear();
}
