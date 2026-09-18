import { useState } from 'react';
import {
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
} from '@mugen/game/battle/battleLogic';
import { specOf } from '@mugen/game/battle/enemySpec';
import { MOSS_RABBIT } from '@mugen/content/enemies/species';
import { statsForLevels } from '@mugen/core/progression/levelStats';
import type { AppliedReward } from '@mugen/core/progression/battleReward';
import type { World } from '@mugen/core/world/world';

/**
 * THE FIGHT, DRIVEN BY THE SHARED CORE AND NOTHING ELSE.
 *
 * Every number on this screen comes from `@mugen/game/battle` —
 * `createBattle`, `playerAttack`, `playerDefend` — which is the same
 * code, in the same file, that the Artifact's battle runs on. There is
 * no second damage calculation, no second enemy definition and no
 * second idea of what a level is worth. What is different is only what
 * is drawn, which is the thing an app is allowed to differ about.
 *
 * It carries the party's condition in and hands what is left back out,
 * exactly as the Artifact does, so a wound taken here is a wound the
 * village still shows.
 */
export function BattleScreen({
  world,
  onWon,
  onLost,
}: {
  world: World;
  onWon: (final: { hp: number; mp: number }) => void;
  onLost: () => void;
}) {
  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(specOf(MOSS_RABBIT), undefined, {
      stats: statsForLevels(world.getLevel('hero'), world.getLevel('kaos')),
      condition: world.getBattleCondition(),
    }),
  );
  const over = battle.outcome !== 'ONGOING';

  const act = (next: BattleState) => {
    setBattle(next);
    if (next.outcome === 'VICTORY') onWon({ hp: next.playerHp, mp: next.playerMp });
    if (next.outcome === 'DEFEAT') onLost();
  };

  return (
    <div className="screen battle">
      <h1 className="place">{battle.enemyName}</h1>
      <p className="bar" data-testid="enemy-hp">
        敵 HP {battle.enemyHp} / {battle.enemyMaxHp}
      </p>
      <p className="bar" data-testid="player-hp">
        味方 HP {battle.playerHp} / {battle.playerMaxHp} ・ MP {battle.playerMp} /{' '}
        {battle.playerMaxMp}
      </p>
      <p className="log" data-testid="battle-log">
        {battle.log[battle.log.length - 1]}
      </p>
      <div className="actions">
        <button
          className="btn primary"
          data-testid="attack-button"
          disabled={over}
          onClick={() => act(playerAttack(battle))}
        >
          攻撃
        </button>
        <button
          className="btn"
          data-testid="defend-button"
          disabled={over}
          onClick={() => act(playerDefend(battle))}
        >
          防御
        </button>
      </div>
    </div>
  );
}

/**
 * WHAT THE FIGHT WAS WORTH.
 *
 * Handed the reward the WORLD applied rather than one worked out here,
 * so the screen can only ever show what actually landed — the same
 * rule the Artifact's result screen follows and for the same reason.
 */
export function ResultScreen({
  reward,
  onDone,
}: {
  reward: AppliedReward;
  onDone: () => void;
}) {
  return (
    <div className="screen result">
      <h1 className="place">BATTLE RESULT</h1>
      <p className="row" data-testid="result-exp">
        EXP +{reward.exp}
      </p>
      <p className="row" data-testid="result-lumi">
        LUMI +{reward.lumi}
      </p>
      <p className="row" data-testid="result-items">
        {reward.items.length === 0
          ? 'ITEM なし'
          : reward.items.map((i) => `${i.itemId} ×${i.quantity}`).join(' / ')}
      </p>
      {reward.levels.length > 0 && (
        <p className="row level" data-testid="result-levels">
          {reward.levels.map((l) => `${l.label} Lv.${l.from} → Lv.${l.to}`).join(' / ')}
        </p>
      )}
      <button className="btn primary" data-testid="result-done" onClick={onDone}>
        もどる
      </button>
    </div>
  );
}
