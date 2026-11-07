import { describe, expect, it } from 'vitest';
import {
  createPartyBattle,
  currentActor,
  enemyAct,
  isEnemyId,
  partyAct,
  partyAutoAction,
  type PartyBattleState,
  type PartyMemberSpec,
} from '../../game/battle/partyBattle';
import { GRAVE_GUEST, carriedInto, heroAndKaos } from '../characters/partyMembers';
import { HERO_STARTING_SKILLS } from '../skills/heroSkills';
import { MAGIC_DEFS } from '../magic/magicDefs';
import { VALSHEEL_FORM1_PROVISIONAL, VALSHEEL_FORM2_PROVISIONAL, VALSHEEL_NAME, VALSHEEL_TITLE } from './valsheelBattle';

const lv1 = (): PartyMemberSpec[] => [
  ...heroAndKaos({
    heroName: '主人公',
    heroLevel: 1,
    kaosLevel: 1,
    condition: { hero: { currentHp: 100, maxHp: 100 }, kaos: { currentHp: 100, maxHp: 100, currentMp: 48, maxMp: 48 } },
    heroAttack: { min: 8, max: 12 },
    heroSkills: HERO_STARTING_SKILLS,
    kaosMagic: MAGIC_DEFS.filter((d) => d.effect === 'DAMAGE' || d.effect === 'MEND'),
  }),
  GRAVE_GUEST,
];

/** Seeded dice that cover the whole range. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fight(state: PartyBattleState, rng: () => number): PartyBattleState {
  let s = state;
  for (let i = 0; i < 3000 && s.outcome === 'ONGOING'; i++) s = isEnemyId(currentActor(s)) ? enemyAct(s, rng) : partyAct(s, partyAutoAction(s)!, rng);
  return s;
}

describe('ヴァルシール第2形態 (仮値, 2026-10-12)', () => {
  it('the same creature: its name, a giant, a boss, its own drawing; fresh health, a thinner guard', () => {
    expect(VALSHEEL_FORM2_PROVISIONAL).toMatchObject({ name: VALSHEEL_NAME, boss: true, battleScale: 'GIANT', artId: 'valsheel_form2' });
    expect(VALSHEEL_FORM2_PROVISIONAL.guard!).toBeLessThan(VALSHEEL_FORM1_PROVISIONAL.guard!);
    expect(VALSHEEL_TITLE).toBe('封殻機兵');
  });

  it('AUTO from level one, the first form then the second straight on (the party carried): won nearly always, and not without cost', () => {
    const seeds = Array.from({ length: 200 }, (_, i) => i + 1);
    const results = seeds.map((seed) => {
      const rng = mulberry32(seed);
      const one = fight(createPartyBattle(lv1(), VALSHEEL_FORM1_PROVISIONAL), rng);
      if (one.outcome !== 'VICTORY') return { won: false, left: 0, rounds: one.round, lostAt: 1 };
      const two = fight(createPartyBattle(carriedInto(lv1(), one.members), VALSHEEL_FORM2_PROVISIONAL), rng);
      const left = two.members.reduce((n, m) => n + m.hp / m.maxHp, 0) / 3;
      return { won: two.outcome === 'VICTORY', left, rounds: one.round + two.round, lostAt: two.outcome === 'VICTORY' ? 0 : 2 };
    });
    const wins = results.filter((x) => x.won);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    expect(wins.length / results.length).toBeGreaterThanOrEqual(0.9);
    // The first form alone is the lesson (AUTO loses none of it); the second is where it can go wrong.
    expect(results.filter((x) => x.lostAt === 1).length).toBe(0);
    // It costs something: they do not walk out of both whole — nor barely standing.
    expect(mean(wins.map((x) => x.left))).toBeGreaterThan(0.3);
    expect(mean(wins.map((x) => x.left))).toBeLessThan(0.75);
  });
});

describe('the party carried from one form to the next', () => {
  it('health and magic as they were; anyone down back up with 1; someone not there as they come', () => {
    const specs = lv1();
    const next = carriedInto(specs, [
      { id: 'hero', hp: 0, mp: 0 },
      { id: 'kaos', hp: 37, mp: 12 },
    ]);
    expect(next.map((m) => [m.id, m.hp, m.mp])).toEqual([
      ['hero', 1, 0],
      ['kaos', 37, 12],
      ['grave', undefined, undefined],
    ]);
  });
});
