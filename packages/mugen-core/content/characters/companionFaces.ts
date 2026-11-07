// ARIA'S AND LEVI'S FACES — アリア・レヴィの会話用表情差分 (2026-10-12).
//
// As Grave's (graveFaces.ts): a line she speaks can name her face — a
// feeling, not a file. Which picture answers is the App's
// (mugen-app/src/assets/companionFaces.ts); a line that names none is
// NORMAL. Three each, delivered 2026-10-12 on the same upper-body canvas
// as Kaos's and Grave's faces.
//
//   アリア  NORMAL    穏やかな微笑み（普段）
//           SMILE     口を開けて笑う（ケイオスとの再会など）
//           TROUBLED  困惑・疑い（眉が下がり、口が開く）
//   レヴィ  NORMAL    落ち着いた無表情（普段）
//           ANGRY     眉をひそめる・不機嫌
//           SURPRISED 驚き（口が少し開く）

export const ARIA_FACES = ['NORMAL', 'SMILE', 'TROUBLED'] as const;
export type AriaFace = (typeof ARIA_FACES)[number];

export const LEVI_FACES = ['NORMAL', 'ANGRY', 'SURPRISED'] as const;
export type LeviFace = (typeof LEVI_FACES)[number];

/** How their names are written on a line. */
export const ARIA_SPEAKER = 'アリア';
export const LEVI_SPEAKER = 'レヴィ';

/** Aria's face on a line she speaks: the one it names, else NORMAL. Null when she is not the one speaking. */
export function ariaFaceOf(line: { speaker: string | null; ariaFace?: AriaFace }): AriaFace | null {
  if (line.speaker !== ARIA_SPEAKER) return null;
  return line.ariaFace ?? 'NORMAL';
}

/** Levi's face on a line she speaks: the one it names, else NORMAL. Null when she is not the one speaking. */
export function leviFaceOf(line: { speaker: string | null; leviFace?: LeviFace }): LeviFace | null {
  if (line.speaker !== LEVI_SPEAKER) return null;
  return line.leviFace ?? 'NORMAL';
}
