import { describe, expect, it } from 'vitest';
import {
  AUTO_MEND_AT,
  AUTO_REGEN_UNDER,
  BREAK_TURNS,
  BROKEN_TAKEN,
  autoTarget,
  enemyById,
  enemyIdAt,
  isBroken,
  isEnemyId,
  standingEnemies,
  DEFEND_MP,
  ENEMY_ID,
  castable,
  createPartyBattle,
  currentActor,
  enemyAct,
  memberById,
  partyAct,
  partyAutoAction,
  partySkillReady,
  roundOrder,
  upcomingTurns,
  type PartyBattleState,
  type PartyEnemy,
  type PartyMemberSpec,
} from './partyBattle';
import { GRAVE_GUEST, heroAndKaos } from '../../content/characters/partyMembers';
import { HERO_STARTING_SKILLS } from '../../content/skills/heroSkills';
import { MAGIC_DEFS } from '../../content/magic/magicDefs';
import { SEKIRYUGA_BATTLE } from '../../content/enemies/sekiryugaBattle';

const fixed = (v: number) => () => v;
/** The dice, one after another (the last repeated). */
const seq = (...vs: number[]) => {
  let i = 0;
  return () => vs[Math.min(i++, vs.length - 1)];
};
const party = (): PartyMemberSpec[] => [
  ...heroAndKaos({
    heroName: '主人公',
    heroLevel: 1,
    kaosLevel: 1,
    condition: { hero: { currentHp: 100, maxHp: 100 }, kaos: { currentHp: 100, maxHp: 100, currentMp: 48, maxMp: 48 } },
    heroAttack: { min: 8, max: 12 },
    heroSkills: HERO_STARTING_SKILLS,
    kaosMagic: MAGIC_DEFS,
  }),
  GRAVE_GUEST,
];
const foe = { name: '試しの敵', hp: 300, attackMin: 10, attackMax: 10, speed: 12 };

/** Plays the turns until it is this one's. */
function untilTurnOf(state: PartyBattleState, id: string): PartyBattleState {
  let s = state;
  for (let i = 0; i < 12 && currentActor(s) !== id; i++) {
    s = isEnemyId(currentActor(s)) ? enemyAct(s, fixed(0)) : partyAct(s, { kind: 'DEFEND' });
  }
  return s;
}

describe('the party fight (戦闘方式 B, 2026-10-12)', () => {
  it('three of them, each their own HP; Kaos her own MP; the others none', () => {
    const s = createPartyBattle(party(), foe);
    expect(s.members.map((m) => [m.id, m.hp, m.maxHp, m.maxMp])).toEqual([
      ['hero', 100, 100, 0],
      ['kaos', 100, 100, 48],
      ['grave', 180, 180, 0],
    ]);
    // グレイヴ: more health, a harder blow, a thicker hide, slower than both.
    const [hero, kaos, grave] = s.members;
    expect(grave.maxHp).toBeGreaterThan(Math.max(hero.maxHp, kaos.maxHp));
    expect(grave.attackMin).toBeGreaterThan(hero.attackMax);
    expect(grave.defense).toBeGreaterThan(hero.defense);
    expect(grave.speed).toBeLessThan(Math.min(hero.speed, kaos.speed));
  });

  it('the order is by speed (the status screen\'s 素早さ), the creature among them; ties: the party first', () => {
    const s = createPartyBattle(party(), foe);
    // Kaos 14, creature 12, hero 10, Grave 8 (level 1).
    expect(s.order).toEqual(['kaos', ENEMY_ID, 'hero', 'grave']);
    expect(currentActor(s)).toBe('kaos');
    const tie = createPartyBattle(party(), { ...foe, speed: 14 });
    expect(tie.order).toEqual(['kaos', ENEMY_ID, 'hero', 'grave']);
    expect(upcomingTurns(s, 6)).toEqual(['kaos', ENEMY_ID, 'hero', 'grave', 'kaos', ENEMY_ID]);
  });

  it('each takes their own turn: a swing hurts the creature, then the next in order acts', () => {
    let s = createPartyBattle(party(), foe);
    s = partyAct(s, { kind: 'ATTACK' }, fixed(0));
    expect(s.enemy.hp).toBe(300 - 4);
    expect(currentActor(s)).toBe(ENEMY_ID);
    // Not a member's turn: a member's action is refused.
    expect(partyAct(s, { kind: 'ATTACK' })).toBe(s);
  });

  it('the creature strikes ONE of them; its defense takes a quarter of itself off; 身構える halves it until their next turn', () => {
    let s = createPartyBattle(party(), foe);
    s = partyAct(s, { kind: 'DEFEND' }); // Kaos braces: +8 MP (already full: stays 48)
    expect(memberById(s, 'kaos')!.mp).toBe(48);
    expect(memberById(s, 'kaos')!.defending).toBe(true);
    // rng 0 → the first standing: the hero. 10 − ⌊12/4⌋ = 7.
    s = enemyAct(s, fixed(0));
    expect(memberById(s, 'hero')!.hp).toBe(93);
    expect(memberById(s, 'kaos')!.hp).toBe(100);
    expect(s.last).toMatchObject({ actor: ENEMY_ID, target: 'hero', amount: 7 });
    // At Kaos (braced): 10 − ⌊7/4⌋ = 9 → halved 4.
    let t = createPartyBattle(party(), foe);
    t = partyAct(t, { kind: 'DEFEND' });
    t = enemyAct(t, fixed(0.4));
    expect(memberById(t, 'kaos')!.hp).toBe(96);
  });

  it('one at nought is down — no turn; all down is a defeat; the creature at nought is a victory', () => {
    let s = createPartyBattle(party().map((m) => (m.id === 'hero' ? { ...m, hp: 5 } : m)), foe);
    s = partyAct(s, { kind: 'DEFEND' });
    s = enemyAct(s, fixed(0));
    expect(memberById(s, 'hero')!.down).toBe(true);
    expect(s.order.includes('hero') ? currentActor(s) !== 'hero' : true).toBe(true);
    expect(upcomingTurns(s, 8)).not.toContain('hero');
    const weak = createPartyBattle(party().map((m) => ({ ...m, hp: 1 })), { ...foe, speed: 99 });
    let d = weak;
    for (let i = 0; i < 12 && d.outcome === 'ONGOING'; i++) d = currentActor(d) === ENEMY_ID ? enemyAct(d, fixed(0)) : partyAct(d, { kind: 'DEFEND' });
    expect(d.outcome).toBe('DEFEAT');
    let v = createPartyBattle(party(), { ...foe, hp: 3 });
    v = partyAct(v, { kind: 'ATTACK' }, fixed(0));
    expect(v.outcome).toBe('VICTORY');
    expect(currentActor(v)).toBeNull();
  });

  it('Kaos: a damage spell costs her MP; a heal is aimed at one of them', () => {
    let s = createPartyBattle(party().map((m) => (m.id === 'grave' ? { ...m, hp: 100 } : m)), foe);
    const bolt = castable(memberById(s, 'kaos')!).find((m) => m.effect === 'DAMAGE')!;
    const mend = castable(memberById(s, 'kaos')!).find((m) => m.effect === 'MEND')!;
    s = partyAct(s, { kind: 'MAGIC', magicId: mend.id, target: 'grave' });
    expect(memberById(s, 'grave')!.hp).toBe(100 + mend.power);
    expect(memberById(s, 'kaos')!.mp).toBe(48 - mend.mpCost);
    s = untilTurnOf(s, 'kaos');
    const before = s.enemy.hp;
    const mp = memberById(s, 'kaos')!.mp;
    s = partyAct(s, { kind: 'MAGIC', magicId: bolt.id });
    expect(s.enemy.hp).toBe(before - bolt.power);
    expect(memberById(s, 'kaos')!.mp).toBe(mp - bolt.mpCost);
    // A spell she cannot pay for is refused.
    const broke = createPartyBattle(party().map((m) => (m.id === 'kaos' ? { ...m, mp: 0 } : m)), foe);
    expect(partyAct(broke, { kind: 'MAGIC', magicId: bolt.id })).toBe(broke);
    // 身構える gathers her magic.
    const braced = partyAct(broke, { kind: 'DEFEND' });
    expect(memberById(braced, 'kaos')!.mp).toBe(DEFEND_MP);
  });

  it('the hero\'s 《瞬断》: twice a swing, then two of his turns before it is ready again', () => {
    let s = untilTurnOf(createPartyBattle(party(), foe), 'hero');
    const hero = memberById(s, 'hero')!;
    const shundan = hero.skills![0];
    expect(partySkillReady(hero, shundan)).toBe(true);
    const before = s.enemy.hp;
    s = partyAct(s, { kind: 'SKILL', skillId: shundan.id }, fixed(0));
    expect(s.enemy.hp).toBe(before - 16);
    s = untilTurnOf(s, 'hero');
    expect(partySkillReady(memberById(s, 'hero')!, shundan)).toBe(false);
    expect(partyAct(s, { kind: 'SKILL', skillId: shundan.id })).toBe(s);
    s = partyAct(s, { kind: 'DEFEND' });
    s = untilTurnOf(s, 'hero');
    expect(partySkillReady(memberById(s, 'hero')!, shundan)).toBe(false);
    s = partyAct(s, { kind: 'DEFEND' });
    s = untilTurnOf(s, 'hero');
    expect(partySkillReady(memberById(s, 'hero')!, shundan)).toBe(true);
  });

  it('AUTO: mends the lowest when one is low; else her strongest spell; his skill when ready; else a swing', () => {
    const hurt = createPartyBattle(party().map((m) => (m.id === 'grave' ? { ...m, hp: Math.floor(180 * AUTO_MEND_AT) - 1 } : m)), foe);
    expect(partyAutoAction(hurt)).toEqual({ kind: 'MAGIC', magicId: 'mending_light', target: 'grave' });
    const fine = createPartyBattle(party(), foe);
    expect(partyAutoAction(fine)).toMatchObject({ kind: 'MAGIC' });
    expect(partyAutoAction(fine)).not.toMatchObject({ magicId: 'mending_light' });
    const heroTurn = untilTurnOf(fine, 'hero');
    expect(partyAutoAction(heroTurn)).toEqual({ kind: 'SKILL', skillId: 'shundan' });
    // Grave (通常スキル3種): 重撃・豪断 on his first turn, a swing on the next
    // (the footing still far from breaking).
    const graveTurn = untilTurnOf(fine, 'grave');
    expect(partyAutoAction(graveTurn)).toEqual({ kind: 'TECH', techId: 'goudan' });
    const graveNext = untilTurnOf(partyAct(graveTurn, { kind: 'DEFEND' }), 'grave');
    expect(partyAutoAction(graveNext)).toEqual({ kind: 'ATTACK' });
  });

  it('a whole fight against セキリュウガ\'s numbers comes to an end, every turn a standing one\'s', () => {
    let s = createPartyBattle(party(), SEKIRYUGA_BATTLE);
    let r = 0.37;
    const rng = () => (r = (r * 9301 + 49297) % 233280 / 233280);
    for (let i = 0; i < 400 && s.outcome === 'ONGOING'; i++) {
      const id = currentActor(s)!;
      if (id !== ENEMY_ID) expect(memberById(s, id)!.down).toBe(false);
      s = id === ENEMY_ID ? enemyAct(s, rng) : partyAct(s, partyAutoAction(s)!, rng);
    }
    expect(s.outcome).not.toBe('ONGOING');
  });

  it('roundOrder leaves out the down and a beaten creature', () => {
    const s = createPartyBattle(party(), foe);
    const members = s.members.map((m) => (m.id === 'kaos' ? { ...m, down: true } : m));
    expect(roundOrder(members, s.enemy)).toEqual([ENEMY_ID, 'hero', 'grave']);
    expect(roundOrder(s.members, { ...s.enemy, hp: 0 })).toEqual(['kaos', 'hero', 'grave']);
  });
});

// 通常スキル3種 + BREAK (2026-10-12).
describe('the party fight: 月影の構え, 星癒の羽, 重撃・豪断 and BREAK', () => {
  // A creature fast enough to go first? No: Kaos 14, creature 12, hero 10, Grave 8.
  const tough = { ...foe, hp: 999, attackMin: 20, attackMax: 20, breakMax: 12 };
  /** Hero with a thick hide, so 30% more of it shows. */
  const thickHero = () => party().map((m) => (m.id === 'hero' ? { ...m, defense: 40 } : m));
  /** On to the hero's turn, he takes 月影の構え, on to the creature's. */
  const guarded = (specs = thickHero(), enemy: typeof tough = tough) => {
    let s = untilTurnOf(createPartyBattle(specs, enemy), 'hero');
    s = partyAct(s, { kind: 'TECH', techId: 'moon_guard' });
    return untilTurnOf(s, ENEMY_ID);
  };

  describe('月影の構え (the hero)', () => {
    it('lasts two of his turns; taken again, it is back at two (not stacked)', () => {
      let s = untilTurnOf(createPartyBattle(party(), tough), 'hero');
      s = partyAct(s, { kind: 'TECH', techId: 'moon_guard' });
      expect(memberById(s, 'hero')!.guardTurns).toBe(2);
      expect(s.last).toMatchObject({ actor: 'hero', kind: 'TECH', name: '月影の構え' });
      s = untilTurnOf(s, 'hero');
      expect(memberById(s, 'hero')!.guardTurns).toBe(1);
      s = partyAct(s, { kind: 'TECH', techId: 'moon_guard' });
      expect(memberById(s, 'hero')!.guardTurns).toBe(2);
      s = untilTurnOf(partyAct(untilTurnOf(s, 'hero'), { kind: 'DEFEND' }), 'hero');
      expect(memberById(s, 'hero')!.guardTurns).toBe(0);
    });

    it('his guard 30% thicker against a blow that lands', () => {
      // rng 0: the first standing, the hero.
      const before = guarded();
      const hp = memberById(before, 'hero')!.hp;
      const s = enemyAct(before, seq(0, 0.5, 0.9, 0));
      // 20 − ⌊40×1.3/4⌋ = 20 − 13 = 7 (without it: 20 − 10 = 10).
      expect(memberById(s, 'hero')!.hp).toBe(hp - 7);
      const plain = enemyAct(untilTurnOf(createPartyBattle(thickHero(), tough), ENEMY_ID), seq(0, 0.5));
      expect(memberById(plain, 'hero')!.hp).toBe(100 - 10);
    });

    it('a quarter of blows miss (MISS) — and he answers even a blow he slipped', () => {
      const before = guarded();
      const s = enemyAct(before, seq(0, 0.5, 0.1, 0));
      expect(memberById(s, 'hero')!.hp).toBe(memberById(before, 'hero')!.hp);
      expect(s.last).toMatchObject({ target: 'hero', amount: 0, missed: true });
      // The counter: 0.8 × his swing (8 at rng 0) = 6.
      expect(s.last!.counter).toBe(6);
      expect(s.log.at(-1)).toContain('MISS');
      expect(s.log.at(-1)).toContain('反撃');
    });

    it('counters a physical blow at him alone at 0.8 of his swing, once a creature turn', () => {
      const before = guarded();
      const s = enemyAct(before, seq(0, 0.5, 0.9, 0));
      expect(s.last).toMatchObject({ target: 'hero', amount: 7, counter: 6 });
      expect(s.enemy.hp).toBe(before.enemy.hp - 6);
      expect(memberById(s, 'hero')!.counterUsed).toBe(true);
      // Ready again on the creature's next turn.
      const again = untilTurnOf(s, ENEMY_ID);
      expect(memberById(again, 'hero')!.counterUsed).toBe(false);
    });

    it('no counter to magic, nor to a blow at all of them', () => {
      const before = guarded();
      const magic = enemyAct(before, seq(0, 0.5, 0.9, 0), { type: 'MAGIC', area: 'ONE' });
      expect(magic.last!.counter).toBeUndefined();
      expect(magic.enemy.hp).toBe(before.enemy.hp);
      const all = enemyAct(before, seq(0.5, 0.9, 0.5, 0.9, 0.5, 0.9), { type: 'PHYSICAL', area: 'ALL' });
      expect(all.enemy.hp).toBe(before.enemy.hp);
      expect(all.last).toMatchObject({ target: 'ALL' });
      expect(all.members.every((m) => m.hp < m.maxHp)).toBe(true);
    });

    it('gone when he goes down', () => {
      const weak = thickHero().map((m) => (m.id === 'hero' ? { ...m, hp: 3 } : m));
      const s = enemyAct(guarded(weak), seq(0, 0.5, 0.9));
      expect(memberById(s, 'hero')!.down).toBe(true);
      expect(memberById(s, 'hero')!.guardTurns).toBe(0);
      expect(s.last!.counter).toBeUndefined();
    });
  });

  describe('星癒の羽 (Kaos)', () => {
    const hurtGrave = () => party().map((m) => (m.id === 'grave' ? { ...m, hp: 100 } : m));

    it('MP 8; at the end of the target\'s own turn, 10% of their most HP and half her 魔力; three turns', () => {
      let s = createPartyBattle(hurtGrave(), tough);
      s = partyAct(s, { kind: 'TECH', techId: 'star_feather', target: 'grave' });
      expect(memberById(s, 'kaos')!.mp).toBe(48 - 8);
      // 180 × 0.1 + 20 × 0.5 = 28.
      expect(memberById(s, 'grave')).toMatchObject({ regenTurns: 3, regenAmount: 28, hp: 100 });
      s = untilTurnOf(s, 'grave');
      s = partyAct(s, { kind: 'DEFEND' });
      expect(memberById(s, 'grave')).toMatchObject({ hp: 128, regenTurns: 2 });
      expect(s.log.some((l) => l.includes('星癒の羽') && l.includes('+28'))).toBe(true);
      s = partyAct(untilTurnOf(s, 'grave'), { kind: 'DEFEND' });
      s = partyAct(untilTurnOf(s, 'grave'), { kind: 'DEFEND' });
      expect(memberById(s, 'grave')).toMatchObject({ hp: 180, regenTurns: 0, regenAmount: 0 });
    });

    it('never past their most; the heal shows on the beat (+XX)', () => {
      let s = createPartyBattle(party().map((m) => (m.id === 'grave' ? { ...m, hp: 170 } : m)), tough);
      s = partyAct(s, { kind: 'TECH', techId: 'star_feather', target: 'grave' });
      s = partyAct(untilTurnOf(s, 'grave'), { kind: 'DEFEND' });
      expect(memberById(s, 'grave')!.hp).toBe(180);
      expect(s.last!.regen).toEqual({ target: 'grave', amount: 10 });
    });

    it('on herself too (from her next turn); laid again, back at three', () => {
      let s = createPartyBattle(party().map((m) => (m.id === 'kaos' ? { ...m, hp: 50 } : m)), tough);
      s = partyAct(s, { kind: 'TECH', techId: 'star_feather', target: 'kaos' });
      // 100 × 0.1 + 10 = 20 — not on the turn she lays it.
      expect(memberById(s, 'kaos')).toMatchObject({ hp: 50, regenTurns: 3, regenAmount: 20 });
      s = partyAct(untilTurnOf(s, 'kaos'), { kind: 'DEFEND' });
      expect(memberById(s, 'kaos')).toMatchObject({ hp: 50 + 20, regenTurns: 2 });
      s = partyAct(untilTurnOf(s, 'kaos'), { kind: 'TECH', techId: 'star_feather', target: 'kaos' });
      expect(memberById(s, 'kaos')!.regenTurns).toBe(3);
    });

    it('not on one who is down; not without the MP; gone when they go down', () => {
      const s = createPartyBattle(party().map((m) => (m.id === 'hero' ? { ...m, hp: 0 } : m)), tough);
      expect(partyAct(s, { kind: 'TECH', techId: 'star_feather', target: 'hero' })).toBe(s);
      const dry = createPartyBattle(party().map((m) => (m.id === 'kaos' ? { ...m, mp: 7 } : m)), tough);
      expect(partyAct(dry, { kind: 'TECH', techId: 'star_feather', target: 'grave' })).toBe(dry);
      let f = createPartyBattle(party().map((m) => (m.id === 'hero' ? { ...m, hp: 5 } : m)), tough);
      f = partyAct(f, { kind: 'TECH', techId: 'star_feather', target: 'hero' });
      expect(memberById(f, 'hero')!.regenTurns).toBe(3);
      f = enemyAct(f, seq(0, 0.5));
      expect(memberById(f, 'hero')).toMatchObject({ down: true, regenTurns: 0, regenAmount: 0 });
    });
  });

  describe('重撃・豪断 (Grave)', () => {
    it('1.6× his swing, no MP, and it wears the footing by 4 (his swing: 2)', () => {
      let s = untilTurnOf(createPartyBattle(party(), tough), 'grave');
      const hp = s.enemy.hp;
      s = partyAct(s, { kind: 'TECH', techId: 'goudan' }, fixed(0));
      // 14 × 1.6 = 22.4 → 22.
      expect(s.enemy.hp).toBe(hp - 22);
      expect(s.enemy.breakCurrent).toBe(12 - 4);
      expect(memberById(s, 'grave')!.mp).toBe(0);
      expect(s.last).toMatchObject({ actor: 'grave', kind: 'TECH', name: '重撃・豪断', amount: 22 });
      s = partyAct(untilTurnOf(s, 'grave'), { kind: 'ATTACK' }, fixed(0));
      expect(s.enemy.breakCurrent).toBe(12 - 4 - 2);
    });

    it('the hero\'s swing and Kaos\'s spell wear it by 1 each', () => {
      let s = createPartyBattle(party(), tough);
      const bolt = castable(memberById(s, 'kaos')!).find((m) => m.effect === 'DAMAGE')!;
      s = partyAct(s, { kind: 'MAGIC', magicId: bolt.id });
      expect(s.enemy.breakCurrent).toBe(11);
      s = partyAct(untilTurnOf(s, 'hero'), { kind: 'ATTACK' }, fixed(0));
      expect(s.enemy.breakCurrent).toBe(10);
    });
  });

  describe('BREAK', () => {
    const brittle = { ...tough, breakMax: 4 };
    const broken = () => partyAct(untilTurnOf(createPartyBattle(party(), brittle), 'grave'), { kind: 'TECH', techId: 'goudan' }, fixed(0));

    it('at nought: BROKEN — BREAK!! in the log, after the blow', () => {
      const s = broken();
      expect(isBroken(s.enemy)).toBe(true);
      expect(s.enemy).toMatchObject({ breakCurrent: 0, breakTurns: BREAK_TURNS, breaks: 1 });
      expect(s.last).toMatchObject({ broke: true });
      expect(s.log.at(-1)).toContain('BREAK!!');
      expect(s.log.at(-2)).toContain('重撃・豪断');
    });

    it('it loses its next two turns, then stands, its footing whole', () => {
      let s = untilTurnOf(broken(), ENEMY_ID);
      const hps = s.members.map((m) => m.hp);
      s = enemyAct(s, fixed(0));
      expect(s.members.map((m) => m.hp)).toEqual(hps);
      expect(s.last).toMatchObject({ kind: 'ENEMY_BROKEN' });
      expect(s.log.at(-1)).toContain('BREAK中');
      expect(s.enemy.breakTurns).toBe(1);
      s = enemyAct(untilTurnOf(s, ENEMY_ID), fixed(0));
      expect(s.members.map((m) => m.hp)).toEqual(hps);
      expect(s.enemy).toMatchObject({ breakTurns: 0, breakCurrent: 4 });
      expect(s.log.at(-1)).toContain('体勢を立て直した');
      // Standing again: its next turn is a blow.
      s = enemyAct(untilTurnOf(s, ENEMY_ID), fixed(0));
      expect(s.last).toMatchObject({ kind: 'ENEMY_ATTACK' });
    });

    it('while broken it takes 1.4× — and its footing is not worn', () => {
      let s = untilTurnOf(broken(), 'kaos');
      s = partyAct(s, { kind: 'DEFEND' });
      s = untilTurnOf(s, 'hero');
      const hp = s.enemy.hp;
      s = partyAct(s, { kind: 'ATTACK' }, fixed(0));
      // 8 × 1.4 = 11.2 → 11.
      expect(s.enemy.hp).toBe(hp - Math.round(8 * BROKEN_TAKEN));
      expect(s.enemy.breakCurrent).toBe(0);
    });

    it('the creature\'s own BREAK event runs, told whether it is the first', () => {
      const seen: boolean[] = [];
      const onBreak = (st: PartyBattleState, first: boolean) => {
        seen.push(first);
        return { ...st, log: [...st.log, first ? '外殻にひびが入った。' : '……'] };
      };
      let s = partyAct(untilTurnOf(createPartyBattle(party(), { ...brittle, onBreak }), 'grave'), { kind: 'TECH', techId: 'goudan' }, fixed(0));
      expect(seen).toEqual([true]);
      expect(s.log.some((l) => l === '外殻にひびが入った。')).toBe(true);
      // Stood again, broken a second time.
      for (let i = 0; i < 40 && s.enemy.breaks < 2 && s.outcome === 'ONGOING'; i++) {
        s = currentActor(s) === ENEMY_ID ? enemyAct(s, fixed(0.99)) : partyAct(s, currentActor(s) === 'grave' ? { kind: 'TECH', techId: 'goudan' } : { kind: 'DEFEND' }, fixed(0));
      }
      expect(seen).toEqual([true, false]);
    });

    it('a counter can break it too', () => {
      const thin = { ...tough, breakMax: 1 };
      const s = enemyAct(guarded(thickHero(), thin), seq(0, 0.5, 0.9, 0));
      expect(s.last).toMatchObject({ counter: 6, broke: true });
      expect(isBroken(s.enemy)).toBe(true);
    });
  });

  describe('AUTO', () => {
    it('Kaos lays 星癒の羽 on the lowest under 70% who has none — never on one whole, not without MP', () => {
      const low = Math.floor(180 * AUTO_REGEN_UNDER) - 1;
      const s = createPartyBattle(party().map((m) => (m.id === 'grave' ? { ...m, hp: low } : m)), tough);
      expect(partyAutoAction(s)).toEqual({ kind: 'TECH', techId: 'star_feather', target: 'grave' });
      const whole = createPartyBattle(party(), tough);
      expect(partyAutoAction(whole)).not.toMatchObject({ techId: 'star_feather' });
      const dry = createPartyBattle(party().map((m) => (m.id === 'grave' ? { ...m, hp: low } : m.id === 'kaos' ? { ...m, mp: 7 } : m)), tough);
      expect(partyAutoAction(dry)).not.toMatchObject({ techId: 'star_feather' });
      // Already on him: not again.
      const laid = partyAct(s, { kind: 'TECH', techId: 'star_feather', target: 'grave' });
      expect(partyAutoAction(untilTurnOf(laid, 'kaos'))).not.toMatchObject({ techId: 'star_feather' });
    });

    it('the hero takes 月影の構え at half or under — and not again while it is up', () => {
      const s = untilTurnOf(createPartyBattle(party().map((m) => (m.id === 'hero' ? { ...m, hp: 50 } : m)), tough), 'hero');
      expect(partyAutoAction(s)).toEqual({ kind: 'TECH', techId: 'moon_guard' });
      const up = untilTurnOf(partyAct(s, { kind: 'TECH', techId: 'moon_guard' }), 'hero');
      expect(memberById(up, 'hero')!.guardTurns).toBe(1);
      expect(partyAutoAction(up)).not.toMatchObject({ techId: 'moon_guard' });
      const fine = untilTurnOf(createPartyBattle(party(), tough), 'hero');
      expect(partyAutoAction(fine)).not.toMatchObject({ techId: 'moon_guard' });
    });

    it('Grave: 重撃・豪断 when it would break the footing, or the creature is broken', () => {
      let s = untilTurnOf(createPartyBattle(party(), tough), 'grave');
      s = partyAct(s, { kind: 'DEFEND' }); // his turns: 1 (odd)
      s = untilTurnOf(s, 'grave');
      expect(partyAutoAction(s)).toEqual({ kind: 'ATTACK' });
      const near: PartyEnemy = { ...s.enemy, breakCurrent: 4 };
      expect(partyAutoAction({ ...s, enemy: near, enemies: [near] })).toEqual({ kind: 'TECH', techId: 'goudan' });
      const down: PartyEnemy = { ...s.enemy, breakCurrent: 0, breakTurns: 1 };
      expect(partyAutoAction({ ...s, enemy: down, enemies: [down] })).toEqual({ kind: 'TECH', techId: 'goudan' });
    });

    it('a whole AUTO fight with BREAK in it still comes to an end', () => {
      let s = createPartyBattle(party(), { ...SEKIRYUGA_BATTLE, breakMax: 10 });
      let r = 0.61;
      const rng = () => (r = (r * 9301 + 49297) % 233280 / 233280);
      for (let i = 0; i < 400 && s.outcome === 'ONGOING'; i++) {
        s = currentActor(s) === ENEMY_ID ? enemyAct(s, rng) : partyAct(s, partyAutoAction(s)!, rng);
      }
      expect(s.outcome).not.toBe('ONGOING');
      expect(s.enemy.breaks).toBeGreaterThan(0);
    });
  });
});

// SEVERAL CREATURES (2026-10-12, 複数敵).
describe('the party fight against two or three creatures', () => {
  // Speeds: Kaos 14, hero 10, Grave 8 (level 1); the creatures 12, 9, 7.
  const a = { name: 'イワホロ', hp: 135, attackMin: 4, attackMax: 4, speed: 12, breakMax: 8, artId: 'iwahoro' };
  const b = { name: 'コケマル', hp: 80, attackMin: 6, attackMax: 6, speed: 9, breakMax: 4, artId: 'kokemaru' };
  const c = { name: 'コケマル', hp: 80, attackMin: 6, attackMax: 6, speed: 7, breakMax: 4, artId: 'kokemaru' };
  const two = () => createPartyBattle(party(), [a, b]);
  const three = () => createPartyBattle(party(), [a, b, c]);

  it('each creature its own: id, health, footing; two of one name told apart (A, B)', () => {
    const s = three();
    expect(s.enemies.map((e) => [e.id, e.name, e.hp, e.breakMax])).toEqual([
      [ENEMY_ID, 'イワホロ', 135, 8],
      [enemyIdAt(1), 'コケマルA', 80, 4],
      [enemyIdAt(2), 'コケマルB', 80, 4],
    ]);
    expect(s.enemy).toBe(s.enemies[0]);
    expect(s.log[0]).toBe('イワホロ、コケマルA、コケマルBが現れた！');
    expect(isEnemyId(enemyIdAt(2))).toBe(true);
    expect(isEnemyId('kaos')).toBe(false);
  });

  it('every creature takes its own turn in the order, by its speed', () => {
    const s = three();
    expect(s.order).toEqual(['kaos', ENEMY_ID, 'hero', enemyIdAt(1), 'grave', enemyIdAt(2)]);
    expect(upcomingTurns(s, 8)).toEqual(['kaos', ENEMY_ID, 'hero', enemyIdAt(1), 'grave', enemyIdAt(2), 'kaos', ENEMY_ID]);
    // Each creature's turn is its own blow, by its own numbers.
    let t = partyAct(s, { kind: 'DEFEND' });
    expect(currentActor(t)).toBe(ENEMY_ID);
    t = enemyAct(t, fixed(0));
    expect(t.last).toMatchObject({ actor: ENEMY_ID, kind: 'ENEMY_ATTACK' });
    t = partyAct(t, { kind: 'DEFEND' });
    expect(currentActor(t)).toBe(enemyIdAt(1));
    t = enemyAct(t, fixed(0));
    expect(t.last).toMatchObject({ actor: enemyIdAt(1), kind: 'ENEMY_ATTACK' });
    expect(t.log.at(-1)).toContain('コケマルA');
  });

  it('a blow, a skill, a spell and 重撃・豪断 land on the one aimed at, and only on it', () => {
    let s = two();
    const bolt = castable(memberById(s, 'kaos')!).find((m) => m.effect === 'DAMAGE')!;
    s = partyAct(s, { kind: 'MAGIC', magicId: bolt.id, target: enemyIdAt(1) });
    expect(enemyById(s, enemyIdAt(1))!.hp).toBe(80 - bolt.power);
    expect(enemyById(s, ENEMY_ID)!.hp).toBe(135);
    expect(s.last).toMatchObject({ target: enemyIdAt(1) });
    s = partyAct(untilTurnOf(s, 'hero'), { kind: 'ATTACK', target: ENEMY_ID }, fixed(0));
    expect(enemyById(s, ENEMY_ID)!.hp).toBe(135 - 8);
    s = partyAct(untilTurnOf(s, 'grave'), { kind: 'TECH', techId: 'goudan', target: enemyIdAt(1) }, fixed(0));
    expect(enemyById(s, enemyIdAt(1))!.hp).toBe(80 - bolt.power - 22);
    // No target named: the first standing.
    s = partyAct(untilTurnOf(s, 'hero'), { kind: 'SKILL', skillId: 'shundan' }, fixed(0));
    expect(enemyById(s, ENEMY_ID)!.hp).toBe(135 - 8 - 16);
    // One that is not there: refused.
    const t = untilTurnOf(two(), 'hero');
    expect(partyAct(t, { kind: 'ATTACK', target: 'enemy-9' })).toBe(t);
  });

  it('BREAK is each creature\'s own: one broken loses its turns and takes 1.4×, the other still acts', () => {
    let s = partyAct(untilTurnOf(two(), 'grave'), { kind: 'TECH', techId: 'goudan', target: enemyIdAt(1) }, fixed(0));
    const kokemaru = enemyById(s, enemyIdAt(1))!;
    const iwahoro = enemyById(s, ENEMY_ID)!;
    expect(isBroken(kokemaru)).toBe(true);
    expect(kokemaru.breakTurns).toBe(BREAK_TURNS);
    expect(isBroken(iwahoro)).toBe(false);
    expect(iwahoro.breakCurrent).toBe(8);
    expect(s.last).toMatchObject({ target: enemyIdAt(1), broke: true });
    // Its turn is lost; the other's is a blow.
    s = untilTurnOf(s, ENEMY_ID);
    s = enemyAct(s, fixed(0));
    expect(s.last).toMatchObject({ actor: ENEMY_ID, kind: 'ENEMY_ATTACK' });
    s = untilTurnOf(s, enemyIdAt(1));
    s = enemyAct(s, fixed(0));
    expect(s.last).toMatchObject({ actor: enemyIdAt(1), kind: 'ENEMY_BROKEN' });
    expect(s.log.at(-1)).toContain('コケマルはBREAK中');
    // 1.4× on the broken one only.
    s = untilTurnOf(s, 'hero');
    const before = enemyById(s, enemyIdAt(1))!.hp;
    s = partyAct(s, { kind: 'ATTACK', target: enemyIdAt(1) }, fixed(0));
    expect(enemyById(s, enemyIdAt(1))!.hp).toBe(before - Math.round(8 * BROKEN_TAKEN));
  });

  it('one at nought is down: out of the order, no longer a target; the fight goes on; all down is the victory', () => {
    let s = createPartyBattle(party(), [{ ...a, hp: 300 }, { ...b, hp: 2 }]);
    s = partyAct(s, { kind: 'ATTACK', target: enemyIdAt(1) }, fixed(0));
    expect(enemyById(s, enemyIdAt(1))).toMatchObject({ hp: 0, down: true });
    expect(s.log.some((l) => l === 'コケマルを倒した！')).toBe(true);
    expect(s.outcome).toBe('ONGOING');
    expect(upcomingTurns(s, 10)).not.toContain(enemyIdAt(1));
    expect(standingEnemies(s).map((e) => e.id)).toEqual([ENEMY_ID]);
    const t = untilTurnOf(s, 'hero');
    expect(partyAct(t, { kind: 'ATTACK', target: enemyIdAt(1) })).toBe(t);
    // The last one: victory.
    let v = createPartyBattle(party(), [{ ...a, hp: 2 }, { ...b, hp: 2 }]);
    v = partyAct(v, { kind: 'ATTACK', target: ENEMY_ID }, fixed(0));
    expect(v.outcome).toBe('ONGOING');
    v = partyAct(untilTurnOf(v, 'hero'), { kind: 'ATTACK' }, fixed(0));
    expect(v.outcome).toBe('VICTORY');
    expect(v.log.at(-1)).toBe('すべての敵を倒した！');
  });

  it('AUTO aims: the one it would BREAK, then a broken one, then the most dangerous, then the weakest', () => {
    // Grave on his second turn: no 豪断 by turn-count; his swing (break 2).
    let s = untilTurnOf(createPartyBattle(party(), [a, { ...b, breakMax: 2 }]), 'grave');
    s = untilTurnOf(partyAct(s, { kind: 'DEFEND' }), 'grave');
    // 豪断 would break コケマル (footing 2 ≤ 4): aimed at it.
    expect(partyAutoAction(s)).toEqual({ kind: 'TECH', techId: 'goudan', target: enemyIdAt(1) });
    // The weakest when nothing breaks and nothing is dangerous.
    const hurt = createPartyBattle(party(), [{ ...a, breakMax: 20 }, { ...b, breakMax: 20, hp: 80 }]);
    const kaos = withEnemiesHp(hurt, [135, 10]);
    expect(autoTarget(kaos, 1)?.id).toBe(enemyIdAt(1));
    // The dangerous one before the weaker.
    const danger = createPartyBattle(party(), [{ ...a, breakMax: 20, danger: 2 }, { ...b, breakMax: 20 }]);
    expect(autoTarget(withEnemiesHp(danger, [135, 10]), 1)?.id).toBe(ENEMY_ID);
    // A broken one before an ordinary one.
    const brk = createPartyBattle(party(), [{ ...a, breakMax: 20 }, { ...b, breakMax: 20 }]);
    const broke = { ...brk, enemies: brk.enemies.map((e, i) => (i === 1 ? { ...e, breakTurns: 1, breakCurrent: 0 } : e)) };
    expect(autoTarget(broke, 1)?.id).toBe(enemyIdAt(1));
    // One creature: AUTO names no target (a fight of one, as before).
    expect(partyAutoAction(untilTurnOf(createPartyBattle(party(), a), 'hero'))).toEqual({ kind: 'SKILL', skillId: 'shundan' });
  });

  it('AUTO fights two and three to the end, every turn a standing one\'s, each creature breaking on its own', () => {
    for (const make of [two, three]) {
      let s = make();
      let r = 0.42;
      const rng = () => (r = (r * 9301 + 49297) % 233280 / 233280);
      for (let i = 0; i < 600 && s.outcome === 'ONGOING'; i++) {
        const id = currentActor(s)!;
        if (isEnemyId(id)) expect(enemyById(s, id)!.down).toBe(false);
        else expect(memberById(s, id)!.down).toBe(false);
        s = isEnemyId(id) ? enemyAct(s, rng) : partyAct(s, partyAutoAction(s)!, rng);
      }
      expect(s.outcome).toBe('VICTORY');
      expect(s.enemies.every((e) => e.down)).toBe(true);
      expect(s.enemies.reduce((n, e) => n + e.breaks, 0)).toBeGreaterThan(0);
    }
  });
});

function withEnemiesHp(s: PartyBattleState, hps: number[]): PartyBattleState {
  const enemies = s.enemies.map((e, i) => ({ ...e, hp: hps[i] ?? e.hp }));
  return { ...s, enemies, enemy: enemies[0] };
}
