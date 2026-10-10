import { describe, expect, it } from 'vitest';
import { RUMOR_CATEGORY_LABEL, VILLAGE_RUMORS, rumorMark, rumorsFor } from './villageRumors';
import { SEKIRYUGA_RUMORS } from './sekiryugaArc';

/** 噂話: mostly the village's own gossip; the route's rumours once reached; nothing that decides canon. */

describe('the village’s rumours', () => {
  it('the author’s examples are there, in every category', () => {
    const texts = VILLAGE_RUMORS.map((r) => r.text);
    for (const t of [
      'パン屋の娘、最近よく店の外を見てるらしい。',
      '森の奥で光る石を見たって奴がいる。',
      '酒場のマスター、昔は今より怖かったらしいぞ。',
      '道具屋の親父、魚が嫌いらしい。',
    ])
      expect(texts).toContain(t);
    for (const c of Object.keys(RUMOR_CATEGORY_LABEL)) expect(VILLAGE_RUMORS.some((r) => r.category === c)).toBe(true);
    expect(new Set(VILLAGE_RUMORS.map((r) => r.id)).size).toBe(VILLAGE_RUMORS.length);
  });

  it('most are not clues', () => {
    const story = VILLAGE_RUMORS.filter((r) => r.when !== 'ALWAYS');
    expect(story.length).toBeLessThan(VILLAGE_RUMORS.length / 2);
  });

  it('opened by progress: the route’s rumours only once one has been heard', () => {
    const start = rumorsFor({ arcOpen: false, stage: 'NONE' }).map((r) => r.id);
    expect(start).not.toContain('RUINS_SOUND');
    expect(start).not.toContain('TAVERN_BUSY');
    const heard = rumorsFor({ arcOpen: true, stage: 'RUMOR' }).map((r) => r.id);
    expect(heard).toEqual(expect.arrayContaining(['RUINS_SOUND', 'RUINS_QUAKE', 'TAVERN_BUSY']));
    expect(heard).not.toContain('RUINS_COIN');
    expect(rumorsFor({ arcOpen: true, stage: 'TOLD' }).map((r) => r.id)).toContain('RUINS_COIN');
    expect(rumorsFor({ arcOpen: true, stage: 'BEATEN' }).map((r) => r.id)).toContain('RUINS_QUIET');
    // The route's own lines, word for word (line breaks aside).
    const sound = VILLAGE_RUMORS.find((r) => r.id === 'RUINS_SOUND')!;
    expect(sound.text).toBe(SEKIRYUGA_RUMORS.BAKERY.text.replace(/\n/g, ''));
  });

  it('decide nothing: no ages, no Gald, no セキリュウガ’s nature, no futures', () => {
    const all = VILLAGE_RUMORS.map((r) => r.text).join('\n');
    expect(all).not.toMatch(/ガルド|歳|才|セキリュウガ|幼体|将来|結婚|父親|母親/);
    expect(rumorMark('X')).toBe('rumor:X');
  });
});

describe('the cry from the ruins (実装メイン⑥ 2026-10-08)', () => {
  const has = (f: Parameters<typeof rumorsFor>[0]) => rumorsFor(f).some((r) => r.id === 'RUINS_CRY');

  it('only once it is settled, the first time back seen and a night slept after it', () => {
    expect(has({ arcOpen: true, stage: 'SETTLED' })).toBe(false);
    expect(has({ arcOpen: true, stage: 'SETTLED', ruinsCry: false })).toBe(false);
    expect(has({ arcOpen: true, stage: 'BEATEN', ruinsCry: true })).toBe(false);
    expect(has({ arcOpen: false, stage: 'SETTLED', ruinsCry: true })).toBe(false);
    expect(has({ arcOpen: true, stage: 'SETTLED', ruinsCry: true })).toBe(true);
  });

  it('a small cry, and no more: not a young one, an egg, or its child', () => {
    const cry = VILLAGE_RUMORS.find((r) => r.id === 'RUINS_CRY')!;
    expect(cry.text).toBe('遺跡の近くを通った旅人が、奥から小さな鳴き声を聞いたらしい。');
    expect(`${cry.title}${cry.text}`).not.toMatch(/幼体|卵|子供|子ども|セキリュウガ/);
  });
  it('ヒョウレイ (MON-000008) before the raid: one rumour, from the signs’ second phase — seen, not met, not named', () => {
    const shining = VILLAGE_RUMORS.filter((r) => r.text.includes('光る翼'));
    expect(shining.map((r) => [r.id, r.when])).toEqual([['INC_SHINING_WINGS', 'INCIDENT_2']]);
    expect(JSON.stringify(VILLAGE_RUMORS)).not.toContain('ヒョウレイ');
    expect(rumorsFor({ arcOpen: true, stage: 'SETTLED', incidentPhase: 1 }).map((r) => r.id)).not.toContain('INC_SHINING_WINGS');
    expect(rumorsFor({ arcOpen: true, stage: 'SETTLED', incidentPhase: 2 }).map((r) => r.id)).toContain('INC_SHINING_WINGS');
  });
});
