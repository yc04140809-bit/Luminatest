// THE PARTY FIGHT — everyone their own health and their own turn
// (作者指示 2026-10-12, 戦闘方式 B).
//
// The fights the game has had so far are fought by ONE side: the hero and
// Kaos share a health bar and a pool of magic, and the party takes one
// action a turn (battleLogic.ts). That fight is untouched — every existing
// battle still runs on it. This is the other kind, for a fight where
// someone fights BESIDE them (グレイヴ, for the fight with ヴァルシール):
//
//   - each member has their own HP, and Kaos her own MP (a member with
//     none simply has no magic); one at nought is down and takes no turn;
//   - each member takes their own turn, and so does the creature, in the
//     order of their speed (素早さ — the status screen's number), worked out
//     afresh each round; on a tie the party goes first, in party order;
//   - the creature strikes ONE of them, chosen among those still standing;
//   - a heal is aimed at one member (a target is chosen);
//   - 身構える (DEFEND) halves the next blow to that member until their next
//     turn, and gathers a little magic for one who has any (8, as ever).
//
// Deliberately small for now: the creature's ordinary blow only (no moves,
// poise, phases or skills here yet), Kaos's damage and mending spells, the
// hero's 《瞬断》, and AUTO's plain judgement. BREAK, skills of their own
// (月影の構え, 星癒の羽, 重撃・豪断), items and revival come next — each is a
// new action kind here, and nothing above changes for it.
//
// Pure: a state in, a state out, the dice passed in.

import type { EnemySpec, HeroSkillSpec } from './battleLogic';
import type { MagicDef } from '../../core/magic/magic';
import { affinityMultiplier, readAffinity, type AffinityRead, type EnemyAffinity } from './damageType';

export type PartyOutcome = 'ONGOING' | 'VICTORY' | 'DEFEAT';

/** The creature's place in the order. */
export const ENEMY_ID = 'enemy';

/** How much magic 身構える gathers, for a member who has any (as in the shared fight). */
export const DEFEND_MP = 8;

/** Who a member is, as the fight is started with them. */
export interface PartyMemberSpec {
  id: string;
  name: string;
  maxHp: number;
  /** Their health as the fight starts (absent: full). */
  hp?: number;
  /** Nought for a member with no magic. */
  maxMp: number;
  mp?: number;
  attackMin: number;
  attackMax: number;
  /** Takes a quarter of itself off every blow that reaches them. */
  defense: number;
  speed: number;
  /** Their skills (the hero's 《瞬断》). */
  skills?: readonly HeroSkillSpec[];
  /** Their spells (Kaos's) — only damage and mending are used here yet. */
  magic?: readonly MagicDef[];
}

export interface PartyMember extends PartyMemberSpec {
  hp: number;
  mp: number;
  down: boolean;
  defending: boolean;
  /** Their own turns taken. */
  turns: number;
  /** When each skill was last used, as `turns` just after. */
  skillUsedAt: Readonly<Record<string, number>>;
}

export interface PartyEnemy {
  name: string;
  hp: number;
  maxHp: number;
  attackMin: number;
  attackMax: number;
  attackName: string | null;
  speed: number;
  affinity: EnemyAffinity | null;
}

/** What just happened, for the screen to play. */
export interface PartyBeat {
  actor: string;
  kind: 'ATTACK' | 'SKILL' | 'MAGIC' | 'MEND' | 'DEFEND' | 'ENEMY_ATTACK';
  target: string;
  amount: number;
  read: AffinityRead;
  name?: string;
}

export interface PartyBattleState {
  members: readonly PartyMember[];
  enemy: PartyEnemy;
  /** This round's order, by id. */
  order: readonly string[];
  /** Whose turn it is, as an index into `order`. */
  at: number;
  round: number;
  log: readonly string[];
  outcome: PartyOutcome;
  last: PartyBeat | null;
}

export type PartyAction =
  | { kind: 'ATTACK' }
  | { kind: 'SKILL'; skillId: string }
  | { kind: 'MAGIC'; magicId: string; target?: string }
  | { kind: 'DEFEND' };

export type Rng = () => number;

/** The creature's speed when its content gives none: between the hero and Kaos at the start. */
export const DEFAULT_ENEMY_SPEED = 12;

const roll = (min: number, max: number, rng: Rng) => Math.floor(min + rng() * (max - min + 1));

/** The order for a round: the standing, fastest first; on a tie the party first, in party order. */
export function roundOrder(members: readonly PartyMember[], enemy: PartyEnemy): string[] {
  const actors = [
    ...members.filter((m) => !m.down).map((m, i) => ({ id: m.id, speed: m.speed, rank: i })),
    ...(enemy.hp > 0 ? [{ id: ENEMY_ID, speed: enemy.speed, rank: members.length }] : []),
  ];
  return actors.sort((a, b) => b.speed - a.speed || a.rank - b.rank).map((a) => a.id);
}

export function createPartyBattle(
  specs: readonly PartyMemberSpec[],
  enemy: EnemySpec & { speed?: number },
): PartyBattleState {
  const members: PartyMember[] = specs.map((s) => {
    const hp = Math.max(0, Math.min(s.maxHp, Math.floor(s.hp ?? s.maxHp)));
    return {
      ...s,
      hp,
      mp: Math.max(0, Math.min(s.maxMp, Math.floor(s.mp ?? s.maxMp))),
      down: hp <= 0,
      defending: false,
      turns: 0,
      skillUsedAt: {},
    };
  });
  const foe: PartyEnemy = {
    name: enemy.name,
    hp: enemy.hp,
    maxHp: enemy.hp,
    attackMin: enemy.attackMin,
    attackMax: enemy.attackMax,
    attackName: enemy.attackName ?? null,
    speed: enemy.speed ?? DEFAULT_ENEMY_SPEED,
    affinity: enemy.affinity ?? null,
  };
  const state: PartyBattleState = {
    members,
    enemy: foe,
    order: roundOrder(members, foe),
    at: 0,
    round: 1,
    log: [enemy.appearLine ?? `${enemy.name}が現れた！`],
    outcome: 'ONGOING',
    last: null,
  };
  return startTurn(state);
}

/** Whose turn it is (a member's id, or ENEMY_ID), or null once it is over. */
export function currentActor(state: PartyBattleState): string | null {
  return state.outcome === 'ONGOING' ? (state.order[state.at] ?? null) : null;
}

export function memberById(state: PartyBattleState, id: string): PartyMember | undefined {
  return state.members.find((m) => m.id === id);
}

/** The next `n` turns, from the one now, across rounds (for the TURN ORDER strip). */
export function upcomingTurns(state: PartyBattleState, n: number): string[] {
  const out: string[] = [];
  let order = state.order;
  let i = state.at;
  for (let guard = 0; out.length < n && guard < n * 4; guard++) {
    if (i >= order.length) {
      order = roundOrder(state.members, state.enemy);
      i = 0;
      if (order.length === 0) break;
    }
    out.push(order[i]);
    i++;
  }
  return out;
}

/**
 * Whether a member's skill can be used on their turn: 「3ターンに1回」 is
 * used, then two of their turns without it, then again.
 */
export function partySkillReady(member: PartyMember, skill: HeroSkillSpec): boolean {
  const used = member.skillUsedAt[skill.id];
  return used === undefined || member.turns - used >= skill.cooldown;
}

/** The spells a member can cast here: damage or mending, and only what they can pay for. */
export function castable(member: PartyMember): MagicDef[] {
  return (member.magic ?? []).filter((m) => (m.effect === 'DAMAGE' || m.effect === 'MEND') && m.mpCost <= member.mp);
}

function withMember(state: PartyBattleState, id: string, f: (m: PartyMember) => PartyMember): PartyBattleState {
  return { ...state, members: state.members.map((m) => (m.id === id ? f(m) : m)) };
}

function settle(state: PartyBattleState): PartyBattleState {
  if (state.enemy.hp <= 0) return { ...state, outcome: 'VICTORY', log: [...state.log, `${state.enemy.name}を倒した！`] };
  if (state.members.every((m) => m.down)) return { ...state, outcome: 'DEFEAT', log: [...state.log, '全員が倒れた……。'] };
  return state;
}

/** At the start of someone's turn: their guard drops (it lasted until now). */
function startTurn(state: PartyBattleState): PartyBattleState {
  const id = currentActor(state);
  if (!id || id === ENEMY_ID) return state;
  return withMember(state, id, (m) => (m.defending ? { ...m, defending: false } : m));
}

/** On to the next one standing; a new round (order worked out afresh) when the round is done. */
function advance(state: PartyBattleState): PartyBattleState {
  if (state.outcome !== 'ONGOING') return state;
  let { order, at, round } = state;
  for (let guard = 0; guard < 16; guard++) {
    at += 1;
    if (at >= order.length) {
      order = roundOrder(state.members, state.enemy);
      at = 0;
      round += 1;
    }
    const id = order[at];
    if (id === ENEMY_ID ? state.enemy.hp > 0 : !state.members.find((m) => m.id === id)?.down) break;
  }
  return startTurn({ ...state, order, at, round });
}

function hitEnemy(state: PartyBattleState, amount: number): PartyBattleState {
  return { ...state, enemy: { ...state.enemy, hp: Math.max(0, state.enemy.hp - amount) } };
}

/**
 * The member whose turn it is does this. Refused (the state as it was)
 * when it is not a standing member's turn, or the action cannot be done.
 */
export function partyAct(state: PartyBattleState, action: PartyAction, rng: Rng = Math.random): PartyBattleState {
  const id = currentActor(state);
  const me = id && id !== ENEMY_ID ? memberById(state, id) : undefined;
  if (!me || me.down) return state;
  let next: PartyBattleState | null = null;
  switch (action.kind) {
    case 'ATTACK': {
      const m = affinityMultiplier(state.enemy.affinity, 'PHYSICAL');
      const amount = Math.max(1, Math.round(roll(me.attackMin, me.attackMax, rng) * m));
      next = hitEnemy(state, amount);
      next = {
        ...next,
        log: [...next.log, `${me.name}の攻撃！ ${state.enemy.name}に${amount}のダメージ。`],
        last: { actor: me.id, kind: 'ATTACK', target: ENEMY_ID, amount, read: readAffinity(m) },
      };
      break;
    }
    case 'SKILL': {
      const skill = me.skills?.find((s) => s.id === action.skillId);
      if (!skill || !partySkillReady(me, skill)) return state;
      const m = affinityMultiplier(state.enemy.affinity, 'PHYSICAL');
      const amount = Math.max(1, Math.round(roll(me.attackMin, me.attackMax, rng) * skill.power * m));
      next = hitEnemy(state, amount);
      next = withMember(next, me.id, (x) => ({ ...x, skillUsedAt: { ...x.skillUsedAt, [skill.id]: x.turns } }));
      next = {
        ...next,
        log: [...next.log, `${me.name}の《${skill.name}》！ ${state.enemy.name}に${amount}のダメージ。`],
        last: { actor: me.id, kind: 'SKILL', target: ENEMY_ID, amount, read: readAffinity(m), name: skill.name },
      };
      break;
    }
    case 'MAGIC': {
      const spell = castable(me).find((s) => s.id === action.magicId);
      if (!spell) return state;
      if (spell.effect === 'MEND') {
        const target = memberById(state, action.target ?? me.id);
        if (!target || target.down) return state;
        const amount = Math.min(spell.power, target.maxHp - target.hp);
        next = withMember(state, me.id, (x) => ({ ...x, mp: x.mp - spell.mpCost }));
        next = withMember(next, target.id, (x) => ({ ...x, hp: x.hp + amount }));
        next = {
          ...next,
          log: [...next.log, `${me.name}の《${spell.name}》！ ${target.name}のHPが${amount}回復した。`],
          last: { actor: me.id, kind: 'MEND', target: target.id, amount, read: 'PLAIN', name: spell.name },
        };
      } else {
        const m = affinityMultiplier(state.enemy.affinity, spell.type, spell.element);
        const amount = Math.max(1, Math.round(spell.power * m));
        next = withMember(state, me.id, (x) => ({ ...x, mp: x.mp - spell.mpCost }));
        next = hitEnemy(next, amount);
        next = {
          ...next,
          log: [...next.log, `${me.name}の《${spell.name}》！ ${state.enemy.name}に${amount}のダメージ。`],
          last: { actor: me.id, kind: 'MAGIC', target: ENEMY_ID, amount, read: readAffinity(m), name: spell.name },
        };
      }
      break;
    }
    case 'DEFEND': {
      next = withMember(state, me.id, (x) => ({ ...x, defending: true, mp: x.maxMp > 0 ? Math.min(x.maxMp, x.mp + DEFEND_MP) : x.mp }));
      next = {
        ...next,
        log: [...next.log, `${me.name}は身構えた。`],
        last: { actor: me.id, kind: 'DEFEND', target: me.id, amount: 0, read: 'PLAIN' },
      };
      break;
    }
  }
  next = withMember(next!, me.id, (x) => ({ ...x, turns: x.turns + 1 }));
  return advance(settle(next));
}

/** The creature's turn: its ordinary blow at one of them still standing. */
export function enemyAct(state: PartyBattleState, rng: Rng = Math.random): PartyBattleState {
  if (currentActor(state) !== ENEMY_ID) return state;
  const standing = state.members.filter((m) => !m.down);
  if (standing.length === 0) return settle(state);
  const target = standing[Math.min(standing.length - 1, Math.floor(rng() * standing.length))];
  const raw = roll(state.enemy.attackMin, state.enemy.attackMax, rng);
  const cut = Math.max(1, raw - Math.floor(target.defense / 4));
  const amount = target.defending ? Math.max(1, Math.floor(cut / 2)) : cut;
  let next = withMember(state, target.id, (x) => {
    const hp = Math.max(0, x.hp - amount);
    return { ...x, hp, down: hp <= 0 };
  });
  const fell = memberById(next, target.id)!.down;
  const how = state.enemy.attackName ? `${state.enemy.name}の${state.enemy.attackName}！` : `${state.enemy.name}の攻撃！`;
  next = {
    ...next,
    log: [...next.log, `${how} ${target.name}に${amount}のダメージ。${fell ? `${target.name}は倒れた。` : ''}`],
    last: { actor: ENEMY_ID, kind: 'ENEMY_ATTACK', target: target.id, amount, read: 'PLAIN' },
  };
  return advance(settle(next));
}

/** HP at or under this share of its most counts as low, for AUTO's mending. */
export const AUTO_MEND_AT = 0.4;

/**
 * AUTO, for the member whose turn it is: mend the lowest of them if one is
 * low and it can be paid for; else the strongest damage spell they can pay
 * for, if stronger than a swing; else a skill that is ready; else a swing.
 */
export function partyAutoAction(state: PartyBattleState): PartyAction | null {
  const id = currentActor(state);
  const me = id && id !== ENEMY_ID ? memberById(state, id) : undefined;
  if (!me) return null;
  const spells = castable(me);
  const mend = spells.filter((s) => s.effect === 'MEND').sort((a, b) => b.power - a.power)[0];
  const low = state.members.filter((m) => !m.down && m.hp <= m.maxHp * AUTO_MEND_AT).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (mend && low) return { kind: 'MAGIC', magicId: mend.id, target: low.id };
  const swing = (me.attackMin + me.attackMax) / 2;
  const blast = spells
    .filter((s) => s.effect === 'DAMAGE')
    .map((s) => ({ s, worth: s.power * affinityMultiplier(state.enemy.affinity, s.type, s.element) }))
    .sort((a, b) => b.worth - a.worth)[0];
  if (blast && blast.worth > swing) return { kind: 'MAGIC', magicId: blast.s.id };
  const skill = (me.skills ?? []).find((s) => partySkillReady(me, s));
  if (skill) return { kind: 'SKILL', skillId: skill.id };
  return { kind: 'ATTACK' };
}
