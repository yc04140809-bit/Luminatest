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
  memberById,
  partyAct,
  partySkillReady,
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

  it('every fourth of his turns', () => {
    let s = higanbana(createPartyBattle(party(), { ...foe, breakMax: 3 }));
    s = untilTurnOf(s, 'hero');
    expect(partySkillReady(memberById(s, 'hero')!, HIGANBANA)).toBe(false);
    expect(partyAct(s, { kind: 'SKILL', skillId: 'higanbana' }, fixed(0))).toBe(s);
  });
});

// 最終仕様 (作者 2026-10-24「彼岸花 最終仕様 AUTO挙動 / COMBO / BREAK連携 調整指示書」): at all of them.
describe('《彼岸花》 at every creature standing', () => {
  const three = [foe, { ...foe, name: '二の敵' }, { ...foe, name: '三の敵' }];

  it('three cuts on each: nine strikes, each worked out as against one (24 each, 72 in all), COMBO nine, every one slowed', () => {
    const before = untilTurnOf(createPartyBattle(party(), three), 'hero');
    const s = partyAct(before, { kind: 'SKILL', skillId: 'higanbana', target: 'enemy-2' }, fixed(0));
    const beat = s.last!;
    // The one aimed at first (its numbers are the beat's own), then the rest in their order.
    expect(beat.target).toBe('enemy-2');
    expect(beat.spread!.map((x) => x.target)).toEqual(['enemy-2', 'enemy', 'enemy-3']);
    for (const x of beat.spread!) expect(x.hits).toEqual([7, 7, 10]);
    expect(beat.hits).toEqual([7, 7, 10]);
    expect(beat.amount).toBe(72);
    for (const e of s.enemies) expect(before.enemies.find((b) => b.id === e.id)!.hp - e.hp).toBe(24);
    expect(s.combo).toEqual({ hits: 9, damage: 72 });
    for (const e of s.enemies) expect(e.slowTurns).toBe(SLOW_TURNS);
    expect(beat.spread!.every((x) => x.slowed)).toBe(true);
    expect(s.log.at(-2)).toBe('主人公の《彼岸花》！ 二の敵に7・7・10、試しの敵に7・7・10、三の敵に7・7・10のダメージ。');
    expect(s.log.at(-1)).toBe('二の敵、試しの敵、三の敵の動きが鈍った。（速度DOWN）');
  });

  it('COMBO climbs strike by strike across them: from 10 the strikes after land 5% harder', () => {
    const s0 = untilTurnOf(createPartyBattle(party(), three), 'hero');
    const s = partyAct({ ...s0, combo: { hits: 8, damage: 0 } }, { kind: 'SKILL', skillId: 'higanbana' }, fixed(0));
    // Cut 1 lands at COMBO 8, 9, 10 (the third creature's at 10: +5%); cuts 2 and 3 all at 11 or more.
    expect(s.last!.spread!.map((x) => x.hits)).toEqual([
      [7, Math.round(7.2 * 1.05), Math.round(9.6 * 1.05)],
      [7, Math.round(7.2 * 1.05), Math.round(9.6 * 1.05)],
      [Math.round(7.2 * 1.05), Math.round(7.2 * 1.05), Math.round(9.6 * 1.05)],
    ]);
    expect(s.combo.hits).toBe(17);
  });

  it('one brought down part-way drops out of the cuts (and is not slowed); the rest take all three', () => {
    const s = higanbana(createPartyBattle(party(), [foe, { ...foe, name: '弱い敵', hp: 10 }]));
    const [a, b] = s.last!.spread!;
    expect(a.hits).toEqual([7, 7, 10]);
    expect(b.hits).toEqual([7, 7]);
    expect(b.slowed).toBe(false);
    expect(s.enemies[1].down).toBe(true);
    expect(s.combo.hits).toBe(5);
  });

  it('BREAKs each by its own footing, and each broken one takes 1.4× from then', () => {
    const s = higanbana(createPartyBattle(party(), [{ ...foe, breakMax: 1 }, { ...foe, name: '堅い敵', breakMax: 99 }]));
    const [a, b] = s.last!.spread!;
    expect(a.broke).toBe(true);
    expect(a.hits).toEqual([7, Math.round(7.2 * BROKEN_TAKEN), Math.round(9.6 * BROKEN_TAKEN)]);
    expect(b.broke).toBe(false);
    expect(b.hits).toEqual([7, 7, 10]);
    expect(s.last!.broke).toBe(true);
  });

  it('against one creature it is the same move as before (three cuts on it)', () => {
    const s = higanbana(createPartyBattle(party(), foe));
    expect(s.last!.spread).toEqual([{ target: 'enemy', hits: [7, 7, 10], broke: false, slowed: true }]);
    expect(s.combo.hits).toBe(3);
  });
});

describe('AUTO and 《彼岸花》 (§16–20): kept for BREAK and COMBO, not fired the moment it is ready', () => {
  const autoOf = (s: PartyBattleState) => partyAutoAction(untilTurnOf(s, 'hero'));
  const usesIt = (s: PartyBattleState) => {
    const a = autoOf(s);
    return a?.kind === 'SKILL' && a.skillId === 'higanbana';
  };
  const brokenNow = (s: PartyBattleState, id = 'enemy') => ({ ...s, ...withBroken(s, id) });
  function withBroken(s: PartyBattleState, id: string) {
    const enemies = s.enemies.map((e) => (e.id === id ? { ...e, breakTurns: BREAK_TURNS, breakCurrent: 0 } : e));
    return { enemies, enemy: enemies[0] };
  }

  it('one creature standing whole: kept back (《瞬断》 instead)', () => {
    expect(autoOf(createPartyBattle(party(), foe))).toMatchObject({ kind: 'SKILL', skillId: 'shundan' });
  });

  it('first of all: the creature BROKEN', () => {
    const s = untilTurnOf(createPartyBattle(party(), foe), 'hero');
    expect(usesIt(brokenNow(s))).toBe(true);
  });

  it('BROKEN, before 月影の構え even when he is low — nothing can strike back while it is down', () => {
    const s = untilTurnOf(createPartyBattle(party(), foe), 'hero');
    const low = { ...s, members: s.members.map((m) => (m.id === 'hero' ? { ...m, hp: 20 } : m)) };
    expect(partyAutoAction(brokenNow(low))).toMatchObject({ kind: 'SKILL', skillId: 'higanbana' });
    // Standing, low: his guard first, as ever.
    expect(partyAutoAction(low)).toMatchObject({ kind: 'TECH', techId: 'moon_guard' });
  });

  it('about to break: its footing no more than the three cuts wear (3)', () => {
    expect(usesIt(createPartyBattle(party(), { ...foe, breakMax: 3 }))).toBe(true);
    expect(usesIt(createPartyBattle(party(), { ...foe, breakMax: 4 }))).toBe(false);
  });

  it('several creatures not yet slowed: at all of them — aimed at the most dangerous', () => {
    const s = createPartyBattle(party(), [foe, { ...foe, name: '危ない敵', danger: 5 }]);
    expect(autoOf(s)).toMatchObject({ kind: 'SKILL', skillId: 'higanbana', target: 'enemy-2' });
  });

  it('not again on those it has slowed (and its wait is longer than the slowing)', () => {
    const s = untilTurnOf(createPartyBattle(party(), [foe, { ...foe, name: '二の敵' }]), 'hero');
    const slowed = { ...s, enemies: s.enemies.map((e) => ({ ...e, slowTurns: 2 })) };
    const a = partyAutoAction(slowed);
    expect(a?.kind === 'SKILL' && a.skillId).not.toBe('higanbana');
    expect(HIGANBANA.cooldown).toBeGreaterThan(SLOW_TURNS);
  });

  it('only a weak one left (one swing finishes it): kept back, broken or not', () => {
    const s = untilTurnOf(createPartyBattle(party(), { ...foe, hp: 10 }), 'hero');
    expect(usesIt(s)).toBe(false);
    expect(usesIt(brokenNow(s))).toBe(false);
  });

  it('ヴァルシール\'s second form: broken by Grave\'s 豪断, the hero\'s next turn is 《彼岸花》', () => {
    let s = createPartyBattle(party(), VALSHEEL_FORM2_PROVISIONAL);
    expect(usesIt(s)).toBe(false);
    s = untilTurnOf(s, 'hero');
    s = brokenNow(s);
    expect(usesIt(s)).toBe(true);
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
