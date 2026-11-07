import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { castMagic, createBattle, playerAttack, playerSkill, skillReadyIn, type EnemySpec } from '../../game/battle/battleLogic';
import { specOf } from '../../game/battle/enemySpec';
import { statsForLevels } from '../../core/progression/levelStats';
import { MAGIC_DEFS } from '../magic/magicDefs';
import { SHUNDAN } from '../skills/heroSkills';
import { FUUMIMI, FUUMIMI_ANSWER_NOW, FUUMIMI_INDIVIDUAL_DEFEATED, answerFuumimi, FUUMIMI_CHARACTER_ID, FUUMIMI_INDIVIDUAL_ID, fuumimiWaiting } from './fuumimi';
import { ENEMY_SPECIES, MOSS_RABBIT, individualName, speciesOfIndividual } from './species';
import { rewardForSpecies } from '../progression/enemyRewards';
import { memoryEventLabel } from '../events/creatureLifeChoice';
import { World } from '../../core/world/world';
import { IdbMemoryStore } from '../../core/memory/idbStore';
import { itemDef } from '../economy/itemDefs';

/** フウミミ (FORGE MON-000002, IND-43452DFD — 作者判断 2026-10-10): met once, as somebody. */

function seeded(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const bolt = MAGIC_DEFS.find((m) => m.id === 'starlight_bolt')!;

/** blade: 攻撃 and 《瞬断》 · star: her starlight bolt whenever she can, else the same. */
function fight(spec: EnemySpec, how: 'blade' | 'star', seed: number) {
  const rng = seeded(seed);
  let s = createBattle(spec, undefined, { stats: statsForLevels(3, 3), magicUnlocked: true });
  let turns = 0;
  while (s.outcome === 'ONGOING' && turns < 80) {
    turns++;
    if (how === 'star' && s.playerMp >= bolt.mpCost) s = castMagic(s, bolt, rng);
    else if (skillReadyIn(s, SHUNDAN) === 0) s = playerSkill(s, SHUNDAN, rng);
    else s = playerAttack(s, rng);
  }
  return { won: s.outcome === 'VICTORY', turns, hurt: s.playerMaxHp - s.playerHp };
}
function measure(spec: EnemySpec, how: 'blade' | 'star') {
  const N = 2000;
  let won = 0;
  let turns = 0;
  let hurt = 0;
  for (let i = 1; i <= N; i++) {
    const r = fight(spec, how, i);
    if (r.won) won++;
    turns += r.turns;
    hurt += r.hurt;
  }
  return { win: won / N, turns: turns / N, hurt: hurt / N };
}

describe('who it is', () => {
  it('FORGE’s IDs, kept as FORGE wrote them — never turned into an NPC_ID, nothing copied into content/forge', () => {
    expect(FUUMIMI_CHARACTER_ID).toBe('MON-000002');
    expect(FUUMIMI_INDIVIDUAL_ID).toBe('IND-43452DFD');
    expect(ENEMY_SPECIES.fuumimi).toBe(FUUMIMI);
    expect(speciesOfIndividual('IND-43452DFD')).toBe(FUUMIMI);
    expect(individualName('IND-43452DFD')).toBe('フウミミ');
    // An ordinary minted individual still reads as before.
    expect(speciesOfIndividual('moss_rabbit_001')).toBe(MOSS_RABBIT);
    const forge = join(__dirname, '..', 'forge');
    const all = readdirSync(forge, { recursive: true })
      .map(String)
      .filter((f) => /\.(ts|json)$/.test(f) && !f.endsWith('.test.ts'))
      .map((f) => readFileSync(join(forge, f), 'utf8'))
      .join('\n');
    expect(all).not.toContain('MON-000002');
    expect(all).not.toContain('IND-43452DFD');
  });

  it('the species and the one individual are two things: the kind is priced for ordinary fights (the individual’s fight pays nothing — the App gives it none)', () => {
    expect(rewardForSpecies('fuumimi')).toMatchObject({ exp: 22, lumi: 12 });
    expect(FUUMIMI.defeatedText).not.toBe(FUUMIMI_INDIVIDUAL_DEFEATED);
    expect(FUUMIMI_INDIVIDUAL_DEFEATED).toContain('翅を広げたまま');
  });
});

describe('how it fights: 突進 and 擬態 only — a hard body, a thing of magic', () => {
  it('two moves and no more (捕縛 and 温度操作 wait)', () => {
    expect(FUUMIMI.attackName).toBe('突進');
    expect(FUUMIMI.skill.name).toBe('擬態');
    expect(JSON.stringify(FUUMIMI)).not.toMatch(/捕縛|温度操作/);
  });

  it('a sword glances off where it would not off the rabbit; ice and thunder would go in, the star is plain', () => {
    expect(FUUMIMI.affinity?.physicalResistance).toBeGreaterThan(0);
    expect(MOSS_RABBIT.affinity?.physicalResistance ?? 0).toBe(0);
    expect(FUUMIMI.affinity?.elementWeakness).toEqual({ ICE: 0.5, THUNDER: 0.5 });
    expect(FUUMIMI.affinity?.elementWeakness?.STAR).toBeUndefined();
    expect(FUUMIMI.poise!.max).toBeGreaterThan(MOSS_RABBIT.poise!.max);
    // Lighter blows than the rabbit's at most.
    expect(FUUMIMI.attackMax).toBeLessThan(MOSS_RABBIT.attackMax);
  });

  it('measured (2000 seeded fights): by blade alone it is longer than the rabbit; with her star it is about as long — the fight asks for her', () => {
    const rabbit = measure(specOf(MOSS_RABBIT), 'blade');
    const blade = measure(specOf(FUUMIMI), 'blade');
    const star = measure(specOf(FUUMIMI), 'star');
    expect(blade.turns).toBeGreaterThan(rabbit.turns);
    expect(star.turns).toBeLessThan(blade.turns);
    expect(star.turns).toBeGreaterThanOrEqual(7);
    expect(star.turns).toBeLessThanOrEqual(13);
    expect(blade.win).toBeGreaterThanOrEqual(0.98);
    expect(star.win).toBeGreaterThanOrEqual(0.98);
  });
});

describe('when it is at the forest’s edge', () => {
  it('after セキリュウガ’s part, from the signs’ first phase, until it has been answered', () => {
    expect(fuumimiWaiting({ stage: 'BEATEN', phase: 3, answered: false })).toBe(false);
    expect(fuumimiWaiting({ stage: 'SETTLED', phase: 0, answered: false })).toBe(false);
    expect(fuumimiWaiting({ stage: 'SETTLED', phase: 1, answered: false })).toBe(true);
    expect(fuumimiWaiting({ stage: 'SETTLED', phase: 3, answered: false })).toBe(true);
    expect(fuumimiWaiting({ stage: 'SETTLED', phase: 2, answered: true })).toBe(false);
  });
});

describe('the four answers', () => {
  it('differ in kind and in when — nothing now for letting it go, a cost for helping, something now for the other two', () => {
    expect(FUUMIMI_ANSWER_NOW.SPARE).toEqual({});
    expect(FUUMIMI_ANSWER_NOW.HELP.gives).toEqual({ itemId: 'FOREST_HERB', quantity: 1 });
    expect(itemDef(FUUMIMI_ANSWER_NOW.KILL.item.itemId)).not.toBeNull();
    expect(FUUMIMI_ANSWER_NOW.CAPTURE.lumi).toBeGreaterThan(0);
    expect(FUUMIMI.individual.options.map((o) => o.id)).toEqual(['KILL', 'SPARE', 'HELP', 'CAPTURE']);
    const words = Object.values(FUUMIMI.individual.aftermath).join('');
    expect(words).not.toMatch(/正しい|正解|間違|よかった|ひどい/);
  });

  it('meeting it writes nothing into WORLD MEMORY; the answer does — under its own FORGE individual ID', async () => {
    const name = `fuumimi-${Math.random()}`;
    const w = await World.open(new IdbMemoryStore(name));
    const before = w.getKnownEvents().length;
    const met = await w.meetFixedIndividual(FUUMIMI_INDIVIDUAL_ID, 'fuumimi');
    expect(met).toMatchObject({ individualId: 'IND-43452DFD', speciesId: 'fuumimi', relationship: 'unknown' });
    expect(w.getKnownEvents().length).toBe(before);
    expect(w.getFuumimiAnswer()).toBeNull();
    // Met again: nothing changes.
    await w.meetFixedIndividual(FUUMIMI_INDIVIDUAL_ID, 'fuumimi');
    expect(w.getEnemyIndividuals().filter((i) => i.individualId === 'IND-43452DFD')).toHaveLength(1);

    const event = await w.recordCreatureLifeChoice(FUUMIMI_INDIVIDUAL_ID, 'HELP');
    expect(event.actors).toEqual(['PLAYER', 'IND-43452DFD']);
    expect(memoryEventLabel(event)).toContain('フウミミ');
    expect(w.getFuumimiAnswer()?.choice).toBe('HELP');
    expect(w.getEnemyIndividual('IND-43452DFD')?.relationship).toBe('helped');
    const again = await World.open(new IdbMemoryStore(name));
    expect(again.getFuumimiAnswer()?.choice).toBe('HELP');
    expect(again.getKnownEvents().length).toBe(before + 1);
  });

  it('what each answer leaves now, in the world (a herb set down only if one is carried)', async () => {
    const results: Record<string, { lumi: number; shard: number; herb: number }> = {};
    for (const choice of ['KILL', 'SPARE', 'HELP', 'CAPTURE'] as const) {
      const w = await World.open(new IdbMemoryStore(`fuumimi-${choice}-${Math.random()}`));
      await w.addItem('FOREST_HERB', 1);
      const before = { lumi: w.getLumi(), shard: w.getItemCount('MANA_SHARD'), herb: w.getItemCount('FOREST_HERB') };
      await w.meetFixedIndividual(FUUMIMI_INDIVIDUAL_ID, 'fuumimi');
      await answerFuumimi(w, choice);
      results[choice] = {
        lumi: w.getLumi() - before.lumi,
        shard: w.getItemCount('MANA_SHARD') - before.shard,
        herb: w.getItemCount('FOREST_HERB') - before.herb,
      };
      expect(w.getFuumimiAnswer()?.choice).toBe(choice);
    }
    expect(results).toEqual({
      KILL: { lumi: 0, shard: 1, herb: 0 },
      SPARE: { lumi: 0, shard: 0, herb: 0 },
      HELP: { lumi: 0, shard: 0, herb: -1 },
      CAPTURE: { lumi: 30, shard: 0, herb: 0 },
    });
    // Helping with nothing to give still helps: nothing is taken.
    const empty = await World.open(new IdbMemoryStore(`fuumimi-empty-${Math.random()}`));
    await empty.meetFixedIndividual(FUUMIMI_INDIVIDUAL_ID, 'fuumimi');
    const herbs = empty.getItemCount('FOREST_HERB');
    for (let i = 0; i < herbs; i++) await empty.removeItem('FOREST_HERB', 1);
    await answerFuumimi(empty, 'HELP');
    expect(empty.getItemCount('FOREST_HERB')).toBe(0);
  });
});
