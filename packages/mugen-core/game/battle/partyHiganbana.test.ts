import { describe, expect, it } from 'vitest';
import {
  BREAK_TURNS,
  BROKEN_TAKEN,
  NO_COMBO,
  SLOW_SPEED,
  SLOW_TURNS,
  comboAfter,
  comboMultiplier,
  createPartyBattle,
  currentActor,
  enemyAct,
  isBroken,
  isEnemyId,
  partyAct,
  partyAutoAction,
  roundOrder,
  speedOf,
  upcomingTurns,
  type PartyBattleState,
  type PartyMemberSpec,
} from './partyBattle';
import { GRAVE_GUEST, heroAndKaos } from '../../content/characters/partyMembers';
import { HERO_STARTING_SKILLS, HIGANBANA, SHUNDAN } from '../../content/skills/heroSkills';
import { MAGIC_DEFS } from '../../content/magic/magicDefs';
import { VALSHEEL_FORM2_PROVISIONAL } from '../../content/enemies/valsheelBattle';

// 《彼岸花》, SLOWED and COMBO (作者 2026-10-24「主人公必殺技『彼岸花』＋BREAK / COMBO戦術拡張」).

const fixed = (v: number) => () => v;
const party = (skills = [HIGANBANA, ...HERO_STARTING_SKILLS]): PartyMemberSpec[] => [
  ...heroAndKaos({
    heroName: '主人公',
    heroLevel: 1,
    kaosLevel: 1,
    condition: { hero: { currentHp: 100, maxHp: 100 }, kaos: { currentHp: 100, maxHp: 100, currentMp: 48, maxMp: 48 } },
    heroAttack: { min: 10, max: 10 },
    heroSkills: skills,
    kaosMagic: MAGIC_DEFS,
  }),
  GRAVE_GUEST,
];
// Speed 12: after Kaos (14), before the hero (10) and Grave (8) — as ヴァルシール.
const foe = { name: '試しの敵', hp: 500, attackMin: 10, attackMax: 10, speed: 12, breakMax: 99 };

function untilTurnOf(state: PartyBattleState, id: string): PartyBattleState {
  let s = state;
  for (let i = 0; i < 16 && currentActor(s) !== id; i++) s = isEnemyId(currentActor(s)) ? enemyAct(s, fixed(0)) : partyAct(s, { kind: 'DEFEND' });
  return s;
}
const higanbana = (s: PartyBattleState, target?: string) => partyAct(untilTurnOf(s, 'hero'), { kind: 'SKILL', skillId: 'higanbana', target }, fixed(0));

describe('《彼岸花》', () => {
  it('three strikes of its own: three numbers adding up to what it took, 2.4 × a swing in all, COMBO three', () => {
    const before = untilTurnOf(createPartyBattle(party(), foe), 'hero');
    const s = partyAct(before, { kind: 'SKILL', skillId: 'higanbana' }, fixed(0));
    const beat = s.last!;
    expect(beat.kind).toBe('SKILL');
    expect(beat.name).toBe('彼岸花');
    // His swing is 10: 10 × (0.72, 0.72, 0.96) — 2.4 × a swing in all, the third the heaviest.
    expect(beat.hits).toEqual([7, 7, 10]);
    expect(beat.amount).toBe(24);
    expect(before.enemy.hp - s.enemy.hp).toBe(24);
    expect(s.combo).toEqual({ hits: 3, damage: 24 });
    expect(s.log.at(-2)).toBe('主人公の《彼岸花》！ 試しの敵に7・7・10のダメージ。');
  });

  it('leaves it SLOWED: half its speed for three of its turns, said in the log', () => {
    const s = higanbana(createPartyBattle(party(), foe));
    expect(s.last!.slowed).toBe(true);
    expect(s.enemy.slowTurns).toBe(SLOW_TURNS);
    expect(speedOf(s.enemy)).toBe(12 * SLOW_SPEED);
    expect(s.log.at(-1)).toBe('試しの敵の動きが鈍った。（速度DOWN）');
  });

  it('slowed, it falls behind the party in the next round\'s order (the TURN ORDER says so) — and stands in its place again after three of its turns', () => {
    const start = createPartyBattle(party(), foe);
    expect(roundOrder(start.members, start.enemies)).toEqual(['kaos', 'enemy', 'hero', 'grave']);
    let s = higanbana(start);
    expect(roundOrder(s.members, s.enemies)).toEqual(['kaos', 'hero', 'grave', 'enemy']);
    const turnsAhead = upcomingTurns(s, 6);
    expect(turnsAhead.indexOf('enemy')).toBeGreaterThan(turnsAhead.indexOf('hero'));
    // Three of its turns, then its own speed again.
    for (let n = SLOW_TURNS; n > 0; n--) {
      s = untilTurnOf(s, 'enemy');
      expect(s.enemy.slowTurns).toBe(n);
      s = enemyAct(s, fixed(0));
      expect(s.enemy.slowTurns).toBe(n - 1);
    }
    expect(roundOrder(s.members, s.enemies)).toEqual(['kaos', 'enemy', 'hero', 'grave']);
  });

  it('in a BREAK, slowed means more of the party\'s turns before it stands: 7, not 5', () => {
    const partyTurnsWhileBroken = (slow: boolean) => {
      let s = untilTurnOf(createPartyBattle(party(), { ...foe, breakMax: 1 }), 'hero');
      s = partyAct(s, slow ? { kind: 'SKILL', skillId: 'higanbana' } : { kind: 'ATTACK' }, fixed(0));
      expect(isBroken(s.enemy)).toBe(true);
      let turns = 0;
      for (let i = 0; i < 20 && isBroken(s.enemy); i++) {
        if (isEnemyId(currentActor(s))) s = enemyAct(s, fixed(0));
        else {
          turns++;
          s = partyAct(s, { kind: 'DEFEND' });
        }
      }
      return turns;
    };
    // Broken on his turn (the order Kaos, it, him, Grave): Grave; Kaos, (lost), him, Grave; Kaos, (lost — it stands) = 5.
    // Slowed it goes last: Grave; Kaos, him, Grave, (lost); Kaos, him, Grave, (lost — it stands) = 7.
    expect(partyTurnsWhileBroken(false)).toBe(5);
    expect(partyTurnsWhileBroken(true)).toBe(7);
  });

  it('brought down by the second cut: it ends there — two numbers, no slowing, the fight won', () => {
    const s = higanbana(createPartyBattle(party(), { ...foe, hp: 10 }));
    expect(s.last!.hits).toEqual([7, 7]);
    expect(s.last!.slowed).toBe(false);
    expect(s.outcome).toBe('VICTORY');
    expect(s.combo.hits).toBe(2);
  });

  it('BROKEN by a cut: the cuts after it land at 1.4×', () => {
    const s = higanbana(createPartyBattle(party(), { ...foe, breakMax: 1 }));
    expect(s.last!.broke).toBe(true);
    expect(s.last!.hits).toEqual([7, Math.round(7.2 * BROKEN_TAKEN), Math.round(9.6 * BROKEN_TAKEN)]);
    expect(s.enemy.breakTurns).toBe(BREAK_TURNS);
  });

  it('every fourth of his turns; AUTO uses it when it is ready (it is listed first)', () => {
    let s = higanbana(createPartyBattle(party(), foe));
    s = untilTurnOf(s, 'hero');
    expect(partyAutoAction(s)?.kind === 'SKILL' && (partyAutoAction(s) as { skillId: string }).skillId).not.toBe('higanbana');
    const fresh = untilTurnOf(createPartyBattle(party(), foe), 'hero');
    expect(partyAutoAction(fresh)).toMatchObject({ kind: 'SKILL', skillId: 'higanbana' });
  });
});

describe('COMBO', () => {
  it('worth +5% a step of ten, at most +20% (9→10, 19→20, 29→30, 39→40)', () => {
    expect([0, 9, 10, 19, 20, 29, 30, 39, 40, 99].map(comboMultiplier)).toEqual([1, 1, 1.05, 1.05, 1.1, 1.1, 1.15, 1.15, 1.2, 1.2]);
  });

  it('a blow at COMBO 10 lands 5% harder than the same blow at 9', () => {
    const at = (hits: number) => {
      const s = untilTurnOf(createPartyBattle(party(), { ...foe, hp: 9999 }), 'hero');
      return partyAct({ ...s, combo: { hits, damage: 0 } }, { kind: 'ATTACK' }, fixed(0)).last!.amount;
    };
    expect(at(9)).toBe(10);
    expect(at(10)).toBe(Math.round(10 * 1.05));
    expect(at(40)).toBe(12);
  });

  it('counts the party\'s blows — 《瞬断》 two, 重撃・豪断 two — ends when the creature acts, goes on through its lost turns', () => {
    let s = createPartyBattle(party([SHUNDAN]), { ...foe, breakMax: 99 });
    s = partyAct(untilTurnOf(s, 'hero'), { kind: 'SKILL', skillId: 'shundan' }, fixed(0));
    expect(s.combo.hits).toBe(2);
    s = partyAct(s, { kind: 'TECH', techId: 'goudan' }, fixed(0));
    expect(s.combo.hits).toBe(4);
    s = untilTurnOf(s, 'enemy');
    s = enemyAct(s, fixed(0));
    expect(s.combo).toEqual(NO_COMBO);
  });

  it('the rule itself: a broken one\'s lost turn keeps it, 月影\'s counter starts the next, a heal or a guard leaves it', () => {
    const c = { hits: 4, damage: 80 };
    const beat = (b: object) => ({ actor: 'hero', kind: 'ATTACK' as const, target: 'enemy', amount: 10, read: 'PLAIN' as const, ...b });
    expect(comboAfter(c, beat({ actor: 'enemy', kind: 'ENEMY_BROKEN', target: 'enemy', amount: 0 }))).toBe(c);
    expect(comboAfter(c, beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', missed: true, amount: 0, counter: 9 }))).toEqual({ hits: 1, damage: 9 });
    expect(comboAfter(c, beat({ kind: 'DEFEND', target: 'hero', amount: 0 }))).toBe(c);
    expect(comboAfter(c, beat({ actor: 'kaos', kind: 'MEND', target: 'hero', amount: 30 }))).toBe(c);
  });

  it('several creatures: it goes on from one to another (one COMBO, the party\'s)', () => {
    let s = createPartyBattle(party(), [foe, { ...foe, name: '別の敵' }]);
    s = partyAct(untilTurnOf(s, 'hero'), { kind: 'ATTACK', target: 'enemy' }, fixed(0));
    s = partyAct(s, { kind: 'ATTACK', target: 'enemy-2' }, fixed(0));
    expect(s.combo.hits).toBe(2);
  });

  it('ヴァルシール\'s second form: 《彼岸花》 slows it behind the hero and Grave', () => {
    const s = higanbana(createPartyBattle(party(), VALSHEEL_FORM2_PROVISIONAL));
    expect(s.enemy.slowTurns).toBe(SLOW_TURNS);
    expect(roundOrder(s.members, s.enemies).at(-1)).toBe('enemy');
  });
});
