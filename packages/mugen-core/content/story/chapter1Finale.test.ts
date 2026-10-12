import { describe, expect, it } from 'vitest';
import { CHAPTER1_END, FINALE_SCENES, FINALE_SCENE_IDS, FINALE_SPEAKERS, type FinaleLine } from './chapter1Finale';
import { AFTER_FORM2_SCENES, FORM2_FINISHER_SCENES, finaleBeat, FINALE_STAGES } from '../../core/world/chapterFinale';
import { KAOS_FACES } from '../characters/kaosFaces';
import { GRAVE_FACES } from '../characters/graveFaces';
import { HERO_FACES } from '../characters/heroFaces';
import { ARIA_FACES, LEVI_FACES, ARIA_SPEAKER, LEVI_SPEAKER } from '../characters/companionFaces';

const all: FinaleLine[] = FINALE_SCENE_IDS.flatMap((id) => [...FINALE_SCENES[id].lines]);
const text = [...all.map((l) => l.text), ...CHAPTER1_END.lines].join('\n');
const said = (who: string) => all.filter((l) => l.speaker === who).map((l) => l.text).join('\n');

describe('第1章終盤 — the script (作者指示 2026-10-12)', () => {
  it('NO ONE DIES: no line says or shows a death — nor that no one dying made it light', () => {
    for (const word of ['死', '亡', '殺', '息を引き取', '帰らぬ', '犠牲', '遺体', '墓']) expect(text, word).not.toContain(word);
    // People are hurt, the village is broken — and that is said.
    expect(text).toContain('怪我');
    expect(text).toContain('みんな、生きてる');
    expect(text).toMatch(/壊れた村|半壊|屋根の落ちた/);
    for (const light of ['大したことない', '被害は軽', '無事でよかったから']) expect(text).not.toContain(light);
  });

  it('ヴァルシール is stopped, not destroyed; it has no grudge — it is a guardian whose order woke wrong', () => {
    for (const word of ['破壊した', '爆散', '粉々', 'とどめ', '倒した']) expect(said(FINALE_SPEAKERS.HERO) + said(FINALE_SPEAKERS.KAOS) + said(FINALE_SPEAKERS.GRAVE), word).not.toContain(word);
    const stopped = FINALE_SCENES.STOPPED.lines.map((l) => l.text).join('\n');
    expect(stopped).toContain('壊れてはいない');
    expect(stopped).toContain('守るために作られた');
    expect(FINALE_SCENES.RAID.lines.map((l) => l.text).join('\n')).toContain('怒ってない');
  });

  it('the hooded man: the first unsealing works, the second is refused, he leaves — unexplained, not killed, not named as the tavern\'s guest', () => {
    const ruins = FINALE_SCENES.RUINS_SEAL.lines.map((l) => l.text).join('\n');
    expect(ruins).toContain('第一段階');
    expect(ruins).toContain('第二段階が、拒絶された');
    expect(ruins).toContain('消えた');
    const his = said(FINALE_SPEAKERS.HOODED);
    expect(his.split('\n').length).toBeLessThanOrEqual(5);
    for (const word of ['酒場', '客', '目的', '計画']) expect(ruins, word).not.toContain(word);
    // It does not look at him: it looks toward the village.
    expect(ruins).toContain('村のある方角');
  });

  it('the hero decides where to fight (out of the village); the village fights its own way too (Mirei, Rizel, the bakery)', () => {
    expect(said(FINALE_SPEAKERS.HERO)).toContain('ここで戦っちゃだめだ');
    expect(said(FINALE_SPEAKERS.HERO)).toContain('草原');
    expect(said(FINALE_SPEAKERS.MIREI)).toContain('包帯');
    expect(said(FINALE_SPEAKERS.RIZEL)).toContain('巻');
    expect(said(FINALE_SPEAKERS.LINA) + said(FINALE_SPEAKERS.OWNER)).toContain('火');
    for (const id of ['VILLAGE_MIREI', 'VILLAGE_RIZEL', 'VILLAGE_BAKERY'] as const) expect(FINALE_SCENES[id].place).toBe('VILLAGE');
  });

  it('Kaos stays (mending, watching it) and cannot fight; Grave stays because he has something to protect; Kaos is quietly hurt', () => {
    const kaos = FINALE_SCENES.KAOS_STAYS.lines.map((l) => l.text).join('\n');
    expect(kaos).toContain('離れられない');
    expect(kaos).toContain('戦うのも、無理');
    expect(kaos).toContain('元通りにはできない');
    expect(FINALE_SCENES.KAOS_STAYS.lines.some((l) => l.kaosFace === 'SAD')).toBe(true);
    expect(kaos).not.toContain('泣');
    const grave = FINALE_SCENES.GRAVE_STAYS.lines.map((l) => l.text).join('\n');
    expect(grave).toContain('戦えねぇから残るんじゃねぇ');
    expect(grave).toContain('守るもん');
  });

  it('Aria and Levi come for Kaos, the truth and the hero — and still do not trust people', () => {
    const scene = FINALE_SCENES.ARIA_LEVI.lines.map((l) => l.text).join('\n');
    expect(scene).toContain('人間を信用したわけじゃない');
    expect(scene).toContain('真相');
    expect(scene).toContain('一人で放っておく');
  });

  it('the village is not made whole; rebuilding begins; the end says so', () => {
    const rebuild = FINALE_SCENES.REBUILD.lines.map((l) => l.text).join('\n');
    expect(rebuild).toContain('元通りには、ならない');
    expect(rebuild).toContain('槌の音');
    expect(rebuild).toContain('焼けた跡は、そのまま残る');
    expect(CHAPTER1_END.title).toBe('CHAPTER 1 END');
    expect(CHAPTER1_END.lines.join('')).toContain('作り直していく');
  });

  it('Kaos never calls the hero 師匠; faces are ones that exist', () => {
    expect(said(FINALE_SPEAKERS.KAOS)).not.toContain('師匠');
    for (const l of all) {
      if (l.kaosFace) expect(KAOS_FACES).toContain(l.kaosFace);
      if (l.graveFace) expect(GRAVE_FACES).toContain(l.graveFace);
      if (l.heroFace) expect(HERO_FACES).toContain(l.heroFace);
      if (l.ariaFace) expect([ARIA_FACES, l.speaker]).toEqual([expect.arrayContaining([l.ariaFace]), ARIA_SPEAKER]);
      if (l.leviFace) expect([LEVI_FACES, l.speaker]).toEqual([expect.arrayContaining([l.leviFace]), LEVI_SPEAKER]);
    }
  });

  it('every scene is played exactly once along the stages — none left out, none twice', () => {
    const played: string[] = [];
    for (const stage of FINALE_STAGES) {
      const beat = finaleBeat(stage);
      if (!beat) continue;
      played.push(...beat.scenes);
      if (beat.then === 'VALSHEEL_FORM2') played.push(...FORM2_FINISHER_SCENES, ...AFTER_FORM2_SCENES);
    }
    expect([...played].sort()).toEqual([...FINALE_SCENE_IDS].sort());
    expect(new Set(played).size).toBe(played.length);
  });
});
