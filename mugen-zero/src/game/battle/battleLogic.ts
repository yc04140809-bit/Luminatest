// Simple turn-based battle logic. Pure functions, no React / Phaser.
// v0.1 keeps battle intentionally minimal: attack / defend only.

export type BattleOutcome = 'ONGOING' | 'VICTORY' | 'DEFEAT';

export interface BattleState {
  playerHp: number;
  playerMaxHp: number;
  enemyHp: number;
  enemyMaxHp: number;
  enemyName: string;
  log: string[];
  outcome: BattleOutcome;
}

/** Random source, injectable for deterministic tests. Returns [0, 1). */
export type Rng = () => number;

const PLAYER_ATK_MIN = 8;
const PLAYER_ATK_MAX = 12;
const ENEMY_ATK_MIN = 3;
const ENEMY_ATK_MAX = 6;

export function createBattle(enemyName: string): BattleState {
  return {
    playerHp: 40,
    playerMaxHp: 40,
    enemyHp: 30,
    enemyMaxHp: 30,
    enemyName,
    log: [`${enemyName}が現れた！`],
    outcome: 'ONGOING',
  };
}

function roll(min: number, max: number, rng: Rng): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function enemyTurn(state: BattleState, defending: boolean, rng: Rng): BattleState {
  if (state.enemyHp <= 0) return state;
  let dmg = roll(ENEMY_ATK_MIN, ENEMY_ATK_MAX, rng);
  if (defending) dmg = Math.ceil(dmg / 2);
  const playerHp = Math.max(0, state.playerHp - dmg);
  const log = [
    ...state.log,
    defending
      ? `${state.enemyName}の攻撃。防御して${dmg}のダメージ。`
      : `${state.enemyName}の攻撃！ ${dmg}のダメージ。`,
  ];
  const outcome: BattleOutcome = playerHp <= 0 ? 'DEFEAT' : state.outcome;
  return { ...state, playerHp, log, outcome };
}

export function playerAttack(state: BattleState, rng: Rng = Math.random): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const dmg = roll(PLAYER_ATK_MIN, PLAYER_ATK_MAX, rng);
  const enemyHp = Math.max(0, state.enemyHp - dmg);
  let next: BattleState = {
    ...state,
    enemyHp,
    log: [...state.log, `攻撃！ ${state.enemyName}に${dmg}のダメージ。`],
  };
  if (enemyHp <= 0) {
    // 敵HP0では倒さない。人生選択（LIFE CHOICE）へ委ねる。
    return { ...next, outcome: 'VICTORY', log: [...next.log, `${state.enemyName}は膝をついた……。`] };
  }
  next = enemyTurn(next, false, rng);
  return next;
}

export function playerDefend(state: BattleState, rng: Rng = Math.random): BattleState {
  if (state.outcome !== 'ONGOING') return state;
  const next = { ...state, log: [...state.log, '身構えた。'] };
  return enemyTurn(next, true, rng);
}
