import type { BattleState } from '@mugen/game/battle/battleLogic';
import { battleEnemyArt } from '../battleArt';
import type { CutInSpec } from './CutIn';

/**
 * A BOSS'S CUT-IN — for its one great move only (EnemyMoveSet.signature),
 * never its ordinary blows or its other moves, and so at most once a fight.
 *
 * Which bosses have one, and the faint word behind it, is this table; the
 * move's name is the battle's own (the spec's signature). A boss not listed
 * here plays its great move without a cut-in. The figure is the boss's own
 * battle drawing (battleArt), so the day its drawing changes, so does this.
 */
const BOSS_CUT_INS: Record<string, { word: string }> = {
  sekiryuga: { word: 'SEKIRYUGA' },
};

/** The cut-in for this turn's answer, if the creature just made its great move. */
export function bossCutInFor(artId: string, next: BattleState): CutInSpec | null {
  if (next.lastEnemyMove !== 'SIGNATURE' || next.outcome === 'VICTORY') return null;
  const signature = next.enemyMoves?.signature;
  const boss = BOSS_CUT_INS[artId];
  const art = battleEnemyArt(artId, 'front').asset?.src;
  if (!signature || !boss || !art) return null;
  return {
    theme: 'boss',
    tier: 'FINISHER',
    art,
    word: boss.word,
    kicker: 'BOSS SKILL',
    name: `《${signature.name}》`,
    sub: next.enemyName,
  };
}
