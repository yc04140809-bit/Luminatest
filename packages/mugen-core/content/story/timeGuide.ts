import type { DialogueLine } from '../dialogue/prologue';

/**
 * 時間の使い方 (作者 2026-11-03 採用 — 試遊版・第1章の感情設計 4, ボイスパック23・24 v_ch1_chaos171〜175).
 *
 * Kaos says it once, early in chapter 1 — the first time the two of them come back into the village from outside:
 * a day spent out, and its night is when resting moves the days on. Two ways to spend them, neither the right one.
 * Then the same, written, wherever it can be looked at again (噂話・設定), with the one thing the five lines leave
 * out: a rest moves the story only after a day that was spent out (※, 作者採用 2026-11-04). And while the village
 * waits on that (the signs not yet risen), the objective says so in a few words.
 */
const KAOS = 'ケイオス';

export const TIME_GUIDE_LINES: readonly DialogueLine[] = [
  { speaker: KAOS, text: 'ねえねえ、時間の使い方、大事なこと言うね', kaosFace: 'SMILE' },
  { speaker: KAOS, text: 'この村はね、『休息』すると日が進んで、みんなの人生も、物語も動くの', kaosFace: 'NORMAL' },
  { speaker: KAOS, text: 'じっくり派は休息ひかえめ。村をたっぷり味わう進み方', kaosFace: 'SMILE' },
  { speaker: KAOS, text: 'がっつり派は、噂のNEWを追って、休息でどんどん進める', kaosFace: 'DOYA' },
  { speaker: KAOS, text: 'どっちが正解でもないよ。あなたの時間は、あなたが決めて', kaosFace: 'SMILE' },
];

/** Said once in a world: written down as said. */
export const TIME_GUIDE_MARK = 'guide:time';

/** The same, to be looked at again (噂話・設定). */
export const TIME_GUIDE_CARD = {
  title: '時間の使い方',
  ways: [
    { name: 'じっくり派', text: '休息を控えて、村のみんなと話したり探索したり。ゆっくり味わう進み方' },
    { name: 'がっつり派', text: '噂話のNEWを追って、休息で日を進める。物語がぐんぐん動く進み方' },
  ],
  note: '※出かけて過ごした日の夜に休息すると、日が進み、物語と人々の人生が動きます',
} as const;

/** Under the objective while the village waits on a day spent out (作者採用 2026-11-04). */
export const OBJECTIVE_HINT = '出かけて、夜は休もう';
