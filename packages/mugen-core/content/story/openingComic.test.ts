import { describe, expect, it } from 'vitest';
import { OPENING_CHOICES, OPENING_IMAGES, OPENING_STEPS, OPENING_TAP_LOCK_MS } from './openingComic';

describe('触る漫画形式のオープニング (作者指示 2026-10-16)', () => {
  const scenes = OPENING_STEPS.map((s) => s.scene);

  it('the author’s order: 01→17, the flashes 01→07 between 06 and 08; 「また、ここで。」 last', () => {
    const firstOf = (sc: string) => scenes.indexOf(sc);
    const order = ['SCENE01', 'SCENE02', 'SCENE03', 'SCENE04', 'SCENE05', 'SCENE06', 'SCENE07', 'FLASH01', 'FLASH02', 'FLASH03', 'FLASH04', 'FLASH05', 'FLASH06', 'FLASH07', 'SCENE08', 'SCENE09', 'SCENE10', 'SCENE11', 'SCENE14', 'SCENE15', 'SCENE16', 'SCENE17'];
    const idx = order.map(firstOf);
    expect(idx.every((i) => i >= 0)).toBe(true);
    expect([...idx].sort((a, b) => a - b)).toEqual(idx);
    expect(OPENING_STEPS.at(-1)).toMatchObject({ scene: 'SCENE17', image: 'op_mata_kokode', lines: ['また、ここで。'] });
  });

  it('the words, as the author wrote them', () => {
    const said = (sc: string) => OPENING_STEPS.filter((s) => s.scene === sc).flatMap((s) => s.lines);
    expect(said('SCENE01')).toEqual(['……あ！', '起きた？', '遅いぞ〜？']);
    expect(said('SCENE02')).toEqual(['あ、そうそう。', '連打は後悔するよ？', 'たぶん♪']);
    expect(said('SCENE03')).toEqual(['それじゃあ…']);
    expect(said('SCENE06')).toEqual(['じつはね…']);
    expect(said('SCENE10')).toEqual(['…………。', 'つまんない反応だな〜', 'もうちょっと驚いてくれてもいいのに。']);
    expect(said('SCENE14')).toEqual(['じゃ。']);
    expect(said('SCENE16')).toEqual(['行ってらっしゃい♪']);
    expect(OPENING_CHOICES.map((c) => c.label)).toEqual(['今のなに？', '泣いてた？', '変顔すごいね']);
  });

  it('noise and the glimpse go on by themselves, briefly; the despair is held; nothing explains (no names)', () => {
    for (const s of OPENING_STEPS.filter((x) => x.kind === 'NOISE')) expect(s.ms!).toBeLessThanOrEqual(200);
    const gald = OPENING_STEPS.find((s) => s.scene === 'SCENE15')!;
    expect(gald).toMatchObject({ kind: 'GLIMPSE', lines: [] });
    expect(gald.ms!).toBeGreaterThanOrEqual(700);
    expect(gald.ms!).toBeLessThanOrEqual(1200);
    expect(OPENING_STEPS.find((s) => s.kind === 'HOLD')!.ms!).toBeGreaterThanOrEqual(1000);
    const words = OPENING_STEPS.flatMap((s) => s.lines).join('');
    expect(words).not.toMatch(/ガルド|ヴァルシール|機械天使|女神/);
    // The music: on, thinned, stopped at the power off, back with the funny face.
    expect(OPENING_STEPS.find((s) => s.kind === 'POWER_OFF')!.music).toBe('STOP');
    expect(OPENING_STEPS.find((s) => s.scene === 'SCENE09')!.music).toBe('RESUME');
  });

  it('every picture used, once; one TAP one step (a short lock)', () => {
    expect(OPENING_STEPS.map((s) => s.image)).toEqual([...OPENING_IMAGES]);
    expect(OPENING_TAP_LOCK_MS).toBeGreaterThanOrEqual(150);
    expect(OPENING_TAP_LOCK_MS).toBeLessThanOrEqual(250);
  });
});
