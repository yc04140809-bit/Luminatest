import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBattle, playerAttack, playerSkill, skillReadyIn, type EnemySpec } from '../../game/battle/battleLogic';
import { specOf } from '../../game/battle/enemySpec';
import { statsForLevels } from '../../core/progression/levelStats';
import { SHUNDAN } from '../skills/heroSkills';
import { FIRST_SIGHT, GREENWOOD_ENCOUNTERS, FUUMIMI_FIRST_SIGHT_UNMET, FUUMIMI_KIND_FROM_POINT, HYOUREI_MET_FROM_POINT, IWAHORO_MET_FROM_POINT, KOKEMARU_MET_FROM_POINT, firstSightLines, firstSightMark, wildOpenIn, wildSpeciesFor, type WildFacts } from './encounters';
import { IWAHORO, IWAHORO_CHARACTER_ID, IWAHORO_FORGE_INDIVIDUAL_ID } from './iwahoro';
import { KOKEMARU, KOKEMARU_CHARACTER_ID, KOKEMARU_FORGE_INDIVIDUAL_ID } from './kokemaru';
import { HYOUREI, HYOUREI_CHARACTER_ID, HYOUREI_FORGE_INDIVIDUAL_ID } from './hyourei';
import { ENEMY_SPECIES, MOSS_RABBIT } from './species';
import { FUUMIMI_ENCOUNTER_LINES, fuumimiEncounterLines } from './fuumimi';
import { rewardForSpecies } from '../progression/enemyRewards';
import { INCIDENT_PHASE_AT } from '../../core/world/aldenIncident';
import { VILLAGE_RUMORS } from '../story/villageRumors';

/** The forest's ordinary fights (作者判断 2026-10-10): every FORGE creature a part of the forest's life, unless there is a reason not. */

const f = (over: Partial<WildFacts> = {}): WildFacts => ({ stage: 'SETTLED', point: 0, fuumimiAnswered: false, ...over });
const open = (facts: WildFacts) => wildOpenIn(facts).map((e) => e.speciesId);

describe('who is met, and from when', () => {
  it('the rabbit always; フウミミ’s kind once its one individual has been answered; ヒョウレイ a little after its rumour', () => {
    expect(open(f({ stage: 'NONE' }))).toEqual(['moss_rabbit']);
    expect(open(f())).toEqual(['moss_rabbit']);
    expect(open(f({ fuumimiAnswered: true }))).toEqual(['moss_rabbit', 'fuumimi']);
    // Its rumour comes at phase 2 (6 points); it is met from 8 — by doing, never by reading.
    const rumour = VILLAGE_RUMORS.find((r) => r.id === 'INC_SHINING_WINGS')!;
    expect(rumour.when).toBe('INCIDENT_2');
    expect(HYOUREI_MET_FROM_POINT).toBeGreaterThan(INCIDENT_PHASE_AT[2]);
    // イワホロ from the signs' second phase; ヒョウレイ two steps on.
    expect(IWAHORO_MET_FROM_POINT).toBe(INCIDENT_PHASE_AT[2]);
    expect(open(f({ point: INCIDENT_PHASE_AT[2] - 1 }))).toEqual(['moss_rabbit']);
    expect(open(f({ point: INCIDENT_PHASE_AT[2] }))).toEqual(['moss_rabbit', 'iwahoro']);
    expect(open(f({ point: HYOUREI_MET_FROM_POINT }))).toEqual(['moss_rabbit', 'hyourei', 'iwahoro']);
    // コケマル from the third phase — the rumour that the forest's creatures are running from something is already there.
    expect(KOKEMARU_MET_FROM_POINT).toBe(INCIDENT_PHASE_AT[3]);
    expect(VILLAGE_RUMORS.find((r) => r.id === 'INC_RUNNING_FROM')?.when).toBe('INCIDENT_3');
    expect(open(f({ point: INCIDENT_PHASE_AT[3] - 1 }))).toEqual(['moss_rabbit', 'hyourei', 'iwahoro']);
    expect(open(f({ point: INCIDENT_PHASE_AT[3] }))).toEqual(['moss_rabbit', 'hyourei', 'iwahoro', 'kokemaru']);
    expect(open(f({ point: 12, fuumimiAnswered: true }))).toEqual(['moss_rabbit', 'fuumimi', 'hyourei', 'iwahoro', 'kokemaru']);
    // Not before セキリュウガ's part, whatever the point.
    expect(open(f({ stage: 'BEATEN', point: 20 }))).toEqual(['moss_rabbit']);
  });

  it('the rabbit stays the commonest: with all five, still the most of the forest’s fights (6 : 2 : 2 : 2 : 2)', () => {
    const all = f({ point: 12, fuumimiAnswered: true });
    const count: Record<string, number> = {};
    for (let i = 0; i < 1400; i++) {
      const s = wildSpeciesFor(all, i / 1400);
      count[s] = (count[s] ?? 0) + 1;
    }
    expect(count).toEqual({ moss_rabbit: 600, fuumimi: 200, hyourei: 200, iwahoro: 200, kokemaru: 200 });
    // Before any of them: always the rabbit, whatever the roll.
    for (const roll of [0, 0.5, 0.999]) expect(wildSpeciesFor(f(), roll)).toBe('moss_rabbit');
    expect(GREENWOOD_ENCOUNTERS.every((e) => ENEMY_SPECIES[e.speciesId])).toBe(true);
  });

  it('every one met in an ordinary fight is priced; a few lines the first time for the new kinds, under their own note', () => {
    for (const e of GREENWOOD_ENCOUNTERS) expect(rewardForSpecies(e.speciesId)?.exp, e.speciesId).toBeGreaterThan(0);
    expect(Object.keys(FIRST_SIGHT).sort()).toEqual(['fuumimi', 'hyourei', 'iwahoro', 'kokemaru']);
    expect(firstSightMark('hyourei')).toBe('note:FIRST_SIGHT_hyourei');
  });
});

describe('ヒョウレイ (FORGE MON-000008): an ordinary creature, not a boss and not one event’s', () => {
  it('FORGE’s IDs, referenced only; nothing written into content/forge; the individual FORGE sent is kept aside', () => {
    expect(HYOUREI_CHARACTER_ID).toBe('MON-000008');
    expect(HYOUREI_FORGE_INDIVIDUAL_ID).toBe('IND-2262C6F7');
    const forge = join(__dirname, '..', 'forge');
    const all = readdirSync(forge, { recursive: true })
      .map(String)
      .filter((p) => /\.(ts|json)$/.test(p) && !p.endsWith('.test.ts'))
      .map((p) => readFileSync(join(forge, p), 'utf8'))
      .join('\n');
    expect(all).not.toContain('MON-000008');
    expect(JSON.stringify(HYOUREI)).not.toContain('IND-2262C6F7');
  });

  it('毒針 and 高速移動 only (no poison or paralysis — the battle has neither); a sword glances off a little; the star is plain', () => {
    expect(HYOUREI.attackName).toBe('毒針');
    expect(HYOUREI.skill.name).toBe('高速移動');
    expect(JSON.stringify(HYOUREI)).not.toMatch(/麻痺|毒状態/);
    expect(HYOUREI.affinity?.physicalResistance).toBe(0.2);
    expect(HYOUREI.affinity?.elementWeakness).toBeUndefined();
    // Quick: its slip comes round often.
    expect(HYOUREI.skill.cooldown).toBeLessThan(MOSS_RABBIT.skill.cooldown);
    expect(HYOUREI.defeatedText).not.toMatch(/死|息絶/);
  });

  it('measured (2000 seeded fights, Lv2, blade and 《瞬断》): a little longer than the rabbit, shorter than フウミミ; never lost', () => {
    const seeded = (a: number) => () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const measure = (spec: EnemySpec) => {
      let turns = 0;
      let won = 0;
      for (let i = 1; i <= 2000; i++) {
        const rng = seeded(i);
        let s = createBattle(spec, undefined, { stats: statsForLevels(2, 2), magicUnlocked: true });
        let t = 0;
        while (s.outcome === 'ONGOING' && t < 80) {
          t++;
          s = skillReadyIn(s, SHUNDAN) === 0 ? playerSkill(s, SHUNDAN, rng) : playerAttack(s, rng);
        }
        turns += t;
        if (s.outcome === 'VICTORY') won++;
      }
      return { turns: turns / 2000, win: won / 2000 };
    };
    const rabbit = measure(specOf(MOSS_RABBIT));
    const hyourei = measure(specOf(HYOUREI));
    const fuumimi = measure(specOf(ENEMY_SPECIES.fuumimi));
    expect(hyourei.turns).toBeGreaterThan(rabbit.turns);
    expect(hyourei.turns).toBeLessThan(fuumimi.turns);
    expect(hyourei.win).toBeGreaterThanOrEqual(0.99);
  });
});

describe('イワホロ (FORGE MON-000009): an ordinary creature — steady, aggressive, the forest’s hardest hitter', () => {
  it('FORGE’s IDs, referenced only; the individual FORGE sent is kept aside', () => {
    expect(IWAHORO_CHARACTER_ID).toBe('MON-000009');
    expect(IWAHORO_FORGE_INDIVIDUAL_ID).toBe('IND-E32B5633');
    expect(JSON.stringify(IWAHORO)).not.toContain('IND-E32B5633');
    const forge = join(__dirname, '..', 'forge');
    const all = readdirSync(forge, { recursive: true })
      .map(String)
      .filter((p) => /\.(ts|json)$/.test(p) && !p.endsWith('.test.ts'))
      .map((p) => readFileSync(join(forge, p), 'utf8'))
      .join('\n');
    expect(all).not.toContain('MON-000009');
  });

  it('吸収 and a rare 高速移動 (no poison, paralysis or earth — the battle has none); its own weakness to her star (強い光を嫌う is how it lives, not of itself a weakness); cornered, it hits harder', () => {
    expect(IWAHORO.attackName).toBe('吸収');
    expect(IWAHORO.skill.name).toBe('高速移動');
    expect(IWAHORO.skill.chance).toBeLessThan(HYOUREI.skill.chance);
    expect(JSON.stringify(IWAHORO)).not.toMatch(/麻痺|毒/);
    expect(IWAHORO.affinity?.elementWeakness?.STAR).toBeGreaterThan(0);
    expect(IWAHORO.phases?.[0]).toMatchObject({ id: 'NEST', attack: 1.4 });
    expect(IWAHORO.defeatedText).not.toMatch(/死|息絶/);
  });

  it('measured (2000 seeded fights, Lv2, blade and 《瞬断》): about as long as the rabbit, but it hurts the most', () => {
    const seeded = (a: number) => () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const measure = (spec: EnemySpec) => {
      let turns = 0;
      let hurt = 0;
      let won = 0;
      for (let i = 1; i <= 2000; i++) {
        const rng = seeded(i);
        let s = createBattle(spec, undefined, { stats: statsForLevels(2, 2), magicUnlocked: true });
        let t = 0;
        while (s.outcome === 'ONGOING' && t < 80) {
          t++;
          s = skillReadyIn(s, SHUNDAN) === 0 ? playerSkill(s, SHUNDAN, rng) : playerAttack(s, rng);
        }
        turns += t;
        hurt += s.playerMaxHp - s.playerHp;
        if (s.outcome === 'VICTORY') won++;
      }
      return { turns: turns / 2000, hurt: hurt / 2000, win: won / 2000 };
    };
    const rabbit = measure(specOf(MOSS_RABBIT));
    const iwahoro = measure(specOf(IWAHORO));
    const others = ['fuumimi', 'hyourei'].map((id) => measure(specOf(ENEMY_SPECIES[id as 'fuumimi'])));
    expect(iwahoro.turns).toBeGreaterThanOrEqual(rabbit.turns);
    expect(iwahoro.turns).toBeLessThan(others[0].turns);
    for (const o of [rabbit, ...others]) expect(iwahoro.hurt).toBeGreaterThan(o.hurt);
    expect(iwahoro.win).toBeGreaterThanOrEqual(0.99);
  });
});

describe('コケマル (FORGE MON-000010): an ordinary creature — quick, curious, the hardest single blows', () => {
  it('FORGE’s IDs, referenced only; the individual FORGE sent is kept aside', () => {
    expect(KOKEMARU_CHARACTER_ID).toBe('MON-000010');
    expect(KOKEMARU_FORGE_INDIVIDUAL_ID).toBe('IND-7798AECD');
    expect(JSON.stringify(KOKEMARU)).not.toContain('IND-7798AECD');
    const forge = join(__dirname, '..', 'forge');
    const all = readdirSync(forge, { recursive: true })
      .map(String)
      .filter((p) => /\.(ts|json)$/.test(p) && !p.endsWith('.test.ts'))
      .map((p) => readFileSync(join(forge, p), 'utf8'))
      .join('\n');
    expect(all).not.toContain('MON-000010');
  });

  it('投石 and 地形同化 (no 高速移動 — ヒョウレイ’s — and no poison); no weakness (強い光を嫌う is how it lives; its own second element is light); curled up and hiding more once hurt', () => {
    expect(KOKEMARU.attackName).toBe('投石');
    expect(KOKEMARU.skill.name).toBe('地形同化');
    expect(JSON.stringify(KOKEMARU)).not.toMatch(/高速移動|毒/);
    expect(KOKEMARU.affinity).toEqual({});
    expect(KOKEMARU.phases?.[0]).toMatchObject({ id: 'CURLED' });
    expect(KOKEMARU.phases![0].skillChance!).toBeGreaterThan(KOKEMARU.skill.chance);
    for (const s of Object.values(ENEMY_SPECIES)) if (s !== KOKEMARU) expect(KOKEMARU.attackMax).toBeGreaterThan(s.attackMax);
    expect(KOKEMARU.hp).toBeLessThan(MOSS_RABBIT.hp);
    expect(KOKEMARU.defeatedText).not.toMatch(/死|息絶/);
    // What it drops is something it had picked up: a round acorn, no new material.
    expect(rewardForSpecies('kokemaru')?.items).toEqual([{ itemId: 'ROUND_ACORN', quantity: 1 }]);
  });

  it('measured (2000 seeded fights, Lv2, blade and 《瞬断》): the shortest fight in the forest, but more hurt than the rabbit for it', () => {
    const seeded = (a: number) => () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const measure = (spec: EnemySpec) => {
      let turns = 0;
      let hurt = 0;
      let won = 0;
      for (let i = 1; i <= 2000; i++) {
        const rng = seeded(i);
        let s = createBattle(spec, undefined, { stats: statsForLevels(2, 2), magicUnlocked: true });
        let t = 0;
        while (s.outcome === 'ONGOING' && t < 80) {
          t++;
          s = skillReadyIn(s, SHUNDAN) === 0 ? playerSkill(s, SHUNDAN, rng) : playerAttack(s, rng);
        }
        turns += t;
        hurt += s.playerMaxHp - s.playerHp;
        if (s.outcome === 'VICTORY') won++;
      }
      return { turns: turns / 2000, hurt: hurt / 2000, win: won / 2000 };
    };
    const kokemaru = measure(specOf(KOKEMARU));
    const rabbit = measure(specOf(MOSS_RABBIT));
    for (const id of ['moss_rabbit', 'fuumimi', 'hyourei', 'iwahoro'] as const) expect(kokemaru.turns).toBeLessThan(measure(specOf(ENEMY_SPECIES[id])).turns);
    expect(kokemaru.hurt).toBeGreaterThan(rabbit.hurt);
    expect(kokemaru.hurt / kokemaru.turns).toBeGreaterThan(rabbit.hurt / rabbit.turns);
    expect(kokemaru.win).toBeGreaterThanOrEqual(0.99);
  });
});

describe('フウミミ’s kind, if its one individual is never answered (作者判断 2026-10-11, A)', () => {
  it('from 12 points the kind is met anyway — after セキリュウガ’s part only; before 12, still only once answered', () => {
    expect(FUUMIMI_KIND_FROM_POINT).toBe(12);
    expect(open(f({ point: 11 }))).not.toContain('fuumimi');
    expect(open(f({ point: 12 }))).toEqual(['moss_rabbit', 'fuumimi', 'hyourei', 'iwahoro', 'kokemaru']);
    expect(open(f({ stage: 'BEATEN', point: 20 }))).toEqual(['moss_rabbit']);
    // Answered early: as before, whatever the point.
    expect(open(f({ point: 0, fuumimiAnswered: true }))).toEqual(['moss_rabbit', 'fuumimi']);
  });

  it('the first sight then says nothing of "the same as that time" — there was no that time; answered, it does', () => {
    const unmet = firstSightLines('fuumimi', { fuumimiAnswered: false })!;
    expect(unmet).toBe(FUUMIMI_FIRST_SIGHT_UNMET);
    expect(unmet[0].text).toBe('翅の音。見たことのない生き物が、茂みから飛び出してきた。');
    expect(unmet.map((l) => l.text).join('')).not.toContain('あの時');
    expect(firstSightLines('fuumimi', { fuumimiAnswered: true })![0].text).toContain('あの時と同じ姿');
    // The others are as they were; the rabbit has none.
    expect(firstSightLines('hyourei', { fuumimiAnswered: false })).toBe(FIRST_SIGHT.hyourei);
    expect(firstSightLines('moss_rabbit', { fuumimiAnswered: false })).toBeNull();
  });

  it('the one individual, met after its kind: not "a shape not seen around here" but the one seen in the forest', () => {
    expect(fuumimiEncounterLines(false)).toBe(FUUMIMI_ENCOUNTER_LINES);
    const seen = fuumimiEncounterLines(true).map((l) => l.text);
    expect(seen.join('')).not.toContain('この辺りでは見ない姿');
    expect(seen[1]).toContain('森の奥で見かけた、あの生き物と同じ姿');
    expect(seen.at(-1)).toBe(FUUMIMI_ENCOUNTER_LINES.at(-1)!.text);
  });
});
