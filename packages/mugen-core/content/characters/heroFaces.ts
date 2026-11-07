// THE HERO'S FACES — 主人公の表情差分 (2026-10-11).
//
// As Kaos's (kaosFaces.ts): a line can name his face (`DialogueLine.heroFace`),
// a feeling, not a file. Which picture answers is the App's
// (mugen-app/src/assets/heroFaces.ts); a face not drawn yet falls back to
// NORMAL. Seven delivered 2026-10-11.
//
//   NORMAL     通常
//   SMILE      ほほえみ（小さく笑う）
//   SURPRISED  驚き
//   TROUBLED   呆れ・気まずい・しんみり（目を伏せる）
//   SERIOUS    真剣
//   ANGRY      怒り
//   POUT       むすっ（頬を膨らませた照れ隠し・拗ね）
//   SAD        悲しみ（未着 — TROUBLED が代わる）

export const HERO_FACES = ['NORMAL', 'SMILE', 'SURPRISED', 'TROUBLED', 'SERIOUS', 'ANGRY', 'POUT', 'SAD'] as const;

export type HeroFace = (typeof HERO_FACES)[number];

export const HERO_FACE_FALLBACK: Readonly<Record<HeroFace, readonly HeroFace[]>> = {
  NORMAL: [],
  SMILE: ['NORMAL'],
  SURPRISED: ['NORMAL'],
  TROUBLED: ['NORMAL'],
  SERIOUS: ['NORMAL'],
  ANGRY: ['SERIOUS', 'TROUBLED', 'NORMAL'],
  POUT: ['TROUBLED', 'NORMAL'],
  SAD: ['TROUBLED', 'NORMAL'],
};

/** The faces to try for `face`, in order: itself, then its chain. */
export function heroFaceChain(face: HeroFace): readonly HeroFace[] {
  return [face, ...HERO_FACE_FALLBACK[face]];
}

/** His face on a line he speaks (`{HERO}`): the one it names, else NORMAL. Null when he is not speaking. */
export function heroFaceOf(line: { speaker: string | null; heroFace?: HeroFace }): HeroFace | null {
  if (line.speaker !== '{HERO}') return null;
  return line.heroFace ?? 'NORMAL';
}
