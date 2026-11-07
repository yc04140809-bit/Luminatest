import { describe, expect, it } from 'vitest';
import { OBJECTIVE_HINT, TIME_GUIDE_CARD, TIME_GUIDE_LINES } from './timeGuide';
import { nextObjective, objectiveHint, type ObjectiveFacts } from '../locations/aldenVillageMap';

describe('時間の使い方 (作者 2026-11-03/11-04)', () => {
  it('her five lines, in the order recorded (v_ch1_chaos171〜175) — 「あなた」, never 「あんた」', () => {
    expect(TIME_GUIDE_LINES.map((l) => l.text)).toEqual([
      'ねえねえ、時間の使い方、大事なこと言うね',
      'この村はね、『休息』すると日が進んで、みんなの人生も、物語も動くの',
      'じっくり派は休息ひかえめ。村をたっぷり味わう進み方',
      'がっつり派は、噂のNEWを追って、休息でどんどん進める',
      'どっちが正解でもないよ。あなたの時間は、あなたが決めて',
    ]);
    for (const l of TIME_GUIDE_LINES) {
      expect(l.speaker).toBe('ケイオス');
      expect(l.text).not.toContain('あんた');
    }
  });

  it('written to be looked at again: the two ways and the ※', () => {
    expect(TIME_GUIDE_CARD.ways).toEqual([
      { name: 'じっくり派', text: '休息を控えて、村のみんなと話したり探索したり。ゆっくり味わう進み方' },
      { name: 'がっつり派', text: '噂話のNEWを追って、休息で日を進める。物語がぐんぐん動く進み方' },
    ]);
    expect(TIME_GUIDE_CARD.note).toBe('※出かけて過ごした日の夜に休息すると、日が進み、物語と人々の人生が動きます');
  });

  it('a few words under the objective: only after セキリュウガ, before the signs rise', () => {
    const at = (f: Partial<ObjectiveFacts>): ObjectiveFacts => ({ galdDecided: true, arcOpen: true, stage: 'SETTLED', phase: 0, ...f });
    expect(objectiveHint(at({ phase: 0 }))).toBe(OBJECTIVE_HINT);
    expect(objectiveHint(at({ phase: 1 }))).toBe('出かけて、夜は休もう');
    expect(objectiveHint(at({ phase: 2 }))).toBeNull();
    expect(objectiveHint(at({ stage: 'TOLD' }))).toBeNull();
    expect(objectiveHint(at({ galdDecided: false }))).toBeNull();
    // The objective itself as it was.
    expect(nextObjective(at({ phase: 1 }))).toBe('アルデン村で日々を過ごそう');
  });
});
