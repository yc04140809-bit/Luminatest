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
// SEVERAL CREATURES (2026-10-12, 複数敵): a fight may set one, two or three
// creatures against the party (`createPartyBattle(party, [a, b, c])`), each
// its own: its own health, its own turn in the order (by its speed, like
// anyone's), its own footing and BREAK, its own BREAK event. A blow, a skill,
// a damage spell and 重撃・豪断 are aimed at ONE of them (`target`, its id); one
// at nought is down — out of the order, no longer a target — and the fight
// goes on until every one of them is. One creature is simply a fight of one:
// its id is ENEMY_ID and `state.enemy` is it.
//
// MAGIC AND SKILLS, KEPT APART (2026-10-12, 戦闘ルール整理): a spell costs
// MP and can be cast as long as there is MP; a skill (月影の構え, 星癒の羽,
// 重撃・豪断, 《瞬断》) costs nothing and is a member's own, used and then
// cooling down for a number of their own turns (`cooldown`). 星癒の羽 is not
// laid on one who already has it.
//
// A CREATURE'S OWN WEIGHT: `guard` — the share of a blow it shrugs off while
// it stands (a shelled one: ヴァルシール), gone while it is BROKEN, which is
// when 1.4× lands instead; `moves` — its harder blow at one of them and,
// rarely, a sweep at all of them; `boss` — a fight not to be fled.
//
// SLOWED, AND COMBO (作者 2026-10-24「彼岸花＋BREAK / COMBO戦術拡張」): 《彼岸花》 leaves the creature
// slowed — its speed halved for its next three turns — so in the next round's order it falls behind
// the party (no new speed system: the order is still worked out by speed each round), and in a BREAK
// more of the party's turns come before it stands. COMBO is the party's blows in a row (a move of
// several counts each; a creature acting ends it, a broken one's lost turn does not, 月影's counter
// starts the next) — and from 10 it is worth more: +5% a step of ten, at most +20%.
//
// 《彼岸花》 AT ALL OF THEM (作者 2026-10-24 最終仕様): its three cuts fall on every creature standing, each
// strike as against one; each one hit counts to COMBO (three creatures: nine) and each left standing is
// slowed. AUTO keeps it for a BREAK, a creature about to break, or several not yet slowed (finisherAim).
//
// Still not here: items, revival.
//
// Pure: a state in, a state out, the dice passed in.

import type { EnemySpec, HeroSkillSpec } from './battleLogic';
import type { MagicDef } from '../../core/magic/magic';
import { affinityMultiplier, readAffinity, type AffinityRead, type EnemyAffinity } from './damageType';

export type PartyOutcome = 'ONGOING' | 'VICTORY' | 'DEFEAT';

/** The (first) creature's place in the order; the others are `enemy-2`, `enemy-3`… */
export const ENEMY_ID = 'enemy';

/** The id of the creature at this place in the fight's list (0: ENEMY_ID). */
export const enemyIdAt = (i: number) => (i === 0 ? ENEMY_ID : `${ENEMY_ID}-${i + 1}`);

/** Whether an actor's id is a creature's. */
export const isEnemyId = (id: string | null | undefined): boolean => !!id && (id === ENEMY_ID || id.startsWith(`${ENEMY_ID}-`));

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
  /** How many blows it is shown as — and counted as, for COMBO (重撃・豪断 2). One strike still. */
  hits?: number;
  /** HEAVY: how much it wears the creature's footing. */
  breakPower?: number;
  /** MOON_GUARD / REGEN: how many of the target's turns it lasts. */
  turns?: number;
  /**
   * A skill's wait: used on one of the member's own turns, it is ready again
   * this many of their turns later (5: used, four turns without it, ready on
   * the fifth). Absent or 0: no wait.
   */
  cooldown?: number;
}

/** 月影の構え: what it does while it lasts. */
/**
 * `taunt`: while it is up, a creature's blow at ONE of them is drawn to him
 * this often (the rest of the time it is aimed as ever, among all of them).
 * Never a blow at all of them; gone when he is down or it runs out.
 */
export const MOON_GUARD = { defenseUp: 0.3, evasion: 0.25, counter: 0.8, taunt: 0.85 } as const;

/**
 * How strongly a member draws a creature's single blows right now (0: not at
 * all) — 月影の構え while it lasts; the one place a later 挑発 or 注目 adds
 * to. A state of the moment, never a lasting hate.
 */
export function tauntOf(member: PartyMember): number {
  return !member.down && member.guardTurns > 0 ? MOON_GUARD.taunt : 0;
}

/**
 * Who a creature's single blow is aimed at, from one die: the one drawing it
 * (the strongest taunt, if any) for the first `taunt` of the die, else among
 * all of them standing, evenly, by the rest of it. With no one drawing it,
 * the die picks among them as it always has.
 */
export function singleTarget(standing: readonly PartyMember[], r: number): PartyMember {
  const drawer = [...standing].sort((a, b) => tauntOf(b) - tauntOf(a))[0];
  const pull = drawer ? tauntOf(drawer) : 0;
  if (pull > 0) {
    if (r < pull) return drawer;
    const rest = (r - pull) / (1 - pull);
    return standing[Math.min(standing.length - 1, Math.floor(rest * standing.length))];
  }
  return standing[Math.min(standing.length - 1, Math.floor(r * standing.length))];
}
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
/** SLOWED (《彼岸花》): its speed this much of itself… */
export const SLOW_SPEED = 0.5;
/** …for this many of its own turns (a BREAK's two lost ones and one more). */
export const SLOW_TURNS = 3;
/** COMBO's worth: +5% for each full ten, at most +20% (作者 第一案: 10/20/30/40). */
export const COMBO_STEP = 10;
export const COMBO_STEP_BONUS = 0.05;
export const COMBO_MAX_BONUS = 0.2;

/** What the party's blows are worth at this COMBO (1 under 10; 1.05 from 10, … 1.2 from 40). */
export function comboMultiplier(hits: number): number {
  return 1 + Math.min(COMBO_MAX_BONUS, Math.floor(Math.max(0, hits) / COMBO_STEP) * COMBO_STEP_BONUS);
}

/** The party's blows in a row, and their damage together. */
export interface PartyCombo {
  hits: number;
  damage: number;
}
export const NO_COMBO: PartyCombo = { hits: 0, damage: 0 };

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
  /** Its place in the order and what a blow is aimed at (ENEMY_ID for the first). */
  id: string;
  /** Its drawing (battleArt's enemy id), for the screen; the fight never reads it. */
  artId?: string;
  /** How big it is on the screen (staging only). */
  battleScale?: BattleScale;
  /** How much AUTO wants it down first, beside its health (0 if absent: ordinary). */
  danger: number;
  /** The share of a blow it shrugs off while it stands (0: none); gone while it is broken. */
  guard: number;
  /** Its harder blow at one of them, and its sweep at all of them (rare), if it has them. */
  moves: { heavy?: PartyEnemyMove; sweep?: PartyEnemyMove };
  /** A boss: its fight is not fled. */
  boss: boolean;
  /** At nought: out of the order and no longer a target. */
  down: boolean;
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
  /** SLOWED (《彼岸花》): how many more of its own turns its speed is SLOW_SPEED of itself (0: not). */
  slowTurns: number;
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
  /** A move of several cuts (《彼岸花》): what each landed on the one aimed at, in order. */
  hits?: readonly number[];
  /** It left the creature slowed. */
  slowed?: boolean;
  /**
   * A move at every creature standing (《彼岸花》, area 'ALL'): each one's cuts, the one aimed at first
   * (`target`, `hits`, `broke` and `slowed` above are its; `amount` is all of them together).
   */
  spread?: readonly PartyStrike[];
}

/** One creature's share of a move at all of them. */
export interface PartyStrike {
  target: string;
  hits: readonly number[];
  broke: boolean;
  slowed: boolean;
}

export interface PartyBattleState {
  members: readonly PartyMember[];
  /** Every creature in the fight, in the order it was set (the first is ENEMY_ID). */
  enemies: readonly PartyEnemy[];
  /** The first creature — the one creature of a fight of one (kept in step with `enemies`). */
  enemy: PartyEnemy;
  /** This round's order, by id. */
  order: readonly string[];
  /** Whose turn it is, as an index into `order`. */
  at: number;
  round: number;
  log: readonly string[];
  outcome: PartyOutcome;
  last: PartyBeat | null;
  /** COMBO as it stands after the last beat. */
  combo: PartyCombo;
}

/**
 * What the member whose turn it is does. `target` is who it is aimed at: a
 * creature's id for a blow, a skill, a damage spell or 重撃・豪断 (absent: the
 * first one standing); a member's id for a heal or 星癒の羽 (absent: oneself).
 */
export type PartyAction =
  | { kind: 'ATTACK'; target?: string }
  | { kind: 'SKILL'; skillId: string; target?: string }
  | { kind: 'MAGIC'; magicId: string; target?: string }
  | { kind: 'TECH'; techId: string; target?: string }
  | { kind: 'DEFEND' };

/** What the creature's blow is (for the counter's rules): kind and reach — and, for a move, its name and weight. */
export interface EnemyStrike {
  type: 'PHYSICAL' | 'MAGIC';
  area: 'ONE' | 'ALL';
  /** Times its ordinary blow (absent: 1). */
  power?: number;
  /** The move's name, said in the log (absent: its ordinary blow's). */
  name?: string;
}

/** A creature's move beyond its ordinary blow: its name, weight and how often (a share of its turns). */
export interface PartyEnemyMove {
  name: string;
  power: number;
  chance: number;
}
export const ORDINARY_STRIKE: EnemyStrike = { type: 'PHYSICAL', area: 'ONE' };

export type Rng = () => number;

/** The creature's speed when its content gives none: between the hero and Kaos at the start. */
export const DEFAULT_ENEMY_SPEED = 12;

const roll = (min: number, max: number, rng: Rng) => Math.floor(min + rng() * (max - min + 1));

/**
 * The order for a round: everyone standing, each creature on its own, fastest
 * first; on a tie the party first (in party order), then the creatures (in
 * theirs).
 */
export function roundOrder(members: readonly PartyMember[], enemies: PartyEnemy | readonly PartyEnemy[]): string[] {
  const foes = Array.isArray(enemies) ? enemies : [enemies as PartyEnemy];
  const actors = [
    ...members.filter((m) => !m.down).map((m, i) => ({ id: m.id, speed: m.speed, rank: i })),
    ...foes.map((e, i) => ({ e, i })).filter(({ e }) => e.hp > 0 && !e.down).map(({ e, i }) => ({ id: e.id, speed: speedOf(e), rank: members.length + i })),
  ];
  return actors.sort((a, b) => b.speed - a.speed || a.rank - b.rank).map((a) => a.id);
}

/** A creature's speed as the order reads it: halved while it is SLOWED. */
export function speedOf(e: PartyEnemy): number {
  return (e.slowTurns ?? 0) > 0 ? e.speed * SLOW_SPEED : e.speed;
}

/** A creature for the party fight: its spec, and what the party fight adds. */
export type PartyEnemyInput = EnemySpec & {
  speed?: number;
  breakMax?: number;
  onBreak?: PartyEnemy['onBreak'];
  /** Its drawing (battleArt's enemy id), carried for the screen. */
  artId?: string;
  /** How much AUTO wants it down first (0: ordinary; a dangerous one higher). */
  danger?: number;
  /** The share of a blow it shrugs off while it stands (0–0.8; absent: none). */
  guard?: number;
  /** Its harder blow at one of them and its sweep at all of them (the party fight's own, beside the spec's `moves`). */
  partyMoves?: { heavy?: PartyEnemyMove; sweep?: PartyEnemyMove };
  /** A boss: not to be fled. */
  boss?: boolean;
  /**
   * How big it is on the battle screen — staging only, the fight never
   * reads it. 'GIANT' (ヴァルシール; later a dragon, a great machine…) is
   * drawn across the left of the screen and the party drawn smaller.
   */
  battleScale?: BattleScale;
};

/** How big a creature stands on the battle screen (staging only). */
export type BattleScale = 'NORMAL' | 'GIANT';

/** Two of one name in a fight are told apart: モスラビットA, モスラビットB. */
function namesOf(inputs: readonly PartyEnemyInput[]): string[] {
  const count = (n: string) => inputs.filter((e) => e.name === n).length;
  const seen: Record<string, number> = {};
  return inputs.map((e) => {
    if (count(e.name) < 2) return e.name;
    seen[e.name] = (seen[e.name] ?? 0) + 1;
    return `${e.name}${String.fromCharCode(64 + seen[e.name])}`;
  });
}

function foeOf(input: PartyEnemyInput, i: number, name: string): PartyEnemy {
  const footing = Math.max(1, input.breakMax ?? DEFAULT_BREAK_MAX);
  return {
    id: enemyIdAt(i),
    artId: input.artId,
    battleScale: input.battleScale,
    danger: input.danger ?? 0,
    guard: Math.max(0, Math.min(0.8, input.guard ?? 0)),
    moves: input.partyMoves ?? {},
    boss: !!input.boss,
    down: input.hp <= 0,
    name,
    hp: input.hp,
    maxHp: input.hp,
    attackMin: input.attackMin,
    attackMax: input.attackMax,
    attackName: input.attackName ?? null,
    speed: input.speed ?? DEFAULT_ENEMY_SPEED,
    affinity: input.affinity ?? null,
    breakMax: footing,
    breakCurrent: footing,
    breakTurns: 0,
    breaks: 0,
    slowTurns: 0,
    onBreak: input.onBreak,
  };
}

/** The fight with its creatures as given (the first kept as `enemy`). */
function withEnemies(state: PartyBattleState, enemies: readonly PartyEnemy[]): PartyBattleState {
  return { ...state, enemies, enemy: enemies[0] };
}

/** One creature changed. */
function withEnemy(state: PartyBattleState, id: string, f: (e: PartyEnemy) => PartyEnemy): PartyBattleState {
  return withEnemies(state, state.enemies.map((e) => (e.id === id ? f(e) : e)));
}

/** A creature by its id. */
export function enemyById(state: PartyBattleState, id: string): PartyEnemy | undefined {
  return state.enemies.find((e) => e.id === id);
}

/** The creatures still standing, in their order. */
export function standingEnemies(state: PartyBattleState): PartyEnemy[] {
  return state.enemies.filter((e) => !e.down && e.hp > 0);
}

/**
 * Who a blow is aimed at: the one named, if it is standing (else nobody —
 * the action is refused); with none named, the first one standing.
 */
export function enemyTarget(state: PartyBattleState, id?: string): PartyEnemy | undefined {
  if (id === undefined) return standingEnemies(state)[0];
  const e = enemyById(state, id);
  return e && !e.down && e.hp > 0 ? e : undefined;
}

export function createPartyBattle(specs: readonly PartyMemberSpec[], enemyInput: PartyEnemyInput | readonly PartyEnemyInput[]): PartyBattleState {
  const inputs: readonly PartyEnemyInput[] = Array.isArray(enemyInput) ? enemyInput : [enemyInput as PartyEnemyInput];
  if (inputs.length === 0) throw new Error('a party fight needs at least one creature');
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
  const names = namesOf(inputs);
  const enemies = inputs.map((e, i) => foeOf(e, i, names[i]));
  const first = inputs[0];
  const appear = inputs.length === 1 ? (first.appearLine ?? `${first.name}が現れた！`) : `${names.join('、')}が現れた！`;
  const state: PartyBattleState = {
    members,
    enemies,
    enemy: enemies[0],
    order: roundOrder(members, enemies),
    at: 0,
    round: 1,
    log: [appear],
    outcome: 'ONGOING',
    last: null,
    combo: NO_COMBO,
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
      order = roundOrder(state.members, state.enemies);
      i = 0;
      if (order.length === 0) break;
    }
    // One who fell this round keeps their place in it, but takes no turn.
    const id = order[i];
    const gone = isEnemyId(id) ? !enemyTarget(state, id) : !!memberById(state, id)?.down;
    if (!gone || out.length === 0) out.push(id);
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

/**
 * After anything: a creature at nought is down (said once); every creature
 * down is a victory, every member down a defeat.
 */
function settle(state: PartyBattleState): PartyBattleState {
  const fell = state.enemies.filter((e) => e.hp <= 0 && !e.down);
  if (fell.length > 0) {
    state = withEnemies(
      { ...state, log: [...state.log, ...fell.map((e) => `${e.name}を倒した！`)] },
      state.enemies.map((e) => (e.hp <= 0 && !e.down ? { ...e, hp: 0, down: true, breakTurns: 0 } : e)),
    );
  }
  if (state.enemies.every((e) => e.down)) {
    return { ...state, outcome: 'VICTORY', log: state.enemies.length > 1 ? [...state.log, 'すべての敵を倒した！'] : state.log };
  }
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
  if (isEnemyId(id)) return { ...state, members: state.members.map((m) => (m.counterUsed ? { ...m, counterUsed: false } : m)) };
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
      order = roundOrder(state.members, state.enemies);
      at = 0;
      round += 1;
    }
    const id = order[at];
    if (isEnemyId(id) ? !!enemyTarget(state, id) : !state.members.find((m) => m.id === id)?.down) break;
  }
  return startTurn({ ...state, order, at, round });
}

/**
 * A blow landing on one creature: `base` as worked out, 1.4× while IT is
 * broken; ITS footing worn by `breakPower` (not while broken). At nought it is
 * BROKEN — its own event, if it has one, runs then. The others are untouched.
 * Returns the fight and what landed.
 */
function strikeEnemy(
  state: PartyBattleState,
  targetId: string,
  base: number,
  breakPower: number,
  combo = state.combo.hits,
): { state: PartyBattleState; amount: number; broke: boolean; name: string } {
  const foe = enemyById(state, targetId)!;
  const broken = isBroken(foe);
  // Standing, its guard takes its share off; broken, the guard is gone and it takes 1.4×. COMBO as it
  // stands before this blow adds its worth (comboMultiplier).
  const amount = Math.max(1, Math.round(base * comboMultiplier(combo) * (broken ? BROKEN_TAKEN : 1 - foe.guard)));
  const hp = Math.max(0, foe.hp - amount);
  if (broken || hp <= 0) return { state: withEnemy(state, foe.id, (e) => ({ ...e, hp })), amount, broke: false, name: foe.name };
  const left = foe.breakCurrent - Math.max(0, breakPower);
  if (left > 0) return { state: withEnemy(state, foe.id, (e) => ({ ...e, hp, breakCurrent: left })), amount, broke: false, name: foe.name };
  const first = foe.breaks === 0;
  let next = withEnemy(state, foe.id, (e) => ({ ...e, hp, breakCurrent: 0, breakTurns: BREAK_TURNS, breaks: e.breaks + 1 }));
  next = { ...next, log: [...next.log, `BREAK!! ${foe.name}の体勢が崩れた。`] };
  if (foe.onBreak) next = foe.onBreak(next, first);
  return { state: next, amount, broke: true, name: foe.name };
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

/**
 * How many more of a member's own turns before a skill or technique of
 * theirs can be used again (0: ready). Counted from the turn it was used:
 * with a wait of 5, it reads 4 right after, then 3, 2, 1, and it is ready.
 */
export function cooldownLeft(member: PartyMember, id: string, cooldown: number): number {
  const used = member.skillUsedAt[id];
  if (used === undefined || cooldown <= 0) return 0;
  return Math.max(0, cooldown - (member.turns - used));
}

/** Whether a member can use this technique now (standing, MP enough, its wait over). */
export function techUsable(member: PartyMember, tech: PartyTechnique): boolean {
  return !member.down && member.mp >= tech.mpCost && cooldownLeft(member, tech.id, tech.cooldown ?? 0) === 0;
}

/** Whether 星癒の羽 (or any heal over time) can be laid on this one: standing, and none on them already. */
export function regenTargetable(member: PartyMember): boolean {
  return !member.down && member.regenTurns <= 0;
}

/**
 * The member whose turn it is does this. Refused (the state as it was)
 * when it is not a standing member's turn, or the action cannot be done.
 */
export function partyAct(state: PartyBattleState, action: PartyAction, rng: Rng = Math.random): PartyBattleState {
  const id = currentActor(state);
  const me = id && !isEnemyId(id) ? memberById(state, id) : undefined;
  if (!me || me.down) return state;
  let next: PartyBattleState | null = null;
  /** 星癒の羽 laid on herself this turn: it starts healing at the end of her NEXT turn. */
  let laidOnSelf = false;
  switch (action.kind) {
    case 'ATTACK': {
      const foe = enemyTarget(state, action.target);
      if (!foe) return state;
      const m = affinityMultiplier(foe.affinity, 'PHYSICAL');
      const hit = strikeEnemy(state, foe.id, roll(me.attackMin, me.attackMax, rng) * m, me.breakPower ?? 1);
      next = {
        ...hit.state,
        log: [...withoutBreakLine(hit.state.log, hit.broke), `${me.name}の攻撃！ ${foe.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
        last: { actor: me.id, kind: 'ATTACK', target: foe.id, amount: hit.amount, read: readAffinity(m), broke: hit.broke },
      };
      break;
    }
    case 'SKILL': {
      const skill = me.skills?.find((s) => s.id === action.skillId);
      const foe = enemyTarget(state, action.target);
      if (!skill || !partySkillReady(me, skill) || !foe) return state;
      if (skill.cuts && skill.cuts.length > 1) {
        next = severalCuts(state, me, skill, foe, rng);
        break;
      }
      const m = affinityMultiplier(foe.affinity, 'PHYSICAL');
      const hit = strikeEnemy(state, foe.id, roll(me.attackMin, me.attackMax, rng) * skill.power * m, SKILL_BREAK_POWER);
      next = withMember(hit.state, me.id, (x) => ({ ...x, skillUsedAt: { ...x.skillUsedAt, [skill.id]: x.turns } }));
      next = {
        ...next,
        log: [...withoutBreakLine(next.log, hit.broke), `${me.name}の《${skill.name}》！ ${foe.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
        last: { actor: me.id, kind: 'SKILL', target: foe.id, amount: hit.amount, read: readAffinity(m), name: skill.name, broke: hit.broke },
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
        const foe = enemyTarget(state, action.target);
        if (!foe) return state;
        const m = affinityMultiplier(foe.affinity, spell.type, spell.element);
        const paid = withMember(state, me.id, (x) => ({ ...x, mp: x.mp - spell.mpCost }));
        const hit = strikeEnemy(paid, foe.id, spell.power * m, SPELL_BREAK_POWER);
        next = {
          ...hit.state,
          log: [...withoutBreakLine(hit.state.log, hit.broke), `${me.name}の《${spell.name}》！ ${foe.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
          last: { actor: me.id, kind: 'MAGIC', target: foe.id, amount: hit.amount, read: readAffinity(m), name: spell.name, broke: hit.broke },
        };
      }
      break;
    }
    case 'TECH': {
      const tech = me.techniques?.find((t) => t.id === action.techId);
      if (!tech || !techUsable(me, tech)) return state;
      // Paid, and its wait begins (counted from this turn).
      const paid = withMember(state, me.id, (x) => ({ ...x, mp: x.mp - tech.mpCost, skillUsedAt: { ...x.skillUsedAt, [tech.id]: x.turns } }));
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
        // Not on one who is down, nor on one who has it already (not stacked, not renewed).
        if (!target || !regenTargetable(target)) return state;
        const amount = regenAmountFor(target, me);
        next = withMember(paid, target.id, (x) => ({ ...x, regenTurns: tech.turns ?? 3, regenAmount: amount }));
        laidOnSelf = target.id === me.id;
        next = {
          ...next,
          log: [...next.log, `${me.name}の《${tech.name}》！ ${target.name}を星の羽が包んだ。`],
          last: { actor: me.id, kind: 'TECH', target: target.id, amount: 0, read: 'PLAIN', name: tech.name },
        };
      } else {
        const foe = enemyTarget(state, action.target);
        if (!foe) return state;
        const m = affinityMultiplier(foe.affinity, 'PHYSICAL');
        const hit = strikeEnemy(paid, foe.id, roll(me.attackMin, me.attackMax, rng) * (tech.power ?? 1.6) * m, tech.breakPower ?? 4);
        next = {
          ...hit.state,
          log: [...withoutBreakLine(hit.state.log, hit.broke), `${me.name}の《${tech.name}》！ ${foe.name}に${hit.amount}のダメージ。`, ...breakLine(hit)],
          last: { actor: me.id, kind: 'TECH', target: foe.id, amount: hit.amount, read: readAffinity(m), name: tech.name, broke: hit.broke },
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
  next = { ...next, combo: comboAfter(state.combo, next.last!, blowsOf(me, action, next.last!)) };
  if (!laidOnSelf) next = endOwnTurn(next, me.id);
  return advance(settle(next));
}

/** How many blows a member's beat counts as, for COMBO: a move's cuts landed, or what it is shown as. */
function blowsOf(me: PartyMember, action: PartyAction, beat: PartyBeat): number {
  if (beat.spread) return beat.spread.reduce((n, x) => n + x.hits.length, 0);
  if (beat.hits) return beat.hits.length;
  if (action.kind === 'SKILL') return me.skills?.find((s) => s.id === action.skillId)?.hits ?? 1;
  if (action.kind === 'TECH') return me.techniques?.find((t) => t.id === action.techId)?.hits ?? 1;
  return 1;
}

/**
 * COMBO after a beat: the party's blows on a creature add (each of a move of several); a creature
 * acting ends it — but not a broken one losing its turn; 月影's counter on that turn starts the next.
 */
export function comboAfter(prev: PartyCombo, beat: PartyBeat, blows = 1): PartyCombo {
  if (isEnemyId(beat.actor)) {
    if (beat.kind === 'ENEMY_BROKEN') return prev;
    return beat.counter !== undefined && beat.counter > 0 ? { hits: 1, damage: beat.counter } : NO_COMBO;
  }
  if (!isEnemyId(beat.target) || beat.amount <= 0 || beat.missed) return prev;
  return { hits: prev.hits + Math.max(1, blows), damage: prev.damage + beat.amount };
}

/**
 * A MOVE OF SEVERAL CUTS (《彼岸花》): each cut its own strike — its own multiple of a swing, its own roll,
 * COMBO counting up as they land (each worth what COMBO is by then), each wearing footing by its
 * own measure. One that brings a creature down ends it for that one; one that BREAKs it lets the rest
 * land on it at 1.4×. Then each still standing is SLOWED.
 *
 * AT ALL OF THEM (area 'ALL', 作者 2026-10-24 最終仕様): each cut falls on every creature standing — the
 * one aimed at first, then the rest in their order — before the next cut: three creatures, nine
 * strikes, nine to COMBO. Each strike is worked out as against one (no share taken off for the many):
 * its worth is the spread, the slowing and COMBO.
 */
function severalCuts(state: PartyBattleState, me: PartyMember, skill: HeroSkillSpec, aimed: PartyEnemy, rng: Rng): PartyBattleState {
  let s = withMember(state, me.id, (x) => ({ ...x, skillUsedAt: { ...x.skillUsedAt, [skill.id]: x.turns } }));
  const all = skill.area === 'ALL';
  const foes = all ? [aimed, ...standingEnemies(state).filter((e) => e.id !== aimed.id)] : [aimed];
  const struck = foes.map((foe) => ({ foe, hits: [] as number[], broke: false, m: affinityMultiplier(foe.affinity, 'PHYSICAL') }));
  const from = s.log.length;
  let landed = 0;
  for (const share of skill.cuts!) {
    for (const x of struck) {
      if (!enemyTarget(s, x.foe.id)) continue;
      const hit = strikeEnemy(s, x.foe.id, roll(me.attackMin, me.attackMax, rng) * share * x.m, skill.cutBreakPower ?? 1, state.combo.hits + landed);
      s = hit.state;
      x.hits.push(hit.amount);
      x.broke = x.broke || hit.broke;
      landed += 1;
    }
  }
  const slowed = struck.filter((x) => !!skill.slows && !!enemyTarget(s, x.foe.id));
  for (const x of slowed) s = withEnemy(s, x.foe.id, (e) => ({ ...e, slowTurns: SLOW_TURNS }));
  const total = struck.reduce((n, x) => n + x.hits.reduce((a, b) => a + b, 0), 0);
  // The BREAK lines said as the cuts landed go after the line that says the cuts.
  const breaks = s.log.slice(from).filter((l) => l.startsWith('BREAK!!'));
  const told = struck.filter((x) => x.hits.length > 0).map((x) => `${x.foe.name}に${x.hits.join('・')}`);
  const [first] = struck;
  const spread: PartyStrike[] = struck.map((x) => ({ target: x.foe.id, hits: x.hits, broke: x.broke, slowed: slowed.includes(x) }));
  return {
    ...s,
    log: [
      ...s.log.slice(0, from),
      ...s.log.slice(from).filter((l) => !l.startsWith('BREAK!!')),
      `${me.name}の《${skill.name}》！ ${told.join('、')}のダメージ。`,
      ...breaks,
      ...(slowed.length > 0 ? [`${slowed.map((x) => x.foe.name).join('、')}の動きが鈍った。（速度DOWN）`] : []),
    ],
    last: {
      actor: me.id,
      kind: 'SKILL',
      target: first.foe.id,
      amount: total,
      read: readAffinity(first.m),
      name: skill.name,
      broke: struck.some((x) => x.broke),
      hits: first.hits,
      slowed: spread[0].slowed,
      ...(all ? { spread } : {}),
    },
  };
}

/** The BREAK line goes after the blow that caused it, not before. */
function withoutBreakLine(log: readonly string[], broke: boolean): string[] {
  if (!broke) return [...log];
  const i = log.length - 1;
  return log[i]?.startsWith('BREAK!!') ? log.slice(0, i) : [...log];
}
function breakLine(hit: { broke: boolean; name: string }): string[] {
  return hit.broke ? [`BREAK!! ${hit.name}の体勢が崩れた。`] : [];
}

/**
 * The creature's turn. BROKEN: it loses the turn (one of two), and stands
 * again — its footing whole — once both are spent. Else its blow at one of
 * them still standing (`strike` says what kind of blow; an ordinary one is
 * physical, at one). 月影の構え on him: a single blow is drawn to him (85%),
 * a quarter of the blows at him miss, the rest
 * reach him through a guard 30% thicker, and a physical blow at him alone is
 * answered — once a turn — at 0.8 of his swing.
 */
export function enemyAct(state: PartyBattleState, rng: Rng = Math.random, chosen?: EnemyStrike): PartyBattleState {
  const actorId = currentActor(state);
  const foe = isEnemyId(actorId) ? enemyTarget(state, actorId!) : undefined;
  if (!foe) return state;
  if (isBroken(foe)) {
    const left = foe.breakTurns - 1;
    const stands = left <= 0;
    let next = withEnemy(state, foe.id, (e) => ({ ...e, breakTurns: Math.max(0, left), breakCurrent: stands ? e.breakMax : 0, slowTurns: Math.max(0, e.slowTurns - 1) }));
    next = {
      ...next,
      log: [...next.log, stands ? `${foe.name}は体勢を立て直した。` : `${foe.name}はBREAK中、動けない。`],
      last: { actor: foe.id, kind: 'ENEMY_BROKEN', target: foe.id, amount: 0, read: 'PLAIN' },
    };
    return advance({ ...next, combo: comboAfter(state.combo, next.last!) });
  }
  const standing = state.members.filter((m) => !m.down);
  if (standing.length === 0) return settle(state);
  const strike = chosen ?? chooseStrike(foe, rng);
  // A blow at all of them is at all of them; a blow at one is drawn by 月影の構え (singleTarget).
  const targets = strike.area === 'ALL' ? standing : [singleTarget(standing, rng())];
  let next = state;
  const said: string[] = [];
  let beat: PartyBeat | null = null;
  const blowName = strike.name ?? foe.attackName;
  const how = blowName ? `${foe.name}の${blowName}！` : `${foe.name}の攻撃！`;
  for (const target of targets) {
    const guarded = target.guardTurns > 0;
    const raw = Math.round(roll(foe.attackMin, foe.attackMax, rng) * (strike.power ?? 1));
    if (guarded && rng() < MOON_GUARD.evasion) {
      said.push(`${target.name}は攻撃を受け流した。MISS`);
      beat = { actor: foe.id, kind: 'ENEMY_ATTACK', target: target.id, amount: 0, read: 'PLAIN', missed: true };
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
      beat = { actor: foe.id, kind: 'ENEMY_ATTACK', target: targets.length > 1 ? 'ALL' : target.id, amount, read: 'PLAIN' };
    }
    // The counter: his guard up, still standing, a physical blow at him alone, once a turn.
    const after = memberById(next, target.id)!;
    if (guarded && !after.down && !after.counterUsed && strike.type === 'PHYSICAL' && strike.area === 'ONE' && enemyTarget(next, foe.id)) {
      const m = affinityMultiplier(foe.affinity, 'PHYSICAL');
      // A new COMBO starts with it (the creature's own turn ended the last): worth nothing extra.
      const hit = strikeEnemy(next, foe.id, roll(after.attackMin, after.attackMax, rng) * MOON_GUARD.counter * m, COUNTER_BREAK_POWER, 0);
      next = withMember(hit.state, target.id, (x) => ({ ...x, counterUsed: true }));
      next = { ...next, log: withoutBreakLine(next.log, hit.broke) };
      said.push(`${target.name}の反撃！ ${foe.name}に${hit.amount}のダメージ。`, ...breakLine(hit));
      beat = { ...beat!, counter: hit.amount, broke: hit.broke };
    }
  }
  next = withEnemy(next, foe.id, (e) => ({ ...e, slowTurns: Math.max(0, e.slowTurns - 1) }));
  next = { ...next, log: [...next.log, `${how} ${said.join(' ')}`], last: beat, combo: comboAfter(state.combo, beat!) };
  return advance(settle(next));
}

/**
 * What a creature does on its turn, when the caller does not say: its sweep
 * at all of them (rarely), its harder blow at one, or its ordinary blow. One
 * die for the choice, and only for a creature that has moves.
 */
function chooseStrike(foe: PartyEnemy, rng: Rng): EnemyStrike {
  const { heavy, sweep } = foe.moves;
  if (!heavy && !sweep) return ORDINARY_STRIKE;
  const r = rng();
  if (sweep && r < sweep.chance) return { type: 'PHYSICAL', area: 'ALL', power: sweep.power, name: sweep.name };
  if (heavy && r < (sweep?.chance ?? 0) + heavy.chance) return { type: 'PHYSICAL', area: 'ONE', power: heavy.power, name: heavy.name };
  return ORDINARY_STRIKE;
}

/** HP at or under this share of its most counts as low, for AUTO's mending. */
export const AUTO_MEND_AT = 0.4;
/** Under this share, AUTO lays 星癒の羽 on one who has none. */
export const AUTO_REGEN_UNDER = 0.7;
/** At or under this share, the hero takes 月影の構え (if it is not already up and is ready). */
export const AUTO_GUARD_AT = 0.5;
/** Facing a creature with a harder blow, he takes it sooner: at or under this share. */
export const AUTO_GUARD_WARY_AT = 0.7;

/**
 * WHO AUTO AIMS AT, among the creatures standing, for a blow wearing their
 * footing by `breakPower`:
 *   1. one this blow would BREAK (its footing at or under it) — the most
 *      dangerous of those, then the weakest;
 *   2. one already broken (it takes 1.4× while it lasts);
 *   3. the most dangerous (`danger` on its spec: a large creature, a
 *      dangerous one — 0 for an ordinary one);
 *   4. the weakest (the lowest share of its health), to take one out of the
 *      order sooner;
 *   5. the first.
 */
export function autoTarget(state: PartyBattleState, breakPower: number): PartyEnemy | undefined {
  const standing = standingEnemies(state);
  const share = (e: PartyEnemy) => e.hp / e.maxHp;
  const byDangerThenWeakest = (a: PartyEnemy, b: PartyEnemy) => b.danger - a.danger || share(a) - share(b);
  const breakable = standing.filter((e) => !isBroken(e) && e.breakCurrent <= breakPower).sort(byDangerThenWeakest);
  if (breakable[0]) return breakable[0];
  const broken = standing.filter(isBroken).sort(byDangerThenWeakest);
  if (broken[0]) return broken[0];
  return [...standing].sort(byDangerThenWeakest)[0];
}

/** AUTO lays 《彼岸花》 on creatures it has not slowed when at least this many stand (作者 §19: 複数敵). */
export const AUTO_SPREAD_MIN = 2;

/**
 * WHEN AUTO USES A FINISHER (《彼岸花》 — 作者 2026-10-24 調整指示書 §16–20): not the moment it is ready.
 * Its worth is BREAK and COMBO, so it is kept for:
 *   1. a creature BROKEN — the cuts land at 1.4×, its slowing keeps it down longer, COMBO climbs;
 *   2. one about to break — its footing no more than the cuts wear together (they bring it down);
 *   3. at all of them: AUTO_SPREAD_MIN or more standing that are not slowed yet (none slowed again
 *      while it still is — and its wait, 4 of his turns, is longer than the slowing, 3 of theirs).
 * Otherwise it is kept back — and always while one swing could finish whatever is left. Returns who
 * to aim at (the one broken, the one to break, else as autoTarget), or nobody.
 */
export function finisherAim(state: PartyBattleState, me: PartyMember, skill: HeroSkillSpec): PartyEnemy | undefined {
  const standing = standingEnemies(state);
  if (standing.every((e) => e.hp <= me.attackMax)) return undefined;
  const share = (e: PartyEnemy) => e.hp / e.maxHp;
  const byDangerThenWeakest = (a: PartyEnemy, b: PartyEnemy) => b.danger - a.danger || share(a) - share(b);
  const broken = standing.filter(isBroken).sort(byDangerThenWeakest)[0];
  if (broken) return broken;
  const wear = (skill.cutBreakPower ?? 1) * (skill.cuts?.length ?? 1);
  const breakable = standing.filter((e) => e.breakCurrent <= wear).sort(byDangerThenWeakest)[0];
  if (breakable) return breakable;
  const fresh = standing.filter((e) => e.slowTurns <= 0);
  if (skill.area === 'ALL' && fresh.length >= AUTO_SPREAD_MIN) return [...fresh].sort(byDangerThenWeakest)[0];
  return undefined;
}

/**
 * AUTO, for the member whose turn it is:
 *   - a heal now if one of them is low (癒しの光);
 *   - 星癒の羽 on the lowest under 70% with none on them (never on one whole);
 *   - the hero: 《彼岸花》 first while every creature standing is BROKEN (none can
 *     strike back: no guard is needed); 月影の構え when it is ready (its wait over),
 *     not up, and he is at half or under — or at 70% or under facing a creature
 *     with a harder blow; else 《彼岸花》 when finisherAim finds it worth it; else
 *     《瞬断》 when ready; else a swing;
 *   - Grave: 重撃・豪断 whenever it is ready (its wait is what spaces it),
 *     aimed at the one it would break, else a broken one, else as autoTarget;
 *     else a swing;
 *   - Kaos: her strongest damage spell if better than a swing; else a swing.
 * With more than one creature standing, a blow names its target
 * (`autoTarget`); with one, it is aimed at that one and names none.
 */
export function partyAutoAction(state: PartyBattleState): PartyAction | null {
  const id = currentActor(state);
  const me = id && !isEnemyId(id) ? memberById(state, id) : undefined;
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
  const several = standingEnemies(state).length > 1;
  // A finisher (《彼岸花》) only when it is worth it (finisherAim); first of all while nothing can strike back.
  const finisher = (me.skills ?? []).find((s) => s.finisher && partySkillReady(me, s));
  const finisherFoe = finisher ? finisherAim(state, me, finisher) : undefined;
  const useFinisher = (): PartyAction => ({ kind: 'SKILL', skillId: finisher!.id, ...(several ? { target: finisherFoe!.id } : {}) });
  if (finisherFoe && standingEnemies(state).every(isBroken)) return useFinisher();
  const guard = techs.find((t) => t.kind === 'MOON_GUARD');
  const wary = standingEnemies(state).some((e) => !!e.moves.heavy);
  if (guard && me.guardTurns === 0 && me.hp <= me.maxHp * (wary ? AUTO_GUARD_WARY_AT : AUTO_GUARD_AT)) return { kind: 'TECH', techId: guard.id };
  const aim = (breakPower: number) => {
    const foe = autoTarget(state, breakPower);
    return several && foe ? { target: foe.id } : {};
  };
  const heavy = techs.find((t) => t.kind === 'HEAVY');
  if (heavy) return { kind: 'TECH', techId: heavy.id, ...aim(heavy.breakPower ?? 4) };
  const swing = (me.attackMin + me.attackMax) / 2;
  const spellFoe = autoTarget(state, SPELL_BREAK_POWER);
  const blast = spells
    .filter((s) => s.effect === 'DAMAGE')
    .map((s) => ({ s, worth: s.power * affinityMultiplier(spellFoe?.affinity ?? null, s.type, s.element) }))
    .sort((a, b) => b.worth - a.worth)[0];
  if (blast && blast.worth > swing) return { kind: 'MAGIC', magicId: blast.s.id, ...aim(SPELL_BREAK_POWER) };
  if (finisherFoe) return useFinisher();
  const skill = (me.skills ?? []).find((s) => !s.finisher && partySkillReady(me, s));
  if (skill) return { kind: 'SKILL', skillId: skill.id, ...aim(SKILL_BREAK_POWER) };
  return { kind: 'ATTACK', ...aim(me.breakPower ?? 1) };
}
