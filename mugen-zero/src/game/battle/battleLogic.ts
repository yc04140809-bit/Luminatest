// Simple turn-based battle logic. Pure functions, no React / Phaser.
// v0.1 keeps battle intentionally minimal: attack / defend only.

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
   * What is helping or hindering, for this battle only. Held here so it
   * lives and dies with the fight and cannot leak into the next one.
   */
  modifiers: BattleModifiers;
  log: string[];
  outcome: BattleOutcome;
}

/** Random source, injectable for deterministic tests. Returns [0, 1). */
export type Rng = () => number;

const PLAYER_ATK_MIN = 8;
const PLAYER_ATK_MAX = 12;

/** The numbers a plain named enemy fights with — Gald's, historically. */
const DEFAULT_ENEMY: Omit<EnemySpec, 'name'> = { hp: 30, attackMin: 3, attackMax: 6 };

export function createBattle(
  enemy: string | EnemySpec,
  modifiers: BattleModifiers = NO_MODIFIERS,
): BattleState {
  const spec: EnemySpec = typeof enemy === 'string' ? { name: enemy, ...DEFAULT_ENEMY } : enemy;
  return {
    playerHp: 40,
    playerMaxHp: 40,
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
    modifiers: { ...modifiers },
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
  const cooldown = Math.max(0, state.enemySkillCooldown - 1);
  const skill = state.enemySkill;
  const mayHide =
    skill !== null &&
    cooldown === 0 &&
    state.enemyGuardTurns === 0 &&
    state.enemySkillUses < skill.maxUses;
  const hides =
    forced === 'SKILL' ? mayHide : forced === 'ATTACK' ? false : mayHide && rng() < skill!.chance;

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
  // hit for, what Kaos took off it, what she put between them, and
  // finally whether he braced. Everything is a multiplier, so 「身構える」
  // and 《ケイオスの守護》 stack rather than one cancelling the other —
  // and the result can still never be less than one.
  const dmg = applyDamage(roll(state.enemyAttackMin, state.enemyAttackMax, rng), [
    state.modifiers.enemyAttack,
    state.modifiers.playerDamageTaken,
    defending ? 0.5 : 1,
  ]);
  const playerHp = Math.max(0, state.playerHp - dmg);
  const move = state.enemyAttackName ? `${state.enemyName}の${state.enemyAttackName}` : `${state.enemyName}の攻撃`;
  const log = [
    ...state.log,
    defending ? `${move}。防御して${dmg}のダメージ。` : `${move}！ ${dmg}のダメージ。`,
  ];
  const outcome: BattleOutcome = playerHp <= 0 ? 'DEFEAT' : state.outcome;
  return {
    ...state,
    playerHp,
    enemySkillCooldown: cooldown,
    lastEnemyAction: 'ATTACK',
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
  const dmg = applyDamage(roll(PLAYER_ATK_MIN, PLAYER_ATK_MAX, rng), [
    state.modifiers.playerAttack,
    state.modifiers.enemyDamageTaken,
    guarded ? state.enemySkill!.damageTaken : 1,
  ]);
  const enemyHp = Math.max(0, state.enemyHp - dmg);
  let next: BattleState = {
    ...state,
    enemyHp,
    enemyGuardTurns: Math.max(0, state.enemyGuardTurns - 1),
    log: [
      ...state.log,
      guarded
        ? `攻撃！ ${state.enemySkill!.name}に阻まれ、${dmg}のダメージ。`
        : `攻撃！ ${state.enemyName}に${dmg}のダメージ。`,
    ],
  };
  if (enemyHp <= 0) {
    // 敵HP0では倒さない。人生選択（LIFE CHOICE）へ委ねる。
    return { ...next, outcome: 'VICTORY', log: [...next.log, `${state.enemyName}は膝をついた……。`] };
  }
  next = enemyTurn(next, false, rng, forcedEnemyAction);
  return next;
}

export function playerDefend(
  state: BattleState,
  rng: Rng = Math.random,
  forcedEnemyAction: EnemyAction | null = null,
): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const next = { ...state, log: [...state.log, '身構えた。'] };
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
