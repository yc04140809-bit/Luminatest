import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createBattle, playerAttack, playerSkill, skillReadyIn, type EnemySpec } from '../../game/battle/battleLogic';
import { specOf } from '../../game/battle/enemySpec';
import { statsForLevels } from '../../core/progression/levelStats';
import { SHUNDAN } from '../skills/heroSkills';
import { FIRST_SIGHT, GREENWOOD_ENCOUNTERS, HYOUREI_MET_FROM_POINT, firstSightMark, wildOpenIn, wildSpeciesFor, type WildFacts } from './encounters';
import { HYOUREI, HYOUREI_CHARACTER_ID, HYOUREI_FORGE_INDIVIDUAL_ID } from './hyourei';
import { ENEMY_SPECIES, MOSS_RABBIT } from './species';
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
    expect(open(f({ point: INCIDENT_PHASE_AT[2] }))).toEqual(['moss_rabbit']);
    expect(open(f({ point: HYOUREI_MET_FROM_POINT }))).toEqual(['moss_rabbit', 'hyourei']);
    expect(open(f({ point: 12, fuumimiAnswered: true }))).toEqual(['moss_rabbit', 'fuumimi', 'hyourei']);
    // Not before セキリュウガ's part, whatever the point.
    expect(open(f({ stage: 'BEATEN', point: 20 }))).toEqual(['moss_rabbit']);
  });

  it('the rabbit stays the commonest: with all three, 6 in 10 of the forest’s fights', () => {
    const all = f({ point: 12, fuumimiAnswered: true });
    const count: Record<string, number> = {};
    for (let i = 0; i < 1000; i++) {
      const s = wildSpeciesFor(all, i / 1000);
      count[s] = (count[s] ?? 0) + 1;
    }
    expect(count).toEqual({ moss_rabbit: 600, fuumimi: 200, hyourei: 200 });
    // Before any of them: always the rabbit, whatever the roll.
    for (const roll of [0, 0.5, 0.999]) expect(wildSpeciesFor(f(), roll)).toBe('moss_rabbit');
    expect(GREENWOOD_ENCOUNTERS.every((e) => ENEMY_SPECIES[e.speciesId])).toBe(true);
  });

  it('every one met in an ordinary fight is priced; a few lines the first time for the new kinds, under their own note', () => {
    for (const e of GREENWOOD_ENCOUNTERS) expect(rewardForSpecies(e.speciesId)?.exp, e.speciesId).toBeGreaterThan(0);
    expect(Object.keys(FIRST_SIGHT).sort()).toEqual(['fuumimi', 'hyourei']);
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
