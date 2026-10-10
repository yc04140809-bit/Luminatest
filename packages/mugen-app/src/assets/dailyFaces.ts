/**
 * 襲撃前の日常 — A FACE BESIDE A SMALL SCENE'S LINE, by who is speaking
 * (ui/daily.tsx). None has been delivered yet: リゼル's portrait is to come
 * (作者判断 2026-10-10 — the scenes do not wait for pictures). When one
 * arrives, it is one import and one line here, and the box shows it; until
 * then the box is words only, exactly as now.
 */
const FACES: Readonly<Record<string, string>> = {};

export function dailyFaceFor(speaker: string | null): string | null {
  return speaker ? (FACES[speaker] ?? null) : null;
}
