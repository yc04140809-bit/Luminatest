import { describe, expect, it } from 'vitest';
import { FINALE_SCENES, FINALE_SCENE_IDS } from '@mugen/content/story/chapter1Finale';
import { finaleFaceFor, kaosHead } from './finaleFaces';

describe('第1章終盤の顔表示 (作者指示 2026-10-12)', () => {
  const at = (id: keyof typeof FINALE_SCENES, text: string) => FINALE_SCENES[id].lines.find((l) => l.text === text)!;

  it('the five: the face their line names, NORMAL where it names none', () => {
    expect(finaleFaceFor(at('RAID', '……怒ってない。探してる。'))?.key).toBe('kaos:SERIOUS');
    expect(finaleFaceFor(at('RAID', '外へ引きつける。'))?.key).toBe('hero:SERIOUS');
    expect(finaleFaceFor(at('RAID', 'ここでやり合ったら村がもたねぇ！'))?.key).toBe('grave:ANGRY');
    expect(finaleFaceFor(at('ARIA_LEVI', '久しぶりね、ケイオス。'))?.key).toBe('aria:SMILE');
    expect(finaleFaceFor(at('ARIA_LEVI', 'で、来てみたらこれだ。'))?.key).toBe('levi:ANGRY');
    expect(finaleFaceFor(at('ARIA_LEVI', 'そう。'))?.key).toBe('aria:NORMAL');
    expect(finaleFaceFor(at('ARIA_LEVI', '派手にやられたな。'))?.key).toBe('levi:NORMAL');
  });

  it('the village: Mirei and Rizel by their line’s face; the baker and Lina their one face; narration none', () => {
    expect(finaleFaceFor(at('RAID', 'こっち！ 道を空けて！'))?.key).toBe('mirei:ANGRY');
    expect(finaleFaceFor(at('RAID', 'リナ、離れるな！'))?.key).toBe('owner:NORMAL');
    expect(finaleFaceFor(at('RAID', 'うん！'))?.key).toBe('lina:NORMAL');
    expect(finaleFaceFor(at('RAID', '歩ける人は、動けない人を手伝って！'))?.key).toBe('rizel:SAD');
    expect(finaleFaceFor(at('VILLAGE_MIREI', '大丈夫。ここは、ちゃんと守られてる。'))?.key).toBe('rizel:NORMAL');
    expect(finaleFaceFor(FINALE_SCENES.RAID.lines[0])).toBeNull();
  });

  it('every line of the five has a face', () => {
    for (const id of FINALE_SCENE_IDS) {
      for (const l of FINALE_SCENES[id].lines) {
        if (['ケイオス', '{HERO}', 'グレイヴ', 'アリア', 'レヴィ'].includes(l.speaker ?? '')) expect(finaleFaceFor(l), `${id}: ${l.text}`).not.toBeNull();
      }
    }
  });

  it('Kaos’s head is a square at the top-middle of her bust, inside it', () => {
    const h = kaosHead({ fileW: 1086, fileH: 1448, x: -80, y: -30, width: 1246, height: 1156 });
    expect(h.width).toBe(h.height);
    expect(h.x).toBeGreaterThan(-80);
    expect(h.x + h.width).toBeLessThan(-80 + 1246);
  });
});
