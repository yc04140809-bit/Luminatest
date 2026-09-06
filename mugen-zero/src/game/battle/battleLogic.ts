// Simple turn-based battle logic. Pure functions, no React / Phaser.
// v0.1 keeps battle intentionally minimal: attack / defend only.

import { affinityMultiplier, readAffinity, type EnemyAffinity } from './damageType';
import type { MagicDef } from '../../core/magic/magic';
import {
  hitPoise,
  phaseAt,
  phaseChanged,
  recoverPoise,
  type EnemyPhase,
  type EnemyPoiseSpec,
} from './enemyBehaviour';

export type BattleOutcome = 'ONGOING' | 'VICTORY' | 'DEFEAT';

/**
 * What the enemy just did, for the screen to play.
 *
 * The logic decides; the picture follows. Nothing here knows what a
 * leaf tackle looks like, and nothing in the screen decides whether one
 * happened.
 */
export type EnemyAction = 'NONE' | 'ATTACK' | 'SKILL';

/** One enemy's numbers and its one trick. Content supplies both. */
export interface EnemySkillSpec {
  name: string;
  /** How many of the player's blows it softens. */
  turns: number;
  /** What fraction of a blow still lands while it holds. */
  damageTaken: number;
  /** How likely it is to use it on a turn it could. */
  chance: number;
  /** Turns before it may be used again. */
  cooldown: number;
  /** A hard ceiling per battle, so it can never stall a fight. */
  maxUses: number;
  /** Shown when it goes up. */
  line: string;
}

/**
 * Everything outside the two fighters that changes what a blow is worth.
 *
 * One number per direction of harm, all of them multipliers, all of them
 * 1 when nobody has done anything. Kaos helping from the back of the
 * field is the only thing that sets them today; whatever helps or
 * hinders later sets the same four, and no damage code has to learn
 * about it.
 */
export interface BattleModifiers {
  /** What the player's blows are multiplied by. */
  playerAttack: number;
  /** What lands on the player, after their own guard. */
  playerDamageTaken: number;
  /** What the enemy's blows are multiplied by. */
  enemyAttack: number;
  /** What lands on the enemy — its defence, read from the other side. */
  enemyDamageTaken: number;
}

/** Nobody has done anything. */
export const NO_MODIFIERS: BattleModifiers = {
  playerAttack: 1,
  playerDamageTaken: 1,
  enemyAttack: 1,
  enemyDamageTaken: 1,
};

/**
 * A blow, after everything that touches it.
 *
 * Multiplied in a stated order and floored at one: a fight where an
 * attack lands for nothing is worse than a fight that is too easy, and
 * a stack of modifiers must never reach zero, go negative, or produce a
 * number that is not a number.
 */
function applyDamage(raw: number, multipliers: number[]): number {
  let value = raw;
  for (const m of multipliers) value *= Number.isFinite(m) && m > 0 ? m : 1;
  return Math.max(1, Math.ceil(value));
}

export interface EnemySpec {
  name: string;
  hp: number;
  attackMin: number;
  attackMax: number;
  /** What its ordinary attack is called. */
  attackName?: string;
  skill?: EnemySkillSpec;
  /** First line of the log, if it has one of its own. */
  appearLine?: string;
  /**
   * Its footing, if this one has any. A creature with none fights
   * exactly as everything did before poise existed.
   */
  poise?: EnemyPoiseSpec;
  /** How it changes as it is hurt, if it changes at all. */
  phases?: readonly EnemyPhase[];
  /**
   * What it is tough against and what it is soft against. Absent for
   * anything that simply takes what it is given.
   */
  affinity?: EnemyAffinity;
  /**
   * The fight in which she first reaches past what she was doing.
   *
   * Content, not code: WHICH fight, WHEN in it, and WHAT is said are
   * all here, so the beat can be moved, retimed or rewritten without
   * touching the battle. Absent for every other fight, which is most
   * of them.
   */
  awakening?: MagicAwakening;
}

/**
 * The moment Kaos stops standing at the back of the field.
 *
 * Two ways to reach it and the earlier one wins: after so many of the
 * player's turns, or once the thing they are fighting is hurt past some
 * share of its health. Two, because a player who is winning fast and a
 * player who is grinding should both get there — neither should finish
 * the fight without having been offered the thing the fight exists to
 * teach.
 */
/** What the log says about the awakening when a fight does not say it itself. */
export const AWAKENING_RECORD = '《魔法》が使えるようになった。';

export interface MagicAwakening {
  /** After this many of the player's turns. */
  afterTurns: number;
  /**
   * The single line left in the battle log once the scene has been
   * read. Content, like the lines themselves, so a fight can word it
   * its own way; omitted, it is the plain one below.
   */
  record?: string;
  /** Or once the enemy is at or below this share of its health. */
  atOrBelowHp: number;
  /**
   * What is said, in order. Placeholder text is expected and fine — it
   * is data, and replacing it is replacing this array.
   */
  lines: readonly { speaker: string | null; text: string }[];
}

export interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  enemyAttackMin: number;
  enemyAttackMax: number;
  enemyAttackName: string | null;
  enemySkill: EnemySkillSpec | null;
  /** Player blows still softened by the skill. */
  enemyGuardTurns: number;
  /** Turns before the skill may be used again. */
  enemySkillCooldown: number;
  enemySkillUses: number;
  /** What the enemy did on its last turn, for the screen to play. */
  lastEnemyAction: EnemyAction;
  /**
   * Its footing, and what happens when it runs out.
   *
   * The middle of a fight needs something to aim at that is not "keep
   * pressing attack until the bar empties". Null for a creature that
   * has none, and then nothing below it happens at all.
   */
  enemyPoiseSpec: EnemyPoiseSpec | null;
  enemyPoise: number;
  enemyMaxPoise: number;
  /** Turns it is off balance for. While above zero it does not act. */
  enemyStaggerTurns: number;
  /** Which of its phases it is in, by id. Null while it is still itself. */
  enemyPhaseId: string | null;
  /** Its phases, in the order they are entered. */
  enemyPhases: readonly EnemyPhase[] | null;
  /** What it is tough and soft against. Null for most creatures. */
  enemyAffinity: EnemyAffinity | null;
  /**
   * What Kaos has left to spend.
   *
   * There is no way to get it back inside a fight, and that is the
   * whole of the resource for now: a spell is one of a handful of
   * things she can do today, so casting one is a decision rather than a
   * button that is always right.
   */
  playerMp: number;
  playerMaxMp: number;
  /** How many turns the player has taken. The awakening counts them. */
  turnsTaken: number;
  /**
   * Whether she has reached past what she was doing, in THIS fight.
   *
   * A fight she starts already able to (because she did it in an
   * earlier one) begins with this true; the fight where it happens
   * begins false and turns true partway through.
   */
  magicUnlocked: boolean;
  /**
   * The lines of the moment it happened, once, for the screen to play.
   *
   * Emptied by the screen when it has shown them, so a re-render cannot
   * show them twice.
   */
  awakeningLines: readonly { speaker: string | null; text: string }[];
  /** The beat this fight is carrying, if it carries one. */
  awakening: MagicAwakening | null;
  /**
   * What the player's last action was worth against this creature —
   * whether it minded, shrugged, or neither. For the log line, and for
   * an AUTO brain that has to learn the same thing by trying.
   */
  lastHitRead: 'WEAK' | 'RESISTED' | 'PLAIN';
  /**
   * What is helping or hindering, for this battle only. Held here so it
   * lives and dies with the fight and cannot leak into the next one.
   */
  modifiers: BattleModifiers;
  /**
   * What the next blow to reach the player is cut by, once.
   *
   * Zero when there is nothing. Unlike the modifiers above it is spent
   * rather than held: one hit, and it is gone — which is what keeps a
   * thing that arrives for free from competing with 《身構える》, a
   * choice the player makes every turn at the cost of their turn.
   */
  wardCut: number;
  log: string[];
  outcome: BattleOutcome;
}

/** Random source, injectable for deterministic tests. Returns [0, 1). */
export type Rng = () => number;

const PLAYER_ATK_MIN = 8;
const PLAYER_ATK_MAX = 12;
/**
 * The hard ceiling on any one-blow ward, wherever it came from.
 *
 * The battle owns this, not the thing that grants it: content must not
 * be able to hand out a 90% ward by writing a bigger number, because
 * the two things that already soften a blow are a spent turn and a
 * favour from Kaos, and nothing free may quietly outclass them.
 */
const WARD_MAX_CUT = 0.35;

/**
 * What Kaos has to spend in one fight.
 *
 * Enough for eight casts of the one spell she has, in a fight that
 * lasts a little over twenty turns — so a player can learn what magic
 * is for by using it, and still cannot answer every turn with it. There
 * is nothing that gives it back mid-fight yet, and adding one is a
 * design decision rather than an oversight to fix.
 */
export const PLAYER_MAX_MP = 48;

/**
 * What bracing is worth, besides the blow it softens.
 *
 * 身構える was a losing move and the simulation said so out loud: a
 * player who braced every fifth turn won Gald one time in seven, because
 * halving one blow never pays for a turn not spent hurting him. A
 * defensive action that is always wrong is not a choice, it is a trap
 * with a button.
 *
 * So bracing is now the other half of having two people. He covers;
 * she uses the moment to gather. It is the only way her magic comes
 * back inside a fight, which means the fight has a rhythm — press,
 * cover, spend — instead of one right answer repeated.
 */
export const GUARD_MP_GAIN = 8;

/** The numbers a plain named enemy fights with — Gald's, historically. */
const DEFAULT_ENEMY: Omit<EnemySpec, 'name'> = { hp: 30, attackMin: 3, attackMax: 6 };

/**
 * Everything about the fight that comes from OUTSIDE the fight.
 *
 * One field so far. It is an options bag rather than a positional
 * argument because the next one will be too, and because
 * `createBattle(spec, mods, true)` is a line nobody can read.
 */
export interface BattleOptions {
  /**
   * Whether Kaos can already do this — decided by the world, not by
   * the battle. The fight that carries the awakening ignores it.
   */
  magicUnlocked?: boolean;
}

export function createBattle(
  enemy: string | EnemySpec,
  modifiers: BattleModifiers = NO_MODIFIERS,
  options: BattleOptions = {},
): BattleState {
  const spec: EnemySpec = typeof enemy === 'string' ? { name: enemy, ...DEFAULT_ENEMY } : enemy;
  return {
    // Raised from 40 with the tempo retune. Forty was two or three of a
    // bandit's blows, which is why every fight had to be over in two or
    // three of the player's — the health bar was what made a fight
    // short, not the enemy's. Everything that heals or protects is
    // written as a share of this, so the retune is one number.
    playerHp: 100,
    playerMaxHp: 100,
    enemyHp: spec.hp,
    enemyMaxHp: spec.hp,
    enemyName: spec.name,
    enemyAttackMin: spec.attackMin,
    enemyAttackMax: spec.attackMax,
    enemyAttackName: spec.attackName ?? null,
    enemySkill: spec.skill ?? null,
    enemyGuardTurns: 0,
    enemySkillCooldown: 0,
    enemySkillUses: 0,
    lastEnemyAction: 'NONE',
    enemyPoiseSpec: spec.poise ?? null,
    enemyPoise: spec.poise?.max ?? 0,
    enemyMaxPoise: spec.poise?.max ?? 0,
    enemyStaggerTurns: 0,
    enemyPhaseId: null,
    enemyPhases: spec.phases ?? null,
    enemyAffinity: spec.affinity ?? null,
    playerMp: PLAYER_MAX_MP,
    playerMaxMp: PLAYER_MAX_MP,
    turnsTaken: 0,
    // A fight that carries the awakening beat starts before it; every
    // other fight starts after whatever the world has already decided.
    magicUnlocked: spec.awakening ? false : (options.magicUnlocked ?? false),
    awakeningLines: [],
    awakening: spec.awakening ?? null,
    lastHitRead: 'PLAIN',
    modifiers: { ...modifiers },
    wardCut: 0,
    log: [spec.appearLine ?? `${spec.name}が現れた！`],
    outcome: 'ONGOING',
  };
}

function roll(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * The enemy's turn: hide, or come at you.
 *
 * The one rule beyond the dice is that a fight must keep moving. The
 * skill cannot be used while it is already up, cannot be used again for
 * a few turns, and cannot be used more than a set number of times in
 * one battle — so an animal that protects itself never turns into a
 * wall the player cannot get past.
 */
function enemyTurn(
  state: BattleState,
  defending: boolean,
  rng: Rng,
  forced: EnemyAction | null = null,
): BattleState {
  if (state.enemyHp <= 0) return state;

  // Off balance: its turn goes on getting its footing back. This is what
  // makes breaking a guard worth doing rather than a turn thrown away —
  // the reward is the creature's next move, not a bigger number.
  if (state.enemyStaggerTurns > 0) {
    const back = recoverPoise(state.enemyPoiseSpec, state.enemyPoise, state.enemyStaggerTurns);
    return {
      ...state,
      enemyPoise: back.poise,
      enemyStaggerTurns: back.staggerTurns,
      enemySkillCooldown: Math.max(0, state.enemySkillCooldown - 1),
      lastEnemyAction: 'NONE',
      log: back.recovered && state.enemyPoiseSpec
        ? [...state.log, state.enemyPoiseSpec.recoverLine]
        : state.log,
    };
  }

  const phase = phaseAt(state.enemyPhases, state.enemyHp, state.enemyMaxHp);
  const cooldown = Math.max(0, state.enemySkillCooldown - 1);
  const skill = state.enemySkill;
  const mayHide =
    skill !== null &&
    cooldown === 0 &&
    state.enemyGuardTurns === 0 &&
    state.enemySkillUses < skill.maxUses;
  const skillChance = phase?.skillChance ?? skill?.chance ?? 0;
  const hides =
    forced === 'SKILL' ? mayHide : forced === 'ATTACK' ? false : mayHide && rng() < skillChance;

  if (hides && skill) {
    return {
      ...state,
      enemyGuardTurns: skill.turns,
      enemySkillCooldown: skill.cooldown,
      enemySkillUses: state.enemySkillUses + 1,
      lastEnemyAction: 'SKILL',
      log: [...state.log, skill.line],
    };
  }

  // What reaches the player, in this order and no other: what it can
  // hit for, what Kaos took off it, what she put between them, whether
  // he braced, and last whatever a summoned memory left behind.
  // Everything is a multiplier, so 「身構える」 and 《ケイオスの守護》
  // stack rather than one cancelling the other — and the result can
  // still never be less than one.
  const warded = state.wardCut > 0;
  const struck = applyDamage(roll(state.enemyAttackMin, state.enemyAttackMax, rng), [
    state.modifiers.enemyAttack,
    state.modifiers.playerDamageTaken,
    // What being hurt has made of it. A creature that fights harder as
    // it is cornered is the difference between a health bar and an
    // animal that does not want to die.
    phase?.attack ?? 1,
    defending ? 0.5 : 1,
  ]);
  // The ward is taken off, not multiplied in — and it always takes at
  // least one point. A fifth off a blow of four is 3.2, which rounds
  // back up to four, and a protection that measurably does nothing is
  // exactly the problem this whole feature exists to fix. Subtracting
  // keeps it honest at the numbers a small animal actually hits for,
  // and the floor of one keeps a blow from ever landing for nothing.
  const soften = warded ? Math.max(1, Math.round(struck * state.wardCut)) : 0;
  const dmg = Math.max(1, struck - soften);
  const playerHp = Math.max(0, state.playerHp - dmg);
  const move = state.enemyAttackName ? `${state.enemyName}の${state.enemyAttackName}` : `${state.enemyName}の攻撃`;
  // Said before the blow, not after: the last line of the log is what
  // the screen shows, and what the player needs to read there is the
  // damage. Spent whether it saved much or little — it was one blow's
  // worth of green, and the blow has happened.
  const log = [
    ...state.log,
    ...(warded ? ['《森の加護》が、そっと解けた。'] : []),
    defending ? `${move}。防御して${dmg}のダメージ。` : `${move}！ ${dmg}のダメージ。`,
  ];
  const outcome: BattleOutcome = playerHp <= 0 ? 'DEFEAT' : state.outcome;
  return {
    ...state,
    playerHp,
    enemySkillCooldown: cooldown,
    lastEnemyAction: 'ATTACK',
    wardCut: 0,
    log,
    outcome,
  };
}

export function playerAttack(
  state: BattleState,
  rng: Rng = Math.random,
  forcedEnemyAction: EnemyAction | null = null,
): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  // Whatever the enemy put between itself and the blow, it is worn
  // through by taking one.
  const guarded = state.enemyGuardTurns > 0 && state.enemySkill !== null;
  const staggered = state.enemyStaggerTurns > 0;
  const wasIn = phaseAt(state.enemyPhases, state.enemyHp, state.enemyMaxHp);
  // What this creature thinks of a sword. Most think nothing.
  const affinity = affinityMultiplier(state.enemyAffinity, 'PHYSICAL');
  const dmg = applyDamage(roll(PLAYER_ATK_MIN, PLAYER_ATK_MAX, rng), [
    state.modifiers.playerAttack,
    state.modifiers.enemyDamageTaken,
    guarded ? state.enemySkill!.damageTaken : 1,
    // Off balance and open. This is the reward for having broken it.
    staggered ? (state.enemyPoiseSpec?.staggerDamageTaken ?? 1) : 1,
    // Some creatures get harder to hurt as they get serious.
    wasIn?.damageTaken ?? 1,
    affinity,
  ]);
  const enemyHp = Math.max(0, state.enemyHp - dmg);
  // Its footing, taken by the blow. A blow that lands on a guard takes
  // more of it: breaking the guard is the point of hitting it.
  const footing = hitPoise(state.enemyPoiseSpec, state.enemyPoise, state.enemyStaggerTurns, guarded);
  let next: BattleState = {
    ...state,
    enemyHp,
    turnsTaken: state.turnsTaken + 1,
    lastHitRead: readAffinity(affinity),
    enemyGuardTurns: footing.broke ? 0 : Math.max(0, state.enemyGuardTurns - 1),
    enemyPoise: footing.poise,
    enemyStaggerTurns: footing.staggerTurns,
    log: [
      ...state.log,
      guarded
        ? `攻撃！ ${state.enemySkill!.name}に阻まれ、${dmg}のダメージ。`
        : `攻撃！ ${state.enemyName}に${dmg}のダメージ。`,
      // Losing its footing is a moment, so it gets its own line rather
      // than being buried in the damage number.
      ...(footing.broke && state.enemyPoiseSpec ? [state.enemyPoiseSpec.breakLine] : []),
    ],
  };
  if (enemyHp <= 0) {
    // 敵HP0では倒さない。人生選択（LIFE CHOICE）へ委ねる。
    return { ...next, outcome: 'VICTORY', log: [...next.log, `${state.enemyName}は膝をついた……。`] };
  }
  // Crossed into something else on the way down. Said once, before its
  // turn, because what it does next is what the line is about.
  const nowIn = phaseAt(next.enemyPhases, next.enemyHp, next.enemyMaxHp);
  if (phaseChanged(wasIn, nowIn) && nowIn) {
    next = { ...next, enemyPhaseId: nowIn.id, log: [...next.log, nowIn.line] };
  }
  next = awaken(next);
  next = enemyTurn(next, false, rng, forcedEnemyAction);
  return next;
}

/**
 * The moment she reaches past what she was doing.
 *
 * Checked after the player's action and before the creature's, because
 * what she says belongs to the pause between the two. It happens once:
 * the flag is what stops it, not a count, so healing the enemy back
 * over the threshold cannot make her do it again.
 */
function awaken(state: BattleState): BattleState {
  const beat = state.awakening;
  if (!beat || state.magicUnlocked || state.outcome !== 'ONGOING') return state;
  const hurtEnough = state.enemyMaxHp > 0 && state.enemyHp / state.enemyMaxHp <= beat.atOrBelowHp;
  const longEnough = state.turnsTaken >= beat.afterTurns;
  if (!hurtEnough && !longEnough) return state;
  return {
    ...state,
    magicUnlocked: true,
    // Handed to the screen to play as a scene, and NOT written into the
    // log yet. The log sits behind the scene and is readable while it
    // plays, so copying the lines in here printed the last one — the one
    // that says what just happened — before the player had tapped
    // through to it. The log gets its one-line record when the scene is
    // over, in clearAwakeningLines.
    awakeningLines: beat.lines,
  };
}

/**
 * Kaos casts, and that is the player's action for this turn.
 *
 * The one rule this whole feature is built around: it does NOT come on
 * top of a swing. The player has one action and this is it — which is
 * what makes "who should do this one" a question rather than a formality.
 */
export function castMagic(
  state: BattleState,
  magic: MagicDef,
  rng: Rng = Math.random,
  forcedEnemyAction: EnemyAction | null = null,
): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  if (!state.magicUnlocked) return state;
  if (state.playerMp < magic.mpCost) return state;

  const guarded = state.enemyGuardTurns > 0 && state.enemySkill !== null;
  const staggered = state.enemyStaggerTurns > 0;
  const wasIn = phaseAt(state.enemyPhases, state.enemyHp, state.enemyMaxHp);
  const affinity = affinityMultiplier(state.enemyAffinity, magic.type, magic.element);
  const dmg = applyDamage(magic.power, [
    state.modifiers.enemyDamageTaken,
    // A raised guard stops a blow. Whether it stops a spell is the
    // spell's business, and hers it does not — which is the reason to
    // ever cast one at something that has no opinion about magic.
    guarded && magic.blockedByGuard ? state.enemySkill!.damageTaken : 1,
    staggered ? (state.enemyPoiseSpec?.staggerDamageTaken ?? 1) : 1,
    wasIn?.damageTaken ?? 1,
    affinity,
  ]);
  const enemyHp = Math.max(0, state.enemyHp - dmg);
  // Light does not knock anybody over. A spell that costs no footing
  // takes none, and breaking a guard stays the sword's job.
  const footing =
    magic.poiseCost > 0
      ? hitPoise(state.enemyPoiseSpec, state.enemyPoise, state.enemyStaggerTurns, guarded)
      : { poise: state.enemyPoise, staggerTurns: state.enemyStaggerTurns, broke: false };

  const read = readAffinity(affinity);
  let next: BattleState = {
    ...state,
    enemyHp,
    playerMp: state.playerMp - magic.mpCost,
    turnsTaken: state.turnsTaken + 1,
    lastHitRead: read,
    enemyGuardTurns: Math.max(0, state.enemyGuardTurns - 1),
    enemyPoise: footing.poise,
    enemyStaggerTurns: footing.staggerTurns,
    log: [
      ...state.log,
      magic.line,
      `《${magic.name}》！ ${state.enemyName}に${dmg}のダメージ。` +
        (read === 'WEAK' ? ' 効果は絶大だ！' : read === 'RESISTED' ? ' 手ごたえが薄い。' : ''),
      ...(footing.broke && state.enemyPoiseSpec ? [state.enemyPoiseSpec.breakLine] : []),
    ],
  };
  if (enemyHp <= 0) {
    return { ...next, outcome: 'VICTORY', log: [...next.log, `${state.enemyName}は膝をついた……。`] };
  }
  const nowIn = phaseAt(next.enemyPhases, next.enemyHp, next.enemyMaxHp);
  if (phaseChanged(wasIn, nowIn) && nowIn) {
    next = { ...next, enemyPhaseId: nowIn.id, log: [...next.log, nowIn.line] };
  }
  next = awaken(next);
  return enemyTurn(next, false, rng, forcedEnemyAction);
}

/** The screen has played the awakening scene; it must not play twice. */
export function clearAwakeningLines(state: BattleState): BattleState {
  if (state.awakeningLines.length === 0) return state;
  // One line, now that the scene has been read, so a player who taps
  // through it quickly can still find out what changed.
  return {
    ...state,
    awakeningLines: [],
    log: [...state.log, state.awakening?.record ?? AWAKENING_RECORD],
  };
}

export function playerDefend(
  state: BattleState,
  rng: Rng = Math.random,
  forcedEnemyAction: EnemyAction | null = null,
): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const gathered = Math.min(state.playerMaxMp, state.playerMp + GUARD_MP_GAIN);
  const gained = gathered - state.playerMp;
  const next = awaken({
    ...state,
    playerMp: gathered,
    turnsTaken: state.turnsTaken + 1,
    log: [
      ...state.log,
      '身構えた。',
      // Only said when it did something. A line that appears every
      // turn saying "nothing happened" is noise.
      ...(gained > 0 ? [`ケイオスが息を整えた。MPが${gained}回復。`] : []),
    ],
  });
  return enemyTurn(next, true, rng, forcedEnemyAction);
}

/**
 * Something put health back into the player, without taking a turn.
 *
 * Kept separate from the two commands on purpose: a summoned ARCANA
 * arrives, does one thing and goes, and it is not the player spending
 * their turn — the creature's move is not skipped for it, and a fight
 * that is already over is not reopened by it.
 *
 * Healing at full health is not an error and not a refusal: it is a
 * thing that happened and did nothing, and the log says so, because a
 * player who spent their one summon on it deserves to be told rather
 * than left wondering whether the button worked.
 */
export function healPlayer(state: BattleState, amount: number, line?: string): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const asked = Number.isFinite(amount) ? Math.max(0, Math.floor(amount)) : 0;
  const healed = Math.min(asked, state.playerMaxHp - state.playerHp);
  const log = [...state.log];
  if (line) log.push(line);
  log.push(healed > 0 ? `HPが${healed}回復した。` : 'HPはもう満ちている。');
  return { ...state, playerHp: state.playerHp + healed, log };
}

/**
 * Something left a little green behind, to take the edge off one blow.
 *
 * Capped hard, and spent on the first hit that lands. It is not a
 * shield and must never read as one: 《身構える》 costs the player
 * their turn and halves a blow, and 《ケイオスの守護》 is her own
 * favour — a thing that arrives on its own and asks nothing must be
 * worth clearly less than either.
 */
export function grantWard(state: BattleState, cut: number, line?: string): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const asked = Number.isFinite(cut) ? cut : 0;
  const wardCut = Math.min(WARD_MAX_CUT, Math.max(0, asked));
  const log = [...state.log];
  if (line) log.push(line);
  // Never silent, even when it changes nothing worth a number: the
  // player watched something arrive, and being told nothing is what
  // made the old version of this feel like a bug.
  log.push(wardCut > 0 ? '《森の加護》を得た。' : 'なにも起こらなかった。');
  return { ...state, wardCut: Math.max(state.wardCut, wardCut), log };
}

/**
 * One thing with two faces: health where there is room for it, and a
 * little cover where there is not.
 *
 * This is the whole answer to "a summon at the start of a fight heals
 * a player who is not hurt, and so does nothing". It is not a second
 * ability and not a consolation prize — it is the same green, doing
 * the only thing left for it to do. Which face the player gets is
 * decided here rather than in the screen, so it is one rule with one
 * test rather than a branch drawn twice.
 */
export function mendPlayer(
  state: BattleState,
  effect: { heal: number; ward: number },
  line?: string,
): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const hurt = state.playerHp < state.playerMaxHp;
  return hurt
    ? healPlayer(state, effect.heal, line)
    : grantWard(state, effect.ward, line);
}

/**
 * Something enormous hits every enemy at once.
 *
 * "Every" is the point of this function existing. A battle today holds
 * exactly one creature, so the loop below is a loop over one — but the
 * notion of hitting all of them lives here, in one place, rather than
 * being spelled `state.enemyHp -= n` at the call site. When the state
 * grows a list of enemies, this is the only body that changes and
 * every caller keeps working.
 *
 * The knock-down rule is untouched: an enemy brought to zero by this
 * is VICTORY, exactly as it is when the player does it, which means
 * it goes down and the four answers are asked in the ordinary way.
 * Nothing here decides anybody's fate.
 */
export function strikeAllEnemies(
  state: BattleState,
  amount: number,
  line?: string,
): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const asked = Number.isFinite(amount) ? Math.max(1, Math.floor(amount)) : 1;
  const log = [...state.log];
  if (line) log.push(line);

  let next: BattleState = { ...state, log };
  for (const target of everyEnemy(next)) {
    const hp = Math.max(0, target.hp - asked);
    const dealt = target.hp - hp;
    next = setEnemyHp(next, hp);
    next.log.push(`${target.name}に${dealt}のダメージ。`);
    if (hp <= 0) {
      // 敵HP0では倒さない。人生選択（MUGEN CHOICE）へ委ねる。
      next = { ...next, outcome: 'VICTORY' };
      next.log.push(`${target.name}は膝をついた……。`);
    }
  }
  return next;
}

/** Everyone on the other side. One of them, for now. */
function everyEnemy(state: BattleState): { name: string; hp: number }[] {
  return [{ name: state.enemyName, hp: state.enemyHp }];
}

function setEnemyHp(state: BattleState, hp: number): BattleState {
  return { ...state, enemyHp: hp };
}
