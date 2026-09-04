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
  // hit for, what Kaos took off it, what she put between them, whether
  // he braced, and last whatever a summoned memory left behind.
  // Everything is a multiplier, so 「身構える」 and 《ケイオスの守護》
  // stack rather than one cancelling the other — and the result can
  // still never be less than one.
  const warded = state.wardCut > 0;
  const struck = applyDamage(roll(state.enemyAttackMin, state.enemyAttackMax, rng), [
    state.modifiers.enemyAttack,
    state.modifiers.playerDamageTaken,
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
