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
// THEIR TECHNIQUES (2026-10-12, 通常スキル3種): the hero's 月影の構え (guard,
// evasion and a counter, two of his turns), Kaos's 星癒の羽 (a heal over
// three of the target's turns), Grave's 重撃・豪断 (a heavy blow that breaks
// footing). And BREAK: every blow wears the creature's footing (`breakPower`);
// at nought it is BROKEN — it loses its next two turns and takes 1.4× — and
// then stands again, its footing whole. A creature may carry its own BREAK
// event (`onBreak`: ヴァルシール's shell, later).
//
// Still not here: the creature's moves, items, revival, finishers.
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
  /** Their own techniques in this kind of fight (月影の構え, 星癒の羽, 重撃・豪断). */
  techniques?: readonly PartyTechnique[];
  /** Their magic power (the status screen's 魔力): what 星癒の羽 adds. */
  magicPower?: number;
  /** How much their ordinary blow wears a creature's footing (1 if absent). */
  breakPower?: number;
}

/**
 * A technique of the party fight. One shape for all of them, told apart by
 * `kind`; each new one is a kind here and a case in `partyAct`.
 */
export interface PartyTechnique {
  id: string;
  name: string;
  kind: 'MOON_GUARD' | 'REGEN' | 'HEAVY';
  mpCost: number;
  /** Who it is aimed at: themself, one of the party, or the creature. */
  target: 'SELF' | 'ALLY' | 'ENEMY';
  /** HEAVY: times an ordinary blow. */
  power?: number;
  /** HEAVY: how much it wears the creature's footing. */
  breakPower?: number;
  /** MOON_GUARD / REGEN: how many of the target's turns it lasts. */
  turns?: number;
}

/** 月影の構え: what it does while it lasts. */
export const MOON_GUARD = { defenseUp: 0.3, evasion: 0.25, counter: 0.8 } as const;
/** 星癒の羽: a tenth of their most HP, and half her 魔力, each turn. */
export const REGEN_SHARE = 0.1;
export const REGEN_MAGIC = 0.5;
/** BROKEN: it takes this much more, for as long as it lasts. */
export const BROKEN_TAKEN = 1.4;
/** BROKEN: how many of its own turns it loses. */
export const BREAK_TURNS = 2;
/** A creature's footing when its content gives none. */
export const DEFAULT_BREAK_MAX = 10;
/** Kaos's damage spells wear footing like a blow. */
export const SPELL_BREAK_POWER = 1;
/** 《瞬断》 wears it a little more than a swing. */
export const SKILL_BREAK_POWER = 2;
/** A counter wears it as a swing. */
export const COUNTER_BREAK_POWER = 1;

export interface PartyMember extends PartyMemberSpec {
  hp: number;
  mp: number;
  down: boolean;
  defending: boolean;
  /** Their own turns taken. */
  turns: number;
  /** When each skill was last used, as `turns` just after. */
  skillUsedAt: Readonly<Record<string, number>>;
  /** 月影の構え: how many more of their turns it lasts (0: none). */
  guardTurns: number;
  /** Whether their counter has been spent this creature turn. */
  counterUsed: boolean;
  /** 星癒の羽 on them: turns left, and how much each heals. */
  regenTurns: number;
  regenAmount: number;
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
  /** Its footing: whole, and what is left of it. */
  breakMax: number;
  breakCurrent: number;
  /** BROKEN: how many more of its turns it loses (0: standing). */
  breakTurns: number;
  /** How many times it has been broken this fight. */
  breaks: number;
  /**
   * ITS OWN BREAK, if it has one (ヴァルシール's shell, later): called the
   * moment it is broken, with whether it is the first time; returns the fight
   * as it should go on.
   */
  onBreak?: (state: PartyBattleState, first: boolean) => PartyBattleState;
}

/** Whether it is broken now. */
export const isBroken = (enemy: PartyEnemy) => enemy.breakTurns > 0;

/** What just happened, for the screen to play. */
export interface PartyBeat {
  actor: string;
  kind: 'ATTACK' | 'SKILL' | 'MAGIC' | 'MEND' | 'DEFEND' | 'ENEMY_ATTACK' | 'TECH' | 'ENEMY_BROKEN';
  target: string;
  amount: number;
  read: AffinityRead;
  name?: string;
  /** The creature was broken by this. */
  broke?: boolean;
  /** The creature's blow missed (月影の構え). */
  missed?: boolean;
  /** The hero answered with his counter, for this much. */
  counter?: number;
  /** 星癒の羽 healed the one whose turn it was, at its end. */
  regen?: { target: string; amount: number };
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
  | { kind: 'TECH'; techId: string; target?: string }
  | { kind: 'DEFEND' };

/** What the creature's blow is (for the counter's rules): kind and reach. */
export interface EnemyStrike {
  type: 'PHYSICAL' | 'MAGIC';
  area: 'ONE' | 'ALL';
}
export const ORDINARY_STRIKE: EnemyStrike = { type: 'PHYSICAL', area: 'ONE' };

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

/** A creature for the party fight: its spec, and what the party fight adds. */
export type PartyEnemyInput = EnemySpec & {
  speed?: number;
  breakMax?: number;
  onBreak?: PartyEnemy['onBreak'];
  /**
   * How big it is on the battle screen — staging only, the fight never
   * reads it. 'GIANT' (ヴァルシール; later a dragon, a great machine…) is
   * drawn across the left of the screen and the party drawn smaller.
   */
  battleScale?: BattleScale;
};

/** How big a creature stands on the battle screen (staging only). */
export type BattleScale = 'NORMAL' | 'GIANT';

export function createPartyBattle(specs: readonly PartyMemberSpec[], enemy: PartyEnemyInput): PartyBattleState {
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
      guardTurns: 0,
      counterUsed: false,
      regenTurns: 0,
      regenAmount: 0,
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
    breakMax: Math.max(1, enemy.breakMax ?? DEFAULT_BREAK_MAX),
    breakCurrent: Math.max(1, enemy.breakMax ?? DEFAULT_BREAK_MAX),
    breakTurns: 0,
    breaks: 0,
    onBreak: enemy.onBreak,
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

/**
 * At the start of someone's turn: their 身構える drops (it lasted until now),
 * and 月影の構え counts one of its turns down. At the start of the creature's:
 * every counter is ready again (one per creature turn).
 */
function startTurn(state: PartyBattleState): PartyBattleState {
  const id = currentActor(state);
  if (!id) return state;
  if (id === ENEMY_ID) return { ...state, members: state.members.map((m) => (m.counterUsed ? { ...m, counterUsed: false } : m)) };
  return withMember(state, id, (m) => ({ ...m, defending: false, guardTurns: Math.max(0, m.guardTurns - 1) }));
}

/** Down: whatever was on them goes (guard, counter, the heal over time). */
const fallen = (m: PartyMember): PartyMember => ({ ...m, hp: 0, down: true, defending: false, guardTurns: 0, counterUsed: false, regenTurns: 0, regenAmount: 0 });

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

/**
 * A blow landing on the creature: `base` as worked out, 1.4× while it is
 * broken; its footing worn by `breakPower` (not while broken). At nought it
 * is BROKEN — its own event, if it has one, runs then. Returns the fight and
 * what landed.
 */
function strikeEnemy(state: PartyBattleState, base: number, breakPower: number): { state: PartyBattleState; amount: number; broke: boolean } {
  const broken = isBroken(state.enemy);
  const amount = Math.max(1, Math.round(base * (broken ? BROKEN_TAKEN : 1)));
  const hp = Math.max(0, state.enemy.hp - amount);
  if (broken || hp <= 0) return { state: { ...state, enemy: { ...state.enemy, hp } }, amount, broke: false };
  const left = state.enemy.breakCurrent - Math.max(0, breakPower);
  if (left > 0) return { state: { ...state, enemy: { ...state.enemy, hp, breakCurrent: left } }, amount, broke: false };
  const first = state.enemy.breaks === 0;
  let next: PartyBattleState = {
    ...state,
    enemy: { ...state.enemy, hp, breakCurrent: 0, breakTurns: BREAK_TURNS, breaks: state.enemy.breaks + 1 },
  };
  next = { ...next, log: [...next.log, `BREAK!! ${state.enemy.name}の体勢が崩れた。`] };
  if (state.enemy.onBreak) next = state.enemy.onBreak(next, first);
  return { state: next, amount, broke: true };
}

/** The member's own turn is over: 星癒の羽 on them heals once. */
function endOwnTurn(state: PartyBattleState, id: string): PartyBattleState {
  const m = memberById(state, id);
  if (!m || m.down || m.regenTurns <= 0) return state;
  const amount = Math.min(m.regenAmount, m.maxHp - m.hp);
  const next = withMember(state, id, (x) => ({ ...x, hp: x.hp + amount, regenTurns: x.regenTurns - 1, regenAmount: x.regenTurns - 1 > 0 ? x.regenAmount : 0 }));
  return {
    ...next,
    log: [...next.log, `星癒の羽が${m.name}を癒した（+${amount}）。`],
    last: next.last ? { ...next.last, regen: { target: id, amount } } : next.last,
  };
}

/** 星癒の羽's heal per turn, for this target from this caster. */
export function regenAmountFor(target: PartyMemberSpec, caster: PartyMemberSpec): number {
  return Math.max(1, Math.round(target.maxHp * REGEN_SHARE + (caster.magicPower ?? 0) * REGEN_MAGIC));
}

/** Whether a member can use this technique now (alive, MP enough). */
export function techUsable(member: PartyMember, tech: PartyTechnique): boolean {
  return !member.down && member.mp >= tech.mpCost;
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
  /** 星癒の羽 laid on herself this turn: it starts healing at the end of her NEXT turn. */
  let laidOnSelf = false;
  switch (action.kind) {
    case 'ATTACK': {
      const m = affinityMultiplier(state.enemy.affinity, 'PHYSICAL');
      const hit = strikeEnemy(state, roll(me.attackMin, me.attackMax, rng) * m, me.breakPower ?? 1);
      next = {
        ...hit.state,
        log: [...withoutBreakLine(hit.state.log, hit.broke), `${me.name}の攻撃！ ${state.enemy.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
        last: { actor: me.id, kind: 'ATTACK', target: ENEMY_ID, amount: hit.amount, read: readAffinity(m), broke: hit.broke },
      };
      break;
    }
    case 'SKILL': {
      const skill = me.skills?.find((s) => s.id === action.skillId);
      if (!skill || !partySkillReady(me, skill)) return state;
      const m = affinityMultiplier(state.enemy.affinity, 'PHYSICAL');
      const hit = strikeEnemy(state, roll(me.attackMin, me.attackMax, rng) * skill.power * m, SKILL_BREAK_POWER);
      next = withMember(hit.state, me.id, (x) => ({ ...x, skillUsedAt: { ...x.skillUsedAt, [skill.id]: x.turns } }));
      next = {
        ...next,
        log: [...withoutBreakLine(next.log, hit.broke), `${me.name}の《${skill.name}》！ ${state.enemy.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
        last: { actor: me.id, kind: 'SKILL', target: ENEMY_ID, amount: hit.amount, read: readAffinity(m), name: skill.name, broke: hit.broke },
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
        const paid = withMember(state, me.id, (x) => ({ ...x, mp: x.mp - spell.mpCost }));
        const hit = strikeEnemy(paid, spell.power * m, SPELL_BREAK_POWER);
        next = {
          ...hit.state,
          log: [...withoutBreakLine(hit.state.log, hit.broke), `${me.name}の《${spell.name}》！ ${state.enemy.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
          last: { actor: me.id, kind: 'MAGIC', target: ENEMY_ID, amount: hit.amount, read: readAffinity(m), name: spell.name, broke: hit.broke },
        };
      }
      break;
    }
    case 'TECH': {
      const tech = me.techniques?.find((t) => t.id === action.techId);
      if (!tech || !techUsable(me, tech)) return state;
      const paid = withMember(state, me.id, (x) => ({ ...x, mp: x.mp - tech.mpCost }));
      if (tech.kind === 'MOON_GUARD') {
        // Used again: back to its full length (not stacked).
        next = withMember(paid, me.id, (x) => ({ ...x, guardTurns: tech.turns ?? 2, counterUsed: false }));
        next = {
          ...next,
          log: [...next.log, `${me.name}は《${tech.name}》をとった。`],
          last: { actor: me.id, kind: 'TECH', target: me.id, amount: 0, read: 'PLAIN', name: tech.name },
        };
      } else if (tech.kind === 'REGEN') {
        const target = memberById(paid, action.target ?? me.id);
        if (!target || target.down) return state;
        const amount = regenAmountFor(target, me);
        // On them already: back to its full length (not stacked).
        next = withMember(paid, target.id, (x) => ({ ...x, regenTurns: tech.turns ?? 3, regenAmount: amount }));
        laidOnSelf = target.id === me.id;
        next = {
          ...next,
          log: [...next.log, `${me.name}の《${tech.name}》！ ${target.name}を星の羽が包んだ。`],
          last: { actor: me.id, kind: 'TECH', target: target.id, amount: 0, read: 'PLAIN', name: tech.name },
        };
      } else {
        const m = affinityMultiplier(state.enemy.affinity, 'PHYSICAL');
        const hit = strikeEnemy(paid, roll(me.attackMin, me.attackMax, rng) * (tech.power ?? 1.6) * m, tech.breakPower ?? 4);
        next = {
          ...hit.state,
          log: [...withoutBreakLine(hit.state.log, hit.broke), `${me.name}の《${tech.name}》！ ${state.enemy.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
          last: { actor: me.id, kind: 'TECH', target: ENEMY_ID, amount: hit.amount, read: readAffinity(m), name: tech.name, broke: hit.broke },
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
  if (!laidOnSelf) next = endOwnTurn(next, me.id);
  return advance(settle(next));
}

/** The BREAK line goes after the blow that caused it, not before. */
function withoutBreakLine(log: readonly string[], broke: boolean): string[] {
  if (!broke) return [...log];
  const i = log.length - 1;
  return log[i]?.startsWith('BREAK!!') ? log.slice(0, i) : [...log];
}
function breakLine(hit: { broke: boolean; state: PartyBattleState }): string[] {
  return hit.broke ? [`BREAK!! ${hit.state.enemy.name}の体勢が崩れた。`] : [];
}

/**
 * The creature's turn. BROKEN: it loses the turn (one of two), and stands
 * again — its footing whole — once both are spent. Else its blow at one of
 * them still standing (`strike` says what kind of blow; an ordinary one is
 * physical, at one). 月影の構え on him: a quarter of blows miss, the rest
 * reach him through a guard 30% thicker, and a physical blow at him alone is
 * answered — once a turn — at 0.8 of his swing.
 */
export function enemyAct(state: PartyBattleState, rng: Rng = Math.random, strike: EnemyStrike = ORDINARY_STRIKE): PartyBattleState {
  if (currentActor(state) !== ENEMY_ID) return state;
  if (isBroken(state.enemy)) {
    const left = state.enemy.breakTurns - 1;
    const stands = left <= 0;
    const next: PartyBattleState = {
      ...state,
      enemy: { ...state.enemy, breakTurns: Math.max(0, left), breakCurrent: stands ? state.enemy.breakMax : 0 },
      log: [...state.log, stands ? `${state.enemy.name}は体勢を立て直した。` : `${state.enemy.name}はBREAK中、動けない。`],
      last: { actor: ENEMY_ID, kind: 'ENEMY_BROKEN', target: ENEMY_ID, amount: 0, read: 'PLAIN' },
    };
    return advance(next);
  }
  const standing = state.members.filter((m) => !m.down);
  if (standing.length === 0) return settle(state);
  const targets = strike.area === 'ALL' ? standing : [standing[Math.min(standing.length - 1, Math.floor(rng() * standing.length))]];
  let next = state;
  const said: string[] = [];
  let beat: PartyBeat | null = null;
  const how = state.enemy.attackName ? `${state.enemy.name}の${state.enemy.attackName}！` : `${state.enemy.name}の攻撃！`;
  for (const target of targets) {
    const guarded = target.guardTurns > 0;
    const raw = roll(state.enemy.attackMin, state.enemy.attackMax, rng);
    if (guarded && rng() < MOON_GUARD.evasion) {
      said.push(`${target.name}は攻撃を受け流した。MISS`);
      beat = { actor: ENEMY_ID, kind: 'ENEMY_ATTACK', target: target.id, amount: 0, read: 'PLAIN', missed: true };
    } else {
      const defense = guarded ? target.defense * (1 + MOON_GUARD.defenseUp) : target.defense;
      const cut = Math.max(1, raw - Math.floor(defense / 4));
      const amount = target.defending ? Math.max(1, Math.floor(cut / 2)) : cut;
      next = withMember(next, target.id, (x) => {
        const hp = Math.max(0, x.hp - amount);
        return hp <= 0 ? fallen(x) : { ...x, hp };
      });
      const fell = memberById(next, target.id)!.down;
      said.push(`${target.name}に${amount}のダメージ。${fell ? `${target.name}は倒れた。` : ''}`);
      beat = { actor: ENEMY_ID, kind: 'ENEMY_ATTACK', target: targets.length > 1 ? 'ALL' : target.id, amount, read: 'PLAIN' };
    }
    // The counter: his guard up, still standing, a physical blow at him alone, once a turn.
    const after = memberById(next, target.id)!;
    if (guarded && !after.down && !after.counterUsed && strike.type === 'PHYSICAL' && strike.area === 'ONE') {
      const m = affinityMultiplier(next.enemy.affinity, 'PHYSICAL');
      const hit = strikeEnemy(next, roll(after.attackMin, after.attackMax, rng) * MOON_GUARD.counter * m, COUNTER_BREAK_POWER);
      next = withMember(hit.state, target.id, (x) => ({ ...x, counterUsed: true }));
      next = { ...next, log: withoutBreakLine(next.log, hit.broke) };
      said.push(`${target.name}の反撃！ ${state.enemy.name}に${hit.amount}のダメージ。`, ...breakLine(hit));
      beat = { ...beat!, counter: hit.amount, broke: hit.broke };
    }
  }
  next = { ...next, log: [...next.log, `${how} ${said.join(' ')}`], last: beat };
  return advance(settle(next));
}

/** HP at or under this share of its most counts as low, for AUTO's mending. */
export const AUTO_MEND_AT = 0.4;
/** Under this share, AUTO lays 星癒の羽 on one who has none. */
export const AUTO_REGEN_UNDER = 0.7;
/** At or under this share, the hero takes 月影の構え (if it is not already up). */
export const AUTO_GUARD_AT = 0.5;

/**
 * AUTO, for the member whose turn it is:
 *   - a heal now if one of them is low (癒しの光);
 *   - 星癒の羽 on the lowest under 70% with none on them (never on one whole);
 *   - the hero: 月影の構え when he is at half or under and it is not up
 *     (never every turn); else 《瞬断》 when ready; else a swing;
 *   - Grave: 重撃・豪断 when the creature is broken, or its footing would
 *     break with it, or every other turn of his; else a swing;
 *   - Kaos: her strongest damage spell if better than a swing; else a swing.
 */
export function partyAutoAction(state: PartyBattleState): PartyAction | null {
  const id = currentActor(state);
  const me = id && id !== ENEMY_ID ? memberById(state, id) : undefined;
  if (!me) return null;
  const spells = castable(me);
  const techs = (me.techniques ?? []).filter((t) => techUsable(me, t));
  const standing = state.members.filter((m) => !m.down);
  const mend = spells.filter((s) => s.effect === 'MEND').sort((a, b) => b.power - a.power)[0];
  const low = standing.filter((m) => m.hp <= m.maxHp * AUTO_MEND_AT).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  if (mend && low) return { kind: 'MAGIC', magicId: mend.id, target: low.id };
  const regen = techs.find((t) => t.kind === 'REGEN');
  if (regen) {
    const wants = standing
      .filter((m) => m.hp < m.maxHp * AUTO_REGEN_UNDER && m.regenTurns === 0)
      .sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
    if (wants) return { kind: 'TECH', techId: regen.id, target: wants.id };
  }
  const guard = techs.find((t) => t.kind === 'MOON_GUARD');
  if (guard && me.guardTurns === 0 && me.hp <= me.maxHp * AUTO_GUARD_AT) return { kind: 'TECH', techId: guard.id };
  const heavy = techs.find((t) => t.kind === 'HEAVY');
  if (heavy) {
    const finishing = !isBroken(state.enemy) && state.enemy.breakCurrent <= (heavy.breakPower ?? 4);
    if (isBroken(state.enemy) || finishing || me.turns % 2 === 0) return { kind: 'TECH', techId: heavy.id };
  }
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
