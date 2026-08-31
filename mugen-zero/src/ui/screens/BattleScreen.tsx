import { useEffect, useState } from 'react';
import {
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
} from '../../game/battle/battleLogic';
import { GALD } from '../../content/characters/gald';
import { GALD_DEFEATED_LINES } from '../../content/dialogue/galdEncounter';
import { galdPortrait } from '../../assets/manifest';
import { ScreenBackdrop } from '../common/ScreenBackdrop';
import { locationBackground, type LocationId } from '../../content/locations/locationVisuals';

interface Props {
  /**
   * The place the fight broke out in — where the backdrop comes from.
   * BattleScreen knows nothing about forests, only about locations, so a
   * fight in a cave or on a mountain needs no change here.
   */
  battleLocationId: LocationId;
  onVictory: () => void;
  onDefeat: () => void;
}

/** Which brief reaction to play after the last command. */
type Reaction = 'NONE' | 'HIT' | 'GUARD';

function HpBar({
  label,
  hp,
  max,
  enemy,
  testId,
}: {
  label: string;
  hp: number;
  max: number;
  enemy?: boolean;
  testId: string;
}) {
  return (
    <div className="hp-row" data-testid={testId}>
      <div className="hp-label">
        <span className={enemy ? 'hp-name enemy' : 'hp-name'}>{label}</span>
        <span>
          {hp} / {max}
        </span>
      </div>
      <div
        className="hp-bar"
        role="progressbar"
        aria-label={`${label}の体力`}
        aria-valuenow={hp}
        aria-valuemin={0}
        aria-valuemax={max}
      >
        <div
          className={enemy ? 'hp-fill enemy' : 'hp-fill'}
          style={{ width: `${(hp / max) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function BattleScreen({ battleLocationId, onVictory, onDefeat }: Props) {
  // The bandit is named from the first line of the encounter, so the bar
  // above belongs to a person the player has already met.
  const [battle, setBattle] = useState<BattleState>(() => createBattle(`盗賊 ${GALD.name}`));
  const [reaction, setReaction] = useState<Reaction>('NONE');

  useEffect(() => {
    if (reaction === 'NONE') return;
    const t = setTimeout(() => setReaction('NONE'), 260);
    return () => clearTimeout(t);
  }, [reaction]);

  useEffect(() => {
    if (battle.outcome === 'VICTORY') {
      // No EXP screen. He is beaten, not dead — his life is the next
      // screen's question.
      const t = setTimeout(onVictory, 1500);
      return () => clearTimeout(t);
    }
    if (battle.outcome === 'DEFEAT') {
      const t = setTimeout(onDefeat, 1200);
      return () => clearTimeout(t);
    }
  }, [battle.outcome, onVictory, onDefeat]);

  const ongoing = battle.outcome === 'ONGOING';
  const beaten = battle.enemyHp <= 0;
  const lastLogs = battle.log.slice(-2);
  const portrait = galdPortrait(beaten ? 'defeated' : 'ready');
  const backdrop = locationBackground(battleLocationId);

  const attack = () => {
    setBattle((b) => playerAttack(b));
    setReaction('HIT');
  };
  const defend = () => {
    setBattle((b) => playerDefend(b));
    setReaction('GUARD');
  };

  return (
    <div
      className={backdrop ? 'screen battle-screen has-backdrop' : 'screen battle-screen'}
      data-testid="battle-screen"
    >
      <ScreenBackdrop src={backdrop} variant="battle" testId="battle-backdrop" />
      <div className="battle-enemy">
        <HpBar
          label={battle.enemyName}
          hp={battle.enemyHp}
          max={battle.enemyMaxHp}
          enemy
          testId="enemy-hp"
        />
        <div className="battle-portrait-wrap">
          {portrait ? (
            <img
              className={`battle-portrait${reaction === 'HIT' ? ' hit' : ''}${
                beaten ? ' beaten' : ''
              }`}
              data-testid={beaten ? 'gald-portrait-defeated' : 'gald-portrait-ready'}
              src={portrait}
              alt={beaten ? '膝をついた盗賊' : '短剣を構えた盗賊'}
            />
          ) : (
            <div className="enemy-figure">🗡</div>
          )}
          {reaction === 'GUARD' && <div className="battle-guard-mark" aria-hidden="true" />}
        </div>
        <HpBar
          label="あなた"
          hp={battle.playerHp}
          max={battle.playerMaxHp}
          testId="player-hp"
        />
      </div>
      {beaten ? (
        <div className="battle-log" data-testid="gald-defeated-line" role="status" aria-live="polite">
          <div className="dialogue-speaker">{GALD_DEFEATED_LINES[0].speaker}</div>
          <div className="dialogue-text">{GALD_DEFEATED_LINES[0].text}</div>
        </div>
      ) : (
        <div className="battle-log" data-testid="battle-log" role="status" aria-live="polite">
          {lastLogs.map((line, i) => (
            <div key={battle.log.length - lastLogs.length + i}>{line}</div>
          ))}
        </div>
      )}
      <div className="battle-commands">
        <button
          className="btn primary"
          data-testid="attack-button"
          disabled={!ongoing}
          onClick={attack}
        >
          攻撃
        </button>
        <button className="btn" data-testid="defend-button" disabled={!ongoing} onClick={defend}>
          防御
        </button>
      </div>
    </div>
  );
}
