// KAOS'S FACES — 表情差分 (作者指示 2026-10-11: 主人公×ケイオス 会話・表情差分 強化).
//
// A line can say which face she makes on it (`DialogueLine.kaosFace`). The
// face is a FEELING, not a file: which picture answers for it is the App's
// (mugen-app/src/assets/kaosFaces.ts), and a face not yet drawn falls back
// along its chain to one that is — so lines can be written with all ten
// today, the six first pictures slot in, then the other four, and no line
// changes when they do.
//
//   01 NORMAL     通常
//   02 SMILE      優しい笑顔
//   03 PUKU       頬を膨らませたプク顔（軽く拗ねる・ツッコむ）
//   04 SURPRISED  驚き
//   05 TROUBLED   困り顔・呆れ・微妙な空気
//   06 SERIOUS    真剣・警戒・戦闘前
//   07 LAUGH      楽しそうに笑う
//   08 DOYA       得意げ
//   09 BLUSH      照れ
//   10 SAD        悲しい・しんみり・優しい本音
//   11 ANGRY      怒り（怒りマーク・声を上げる。PUKU より強い）— 2026-10-11 追加

export const KAOS_FACES = [
  'NORMAL',
  'SMILE',
  'PUKU',
  'SURPRISED',
  'TROUBLED',
  'SERIOUS',
  'LAUGH',
  'DOYA',
  'BLUSH',
  'SAD',
  'ANGRY',
] as const;

export type KaosFace = (typeof KAOS_FACES)[number];

/** The six to be drawn first (作者指示: NORMAL, SMILE, PUKU, SURPRISED, TROUBLED, SERIOUS). */
export const KAOS_FIRST_FACES: readonly KaosFace[] = ['NORMAL', 'SMILE', 'PUKU', 'SURPRISED', 'TROUBLED', 'SERIOUS'];

/**
 * Where a face not drawn yet goes instead — nearest feeling first, ending at
 * NORMAL. The later four lean on the first six.
 */
export const KAOS_FACE_FALLBACK: Readonly<Record<KaosFace, readonly KaosFace[]>> = {
  NORMAL: [],
  SMILE: ['NORMAL'],
  PUKU: ['TROUBLED', 'NORMAL'],
  SURPRISED: ['NORMAL'],
  TROUBLED: ['NORMAL'],
  SERIOUS: ['NORMAL'],
  LAUGH: ['SMILE', 'NORMAL'],
  DOYA: ['SMILE', 'NORMAL'],
  BLUSH: ['SMILE', 'NORMAL'],
  SAD: ['TROUBLED', 'NORMAL'],
  ANGRY: ['PUKU', 'TROUBLED', 'NORMAL'],
};

/** The faces to try for `face`, in order: itself, then its chain. */
export function kaosFaceChain(face: KaosFace): readonly KaosFace[] {
  return [face, ...KAOS_FACE_FALLBACK[face]];
}

/**
 * Her face on a line she speaks: the one it names; else SERIOUS when the
 * air has gone tight (`tense`), else NORMAL. Null when she is not speaking.
 */
export function kaosFaceOf(line: { speaker: string | null; tense?: boolean; kaosFace?: KaosFace }): KaosFace | null {
  if (line.speaker !== 'ケイオス') return null;
  return line.kaosFace ?? (line.tense ? 'SERIOUS' : 'NORMAL');
}
