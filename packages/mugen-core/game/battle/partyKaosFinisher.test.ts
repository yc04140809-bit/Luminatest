import { describe, expect, it } from 'vitest';
import {
  AUTO_COLLAPSE_COMBO,
  MAGIC_BLOW_SHARE,
  MAGIC_DOWN_TAKEN,
  MAGIC_DOWN_TURNS,
  collapseAim,
  createPartyBattle,
  currentActor,
  enemyAct,
  isEnemyId,
  magicBlowOf,
  memberById,
  partyAct,
  partyAutoAction,
  partySkillReady,
  skillReadyFor,
  skillWaitLeft,
  type PartyBattleState,
  type PartyMemberSpec,
} from './partyBattle';
import { GRAVE_GUEST, heroAndKaos } from '../../content/characters/partyMembers';
import { HERO_STARTING_SKILLS } from '../../content/skills/heroSkills';
import { SOUKYOKU_RINKAI, SOUKYOKU_RINKAI_READY } from '../../content/skills/kaosSkills';
import { COMET_STRIKE, MAGIC_DEFS } from '../../content/magic/magicDefs';
import { VALSHEEL_FORM2_PROVISIONAL } from '../../content/enemies/valsheelBattle';

// ケイオス 《双極臨界 → 界核崩壊》 (作者 2026-10-26「ケイオス必殺技 正式実装指示書」).

const fixed = (v: number) => () => v;
const party = (opts: { mp?: number; ready?: boolean } = {}): PartyMemberSpec[] => [
  ...heroAndKaos({
    heroName: '主人公',
    heroLevel: 1,
    kaosLevel: 1,
    condition: { hero: { currentHp: 100, maxHp: 100 }, kaos: { currentHp: 100, maxHp: 100, currentMp: opts.mp ?? 48, maxMp: 48 } },
    heroAttack: { min: 10, max: 10 },
    heroSkills: HERO_STARTING_SKILLS,
    kaosMagic: MAGIC_DEFS,
    ...(opts.ready ? { kaosSkills: [SOUKYOKU_RINKAI_READY] } : {}),
  }),
  GRAVE_GUEST,
];
const foe = { name: '試しの敵', hp: 500, attackMin: 10, attackMax: 10, speed: 12, breakMax: 99 };

function untilTurnOf(state: PartyBattleState, id: string): PartyBattleState {
  let s = state;
  for (let i = 0; i < 16 && currentActor(s) !== id; i++) s = isEnemyId(currentActor(s)) ? enemyAct(s, fixed(0)) : partyAct(s, { kind: 'DEFEND' });
  return s;
}
/** Her turn, `n` of hers taken before it (each a 身構える). */
function herTurn(state: PartyBattleState, n: number): PartyBattleState {
  let s = untilTurnOf(state, 'kaos');
  for (let i = 0; i < n; i++) s = untilTurnOf(partyAct(s, { kind: 'DEFEND' }), 'kaos');
  return s;
}
const kaos = (s: PartyBattleState) => memberById(s, 'kaos')!;
const collapse = (s: PartyBattleState, target?: string) => partyAct(s, { kind: 'SKILL', skillId: 'soukyoku_rinkai', target }, fixed(0));

describe('charged by her turns', () => {
  it('hers from the start of every party fight: 《双極臨界》, its last strike 界核崩壊', () => {
    const s = createPartyBattle(party(), foe);
    expect(kaos(s).skills?.map((k) => k.id)).toEqual(['soukyoku_rinkai']);
    expect(SOUKYOKU_RINKAI).toMatchObject({ name: '双極臨界', lastName: '界核崩壊', charge: 3, cooldown: 5, cuts: [0.4, 0.5, 0.5, 1.0], area: 'ALL', finisher: true });
  });

  it('never on her first three turns — 3, 2, 1 — ready on the fourth; full MP or none makes no difference', () => {
    for (const mp of [48, 0]) {
      let s = createPartyBattle(party({ mp }), foe);
      const left: number[] = [];
      for (let n = 0; n < 4; n++) {
        s = herTurn(s, n === 0 ? 0 : 1);
        left.push(skillWaitLeft(kaos(s), SOUKYOKU_RINKAI));
        if (n < 3) expect(collapse(s)).toBe(s);
      }
      expect(left).toEqual([3, 2, 1, 0]);
      expect(partySkillReady(kaos(s), SOUKYOKU_RINKAI)).toBe(true);
      expect(collapse(s)).not.toBe(s);
    }
  });

  it('used, then 4, 3, 2, 1 of her turns without it — ready again on the fifth', () => {
    let s = collapse(herTurn(createPartyBattle(party(), foe), 3));
    const left: number[] = [];
    for (let n = 0; n < 5; n++) {
      s = untilTurnOf(s, 'kaos');
      left.push(skillWaitLeft(kaos(s), SOUKYOKU_RINKAI));
      if (n < 4) {
        expect(collapse(s)).toBe(s);
        s = partyAct(s, { kind: 'DEFEND' });
      }
    }
    expect(left).toEqual([4, 3, 2, 1, 0]);
  });

  it('costs no MP', () => {
    const before = herTurn(createPartyBattle(party(), foe), 3);
    expect(kaos(collapse(before)).mp).toBe(kaos(before).mp);
  });
});

describe('four strikes at every creature standing', () => {
  it('0.4, 0.5, 0.5 and the collapse, 1.0, of her magic\'s blow (9 at her first level): 4·5·5·9, COMBO four', () => {
    const before = herTurn(createPartyBattle(party(), foe), 3);
    expect(magicBlowOf(kaos(before))).toBeCloseTo(20 * MAGIC_BLOW_SHARE);
    const s = collapse(before);
    expect(s.last).toMatchObject({ kind: 'SKILL', name: '双極臨界', hits: [4, 5, 5, 9], amount: 23 });
    expect(before.enemy.hp - s.enemy.hp).toBe(23);
    expect(s.combo).toEqual({ hits: 4, damage: 23 });
    expect(s.log).toContain('ケイオスの《双極臨界》！――界核崩壊！ 試しの敵に4・5・5・9のダメージ。');
  });

  it('as heavy as 《彼岸花》 in all (2.4 of a blow), heavier than any one spell of hers', () => {
    const total = SOUKYOKU_RINKAI.cuts!.reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(2.4);
    expect(total * 20 * MAGIC_BLOW_SHARE).toBeGreaterThan(COMET_STRIKE.power);
  });

  it('three creatures: four strikes on each, twelve to COMBO', () => {
    const s = collapse(herTurn(createPartyBattle(party(), [foe, foe, foe]), 3));
    expect(s.last!.spread!.map((x) => x.hits)).toEqual([
      [4, 5, 5, 9],
      [4, 5, 5, 9],
      [4, 5, 5, 9],
    ]);
    expect(s.combo.hits).toBe(12);
  });

  it('a creature brought down part-way drops out; the fight won by it is won', () => {
    const s = collapse(herTurn(createPartyBattle(party(), { ...foe, hp: 12 }), 3));
    expect(s.last!.hits).toEqual([4, 5, 5]);
    expect(s.outcome).toBe('VICTORY');
    expect(s.log.join('\n')).not.toContain('界核崩壊！');
  });
});

describe('魔防DOWN', () => {
  it('on each left standing: magic lands at 1.25× for three of its turns — said in the log, not on a swing', () => {
    let s = collapse(herTurn(createPartyBattle(party(), foe), 3));
    expect(s.enemy.magicDownTurns).toBe(MAGIC_DOWN_TURNS);
    expect(s.last!.magicDown).toBe(true);
    expect(s.log).toContain('試しの敵の魔法防御が下がった。（魔防DOWN）');
    // Her comet on it now: 20 × 1.25 (COMBO under 10 adds nothing).
    s = untilTurnOf(s, 'kaos');
    const comet = partyAct(s, { kind: 'MAGIC', magicId: COMET_STRIKE.id }, fixed(0));
    expect(comet.last!.amount).toBe(Math.round(COMET_STRIKE.power * MAGIC_DOWN_TAKEN));
    // A swing is a swing.
    const hero = untilTurnOf(collapse(herTurn(createPartyBattle(party(), foe), 3)), 'hero');
    expect(partyAct(hero, { kind: 'ATTACK' }, fixed(0)).last!.amount).toBe(10);
  });

  it('counted down by its own turns (as SLOWED), gone after the third', () => {
    let s = collapse(herTurn(createPartyBattle(party(), foe), 3));
    const seen: number[] = [];
    for (let i = 0; i < 3; i++) {
      s = untilTurnOf(s, 'enemy');
      s = enemyAct(s, fixed(0));
      seen.push(s.enemy.magicDownTurns);
    }
    expect(seen).toEqual([2, 1, 0]);
  });
});

describe('AUTO (作者 §AUTO): never early, never the turn it comes ready — BREAK, high COMBO, several, a boss worn down', () => {
  const autoAt = (s: PartyBattleState) => partyAutoAction(s);

  it('never on her first three turns, whatever stands before her', () => {
    let s = createPartyBattle(party(), [foe, foe, foe]);
    for (let n = 0; n < 3; n++) {
      s = herTurn(s, n === 0 ? 0 : 1);
      expect(autoAt(s)).not.toMatchObject({ kind: 'SKILL' });
    }
  });

  it('not the turn it comes ready (her fourth) — the next, with several standing', () => {
    const fourth = herTurn(createPartyBattle(party(), [foe, foe]), 3);
    expect(skillReadyFor(kaos(fourth), SOUKYOKU_RINKAI)).toBe(0);
    expect(autoAt(fourth)).not.toMatchObject({ kind: 'SKILL' });
    const fifth = herTurn(createPartyBattle(party(), [foe, foe]), 4);
    expect(autoAt(fifth)).toMatchObject({ kind: 'SKILL', skillId: 'soukyoku_rinkai' });
  });

  it('one creature, whole, COMBO low: kept back (a spell instead)', () => {
    const s = herTurn(createPartyBattle(party(), foe), 4);
    expect(collapseAim(s, kaos(s), SOUKYOKU_RINKAI)).toBeUndefined();
    expect(autoAt(s)).toMatchObject({ kind: 'MAGIC' });
  });

  it('first of all a creature BROKEN — aimed at it', () => {
    const s0 = herTurn(createPartyBattle(party(), [foe, foe]), 4);
    const s: PartyBattleState = { ...s0, enemies: s0.enemies.map((e, i) => (i === 1 ? { ...e, breakTurns: 2 } : e)) };
    expect(autoAt(s)).toEqual({ kind: 'SKILL', skillId: 'soukyoku_rinkai', target: 'enemy-2' });
  });

  it('a high COMBO, against one', () => {
    const s0 = herTurn(createPartyBattle(party(), foe), 4);
    expect(autoAt({ ...s0, combo: { hits: AUTO_COLLAPSE_COMBO - 1, damage: 50 } })).not.toMatchObject({ kind: 'SKILL' });
    expect(autoAt({ ...s0, combo: { hits: AUTO_COLLAPSE_COMBO, damage: 50 } })).toMatchObject({ kind: 'SKILL', skillId: 'soukyoku_rinkai' });
  });

  it('a boss worn down to 60% or under', () => {
    const boss = { ...foe, boss: true };
    const s0 = herTurn(createPartyBattle(party(), boss), 4);
    const at = (hp: number): PartyBattleState => ({ ...s0, enemies: [{ ...s0.enemy, hp }], enemy: { ...s0.enemy, hp } });
    expect(autoAt(at(310))).not.toMatchObject({ kind: 'SKILL' });
    expect(autoAt(at(300))).toMatchObject({ kind: 'SKILL', skillId: 'soukyoku_rinkai' });
  });

  it('not while what is left falls to one spell of hers', () => {
    const s0 = herTurn(createPartyBattle(party(), [foe, foe]), 4);
    const s: PartyBattleState = { ...s0, enemies: s0.enemies.map((e) => ({ ...e, hp: 15 })) };
    expect(autoAt(s)).not.toMatchObject({ kind: 'SKILL' });
  });

  it('a heal first when one of them is low', () => {
    const s0 = herTurn(createPartyBattle(party(), [foe, foe]), 4);
    const s: PartyBattleState = { ...s0, members: s0.members.map((m) => (m.id === 'grave' ? { ...m, hp: 20 } : m)) };
    expect(autoAt(s)).toMatchObject({ kind: 'MAGIC', target: 'grave' });
  });

  it('ヴァルシール\'s second form, all AUTO: she uses it, never before her fifth turn, and the fight is won', () => {
    let s = createPartyBattle(party(), VALSHEEL_FORM2_PROVISIONAL);
    let first = -1;
    for (let i = 0; i < 400 && s.outcome === 'ONGOING'; i++) {
      const id = currentActor(s)!;
      if (isEnemyId(id)) {
        s = enemyAct(s, fixed(0.5));
        continue;
      }
      const action = partyAutoAction(s)!;
      if (id === 'kaos' && action.kind === 'SKILL' && first < 0) first = kaos(s).turns;
      s = partyAct(s, action, fixed(0.5));
    }
    expect(first).toBeGreaterThanOrEqual(4);
    expect(s.outcome).toBe('VICTORY');
  });
});
