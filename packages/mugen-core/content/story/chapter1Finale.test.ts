import { describe, expect, it } from 'vitest';
import { CHAPTER1_END, FINALE_FIGHT_BGM, FINALE_PLACE_AMBIENCE, FINALE_SCENES, FINALE_SCENE_BGM, FINALE_SCENE_IDS, FINALE_SPEAKERS, finaleBackdrop, finaleFrame, finaleMusicAt, type FinaleLine } from './chapter1Finale';
import { SFX_IDS } from '../audio/sfx';
import { finaleBeat, FINALE_STAGES } from '../../core/world/chapterFinale';
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

  it('the hooded man: the first lock opens, the second flows back, he leaves before it is fully awake — unexplained, not killed, not named as the tavern\'s guest', () => {
    const lines = FINALE_SCENES.RUINS_SEAL.lines;
    const ruins = lines.map((l) => l.text).join('\n');
    const his = said(FINALE_SPEAKERS.HOODED);
    // 作者指示 2026-10-12: these, and the one telling word (「まだ起きるはずじゃなかった。」) — nothing more.
    expect(his.split('\n')).toEqual(['……第一封鎖、解除。', '次だ。', '……違う。', '第二封鎖が……逆流している？', '……まずい。', 'まだ起きるはずじゃなかった。']);
    expect(ruins).toContain('消えた');
    // He is gone before it is fully awake.
    const gone = lines.findIndex((l) => l.text.includes('消えた'));
    const awake = lines.findIndex((l) => l.text.includes('完全起動'));
    expect(gone).toBeGreaterThan(0);
    expect(awake).toBeGreaterThan(gone);
    for (const word of ['酒場', '客', '目的', '計画']) expect(ruins, word).not.toContain(word);
    // It does not look at him: it looks toward the village.
    expect(ruins).toContain('村のある方角');
  });

  it('Grave decides not to fight in the village; out to the grassland; the village fights its own way too (Mirei, Rizel, the bakery)', () => {
    const raid = FINALE_SCENES.RAID.lines;
    const said3 = (who: string, t: string) => raid.some((l) => l.speaker === who && l.text === t);
    expect(said3(FINALE_SPEAKERS.GRAVE, 'ここでやり合ったら村がもたねぇ！')).toBe(true);
    expect(said3(FINALE_SPEAKERS.HERO, '外へ引きつける。')).toBe(true);
    expect(said3(FINALE_SPEAKERS.KAOS, '草原なら被害を抑えられる。')).toBe(true);
    expect(said3(FINALE_SPEAKERS.GRAVE, '決まりだ。引っ張るぞ！')).toBe(true);
    // In the raid itself, the village moves too.
    expect(said3(FINALE_SPEAKERS.MIREI, 'こっち！ 道を空けて！')).toBe(true);
    expect(said3(FINALE_SPEAKERS.RIZEL, '歩ける人は、動けない人を手伝って！')).toBe(true);
    expect(said3(FINALE_SPEAKERS.OWNER, 'リナ、離れるな！')).toBe(true);
    expect(said3(FINALE_SPEAKERS.LINA, 'うん！')).toBe(true);
    expect(said(FINALE_SPEAKERS.MIREI)).toContain('包帯');
    expect(said(FINALE_SPEAKERS.RIZEL)).toContain('巻');
    expect(said(FINALE_SPEAKERS.LINA) + said(FINALE_SPEAKERS.OWNER)).toContain('火');
    // The raid is in the half-broken village (not destroyed): its own picture.
    expect(FINALE_SCENES.RAID.place).toBe('VILLAGE_BROKEN');
    expect(FINALE_SCENES.RAID.lines.map((l) => l.text).join('')).not.toMatch(/全滅|消え去|跡形/);
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
    }
    expect([...played].sort()).toEqual([...FINALE_SCENE_IDS].sort());
    expect(new Set(played).size).toBe(played.length);
  });
});

describe('第1章終盤 手順3 — 絵と音 (2026-10-12)', () => {
  it('the ruins’ depths (作者指示 2026-10-12): dark, the room, the figure at the device (blue), the refusal (red), the waking — shown a little at a time — then the empty room', () => {
    const ruins = FINALE_SCENES.RUINS_SEAL;
    const order: string[] = [];
    const frames: string[] = [];
    ruins.lines.forEach((_, i) => {
      const b = finaleBackdrop(ruins, i);
      if (order[order.length - 1] !== b) order.push(b);
      const f = finaleFrame(ruins, i);
      if (f && frames[frames.length - 1] !== f) frames.push(f);
    });
    expect(order).toEqual(['DARK', 'RUINS_DEPTHS', 'RUINS_UNSEALING', 'RUINS_REFUSED', 'VALSHEEL_AWAKENING', 'RUINS_DEPTHS']);
    // Never the whole creature at once: its eye, its head, a foreleg, its upper body.
    expect(frames).toEqual(['EYE', 'HEAD', 'PAW', 'UPPER']);
    // The refusal from 「装置が、赤く光った」.
    expect(ruins.lines.findIndex((l) => l.cg === 'RUINS_REFUSED')).toBe(ruins.lines.findIndex((l) => l.text === '装置が、赤く光った。'));
    // He sees its eye light, steps back, and is gone while only its eye is shown (his figure is out of the frame after).
    const gone = ruins.lines.findIndex((l) => l.text.includes('消えた'));
    expect(finaleFrame(ruins, gone)).toBe('EYE');
    // Its name in full once it is fully awake; it takes the village’s people for intruders.
    const text = ruins.lines.map((l) => l.text).join('\n');
    expect(text).toContain('封殻機兵');
    expect(text).toContain('侵入者');
    expect(text).toContain('村のある方角');
    // A frame ends with its picture.
    expect(finaleFrame(ruins, ruins.lines.length - 1)).toBeNull();
  });

  it('a scene with no picture named is its place', () => {
    expect(finaleBackdrop(FINALE_SCENES.EVE, 0)).toBe('HOME');
    expect(finaleBackdrop(FINALE_SCENES.LURE, 3)).toBe(FINALE_SCENES.LURE.place);
  });

  it('music: the hymn in the ruins, 立ち向かう背中 from the quake to the fight, the village’s own the night before', () => {
    expect(FINALE_SCENE_BGM.EVE).toBeUndefined();
    // The stop lets the music go; what follows is the village's own for now.
    expect(FINALE_SCENE_BGM.STOPPED).toBe('HUSH');
    expect(FINALE_SCENE_BGM.RETURN).toBeUndefined();
    expect(FINALE_SCENE_BGM.RUINS_SEAL).toBe('CHURCH_HYMN');
    for (const id of ['MORNING', 'RAID', 'LURE', 'VILLAGE_MIREI', 'FORM1_START'] as const) expect(FINALE_SCENE_BGM[id]).toBe('CHAPTER1_FINAL_BOSS');
    expect(FINALE_FIGHT_BGM).toBe('CHAPTER1_FINAL_BOSS');
  });
});

describe('第1章終盤 — 半壊の文脈では通常の村を使わない (作者指示 2026-10-12)', () => {
  it('every village scene that speaks of fire, water buckets, rubble, smoke, shelter or running is drawn in the broken village', () => {
    const signs = /火|桶|瓦礫|煙|避難|倉庫|逃げろ|崩れ|包帯|手当/;
    for (const id of FINALE_SCENE_IDS) {
      const scene = FINALE_SCENES[id];
      if (scene.place !== 'VILLAGE' && scene.place !== 'VILLAGE_BROKEN') continue;
      const words = scene.lines.map((l) => l.text).join('\n');
      if (signs.test(words)) expect(scene.place, id).toBe('VILLAGE_BROKEN');
    }
    expect(FINALE_SCENES.VILLAGE_BAKERY.place).toBe('VILLAGE_BROKEN');
    // The morning, before the raid: still the village as it was.
    expect(FINALE_SCENES.MORNING.place).toBe('VILLAGE');
  });
});

describe('the 間, the sounds and the music of the finale (作者「無料強化メモ②」2026-10-17)', () => {
  const line = (scene: keyof typeof FINALE_SCENES, has: string) => FINALE_SCENES[scene].lines.find((l) => l.text.includes(has))!;

  it('every 間 is one of the author\'s three — light 200–400, felt 500–800, lingering 800–1500ms', () => {
    const pauses = all.filter((l) => l.pause !== undefined).map((l) => l.pause!);
    expect(pauses.length).toBeGreaterThan(10);
    for (const p of pauses) {
      expect(p).toBeGreaterThanOrEqual(200);
      expect(p).toBeLessThanOrEqual(1500);
    }
  });

  it('every sound is a real one of the vocabulary', () => {
    for (const l of all.filter((x) => x.se)) expect(SFX_IDS as readonly string[]).toContain(l.se);
  });

  it('ヴァルシール wakes in the author\'s order: red light (the music falls away) → a low machine sound → 「……違う。」 → 0.7s → the eye → the paw → fully awake, with its sound', () => {
    const s = FINALE_SCENES.RUINS_SEAL;
    const at = (has: string) => s.lines.findIndex((l) => l.text.includes(has));
    expect(line('RUINS_SEAL', '装置が、赤く光った。').music).toBe('DROP');
    expect(finaleMusicAt(s, at('装置が、赤く光った。') - 1)).toBeNull();
    // From the red light on, the hymn is gone — to the end of the scene.
    for (let i = at('装置が、赤く光った。'); i < s.lines.length; i++) expect(finaleMusicAt(s, i)).toBe('DROP');
    expect(line('RUINS_SEAL', '低い機械音').se).toBe('story_rumble');
    expect(line('RUINS_SEAL', '床の封印紋').pause).toBe(700);
    expect(line('RUINS_SEAL', '巨大な目が灯った').pause).toBe(700);
    expect(line('RUINS_SEAL', '完全起動').se).toBe('battle_boss_emerge');
    expect(at('低い機械音')).toBeLessThan(at('……違う。'));
    expect(at('……違う。')).toBeLessThan(at('巨大な目'));
  });

  it('before the fight on the grassland the music falls away (「止める。」), a breath on 「おう。」; the finishers dip it a little', () => {
    expect(line('FORM1_START', '止める。').music).toBe('DROP');
    expect(line('FORM1_START', 'おう。').pause).toBe(500);
    expect(line('KAOS_FINISHER', '本気、出すから').music).toBe('DIP');
    expect(line('HERO_FINISHER', 'ここで、終わらせる').music).toBe('DIP');
  });

  it('after the stop: no music, and the words that linger wait for it', () => {
    expect(FINALE_SCENE_BGM.STOPPED).toBe('HUSH');
    expect(line('STOPPED', '……止まった、のか。').pause).toBe(1000);
  });

  it('the raid is heard as much as seen: the fence, the barn roof, the fire', () => {
    expect(line('RAID', '柵を踏み砕いて').se).toBeDefined();
    expect(line('RAID', '納屋の屋根').se).toBeDefined();
    expect(line('RAID', '火の手').se).toBeDefined();
  });

  it('each place its own air, low: wind on the grassland and the road, a hum in the depths, fire in the broken village, nothing on the windless night', () => {
    expect(FINALE_PLACE_AMBIENCE.GRASSLAND).toBe('WIND');
    expect(FINALE_PLACE_AMBIENCE.ROAD).toBe('WIND');
    expect(FINALE_PLACE_AMBIENCE.RUINS_DEPTHS).toBe('HUM');
    expect(FINALE_PLACE_AMBIENCE.VILLAGE_BROKEN).toBe('FIRE');
    expect(FINALE_PLACE_AMBIENCE.HOME).toBeNull();
  });

  it('零閃・天衝 is the hero\'s, played over the picture as the stop begins (its cut first, then the words)', () => {
    const l = line('STOPPED', '金色の光が、ゆっくりと弱まっていく。');
    expect(l.fx).toBe('ZERO_TENSHOU');
    expect(l.pause).toBeGreaterThanOrEqual(800);
    // Nowhere else: no other line plays it, and no one else's scene has it.
    expect(all.filter((x) => x.fx)).toHaveLength(1);
  });

  it('a BACK ends a DROP within the scene', () => {
    const scene = { id: 'EVE' as const, place: 'HOME' as const, lines: [{ speaker: null, text: 'a', music: 'DROP' as const }, { speaker: null, text: 'b' }, { speaker: null, text: 'c', music: 'BACK' as const }] };
    expect([0, 1, 2].map((i) => finaleMusicAt(scene, i))).toEqual(['DROP', 'DROP', null]);
  });
});
