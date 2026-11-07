import type { EventCgKey } from '@mugen/assets/keys';

/**
 * 痛みの一文 — ONE LINE UNDER THE PICTURE OF HIS THREE YEARS (作者 2026-11-03 採用, 2026-11-06 置き場所).
 *
 * Whatever was answered, the picture is followed by what it cost: no answer is the right one, and none is a
 * punishment — each moved someone's life, and this line says what that weighs. One line, under the picture, read
 * before 「――3年後。」 and the list. By the picture shown, so by the answer (visionCgOf): the bakery is 助ける, the
 * roadside 見逃す, the workshop 捕縛, the grave とどめ.
 *
 * Only on that screen, like everything it shows: nothing is written anywhere.
 */
export const VISION_PAIN_LINES: Readonly<Partial<Record<EventCgKey, string>>> = {
  GALD_BAKER: '男は、パン屋で働くようになった。だが、村の誰もが彼を受け入れたわけではない。',
  GALD_HEALER: '男は、街道で人の傷を診るようになった。その後を、知る者はいない。',
  GALD_WORKER: '男は、作業場で働いている。妹と過ごせなかった年月は、戻らない。',
  GALD_GRAVE: '村に、平穏が戻った。薬は少女に届けられた。だが兄だけが、もういない。',
};

/**
 * とどめ: WHERE THE MEDICINE WENT (作者 2026-11-06, A1). The hero kept it and the note (発見 → 「包みとメモは、まだ
 * 主人公の手の中にある。」), and the letter's sender named him (「手紙の差出人に、ガルド、とあった。」) — the clue the
 * medicine is carried by. First in that look ahead's list, before the stones and the flowers: days, not months.
 */
export const VISION_MEDICINE_DELIVERED = {
  /** The picture whose list it opens. */
  on: 'GALD_GRAVE' as EventCgKey,
  text: '手紙を頼りに、薬が少女のもとへ届けられた',
};
