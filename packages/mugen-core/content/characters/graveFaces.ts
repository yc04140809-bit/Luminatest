// GRAVE'S FACES — グレイヴの会話用表情差分 (作者指示 2026-10-12).
//
// As Kaos's and the hero's (kaosFaces.ts, heroFaces.ts): a line he speaks
// can name his face (`DialogueLine.graveFace`) — a feeling, not a file.
// Which picture answers is the App's (mugen-app/src/assets/graveFaces.ts);
// a face not drawn falls back along its chain, and a line that names none
// is NORMAL. One person, one set of pictures: the faces are his, never
// separate characters. Seven delivered 2026-10-12 (all but TROUBLED).
//
//   NORMAL     通常の案内・落ち着き
//   LAUGH      豪快な笑い
//   GRIN       少しからかう・にやり
//   SERIOUS    重要な話・警戒
//   ANGRY      危険や無茶を止める・怒り
//   TROUBLED   呆れる・困る（未着 — SERIOUS が代わる）
//   SAD        過去や喪失の話
//   SURPRISED  予想外の出来事

export const GRAVE_FACES = ['NORMAL', 'LAUGH', 'GRIN', 'SERIOUS', 'ANGRY', 'TROUBLED', 'SAD', 'SURPRISED'] as const;

export type GraveFace = (typeof GRAVE_FACES)[number];

/** How his name is written on a line (the tavern's master). */
export const GRAVE_SPEAKER = 'グレイヴ';

export const GRAVE_FACE_FALLBACK: Readonly<Record<GraveFace, readonly GraveFace[]>> = {
  NORMAL: [],
  LAUGH: ['GRIN', 'NORMAL'],
  GRIN: ['NORMAL'],
  SERIOUS: ['NORMAL'],
  ANGRY: ['SERIOUS', 'NORMAL'],
  TROUBLED: ['SERIOUS', 'NORMAL'],
  SAD: ['SERIOUS', 'NORMAL'],
  SURPRISED: ['NORMAL'],
};

/** The faces to try for `face`, in order: itself, then its chain. */
export function graveFaceChain(face: GraveFace): readonly GraveFace[] {
  return [face, ...GRAVE_FACE_FALLBACK[face]];
}

/** His face on a line he speaks: the one it names, else NORMAL. Null when he is not the one speaking. */
export function graveFaceOf(line: { speaker: string | null; graveFace?: GraveFace }): GraveFace | null {
  if (line.speaker !== GRAVE_SPEAKER) return null;
  return line.graveFace ?? 'NORMAL';
}
