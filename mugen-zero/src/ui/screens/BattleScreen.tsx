import { useEffect, useState } from 'react';
import {
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
} from '../../game/battle/battleLogic';
import { GALD } from '../../content/characters/gald';

interface Props {
  onVictory: () => void;
  onDefeat: () => void;
}

function HpBar({ label, hp, max, enemy }: { label: string; hp: number; max: number; enemy?: boolean }) {
  return (
    <div className="hp-row">
      <div className="hp-label">
        <span>{label}</span>
        <span>
          {hp} / {max}
        </span>
      </div>
      <div className="hp-bar">
        <div
          className={enemy ? 'hp-fill enemy' : 'hp-fill'}
          style={{ width: `${(hp / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function BattleScreen({ onVictory, onDefeat }: Props) {
  const [battle, setBattle] = useState<BattleState>(() => createBattle(GALD.unknownName));

  useEffect(() => {
    if (battle.outcome === 'VICTORY') {
      // 経験値・リザルト画面は出さない。暗転して人生選択へ。
      const t = setTimeout(onVictory, 900);
      return () => clearTimeout(t);
    }
    if (battle.outcome === 'DEFEAT') {
      const t = setTimeout(onDefeat, 1200);
      return () => clearTimeout(t);
    }
  }, [battle.outcome, onVictory, onDefeat]);

  const ongoing = battle.outcome === 'ONGOING';
  const lastLogs = battle.log.slice(-2);

  return (
    <div className="screen battle-screen" data-testid="battle-screen">
      <div className="battle-enemy">
        <div className="enemy-figure">🗡</div>
        <HpBar label={battle.enemyName} hp={battle.enemyHp} max={battle.enemyMaxHp} enemy />
        <HpBar label="あなた" hp={battle.playerHp} max={battle.playerMaxHp} />
      </div>
      <div className="battle-log" data-testid="battle-log">
        {lastLogs.map((line, i) => (
          <div key={battle.log.length - lastLogs.length + i}>{line}</div>
        ))}
      </div>
      <div className="battle-commands">
        <button
          className="btn primary"
          data-testid="attack-button"
          disabled={!ongoing}
          onClick={() => setBattle((b) => playerAttack(b))}
        >
          攻撃
        </button>
        <button
          className="btn"
          data-testid="defend-button"
          disabled={!ongoing}
          onClick={() => setBattle((b) => playerDefend(b))}
        >
          防御
        </button>
      </div>
    </div>
  );
}
