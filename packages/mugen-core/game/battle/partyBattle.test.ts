import { describe, expect, it } from 'vitest';
import {
  AUTO_MEND_AT,
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
  type PartyMemberSpec,
} from './partyBattle';
import { GRAVE_GUEST, heroAndKaos } from '../../content/characters/partyMembers';
import { HERO_STARTING_SKILLS } from '../../content/skills/heroSkills';
import { MAGIC_DEFS } from '../../content/magic/magicDefs';
import { SEKIRYUGA_BATTLE } from '../../content/enemies/sekiryugaBattle';

const fixed = (v: number) => () => v;
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
    s = currentActor(s) === ENEMY_ID ? enemyAct(s, fixed(0)) : partyAct(s, { kind: 'DEFEND' });
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
    const graveTurn = untilTurnOf(fine, 'grave');
    expect(partyAutoAction(graveTurn)).toEqual({ kind: 'ATTACK' });
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
