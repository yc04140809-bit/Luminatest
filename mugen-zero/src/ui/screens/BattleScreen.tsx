import { useEffect, useRef, useState } from 'react';
import {
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
  type EnemyAction,
  type EnemySpec,
} from '../../game/battle/battleLogic';
import { GALD } from '../../content/characters/gald';
import { GALD_DEFEATED_LINES } from '../../content/dialogue/galdEncounter';
import { galdPortrait } from '../../assets/manifest';
import { ScreenBackdrop } from '../common/ScreenBackdrop';
import { locationBackground, type LocationId } from '../../content/locations/locationVisuals';
import type { EnemySpeciesDef } from '../../content/enemies/species';

interface Props {
  /**
   * The place the fight broke out in — where the backdrop comes from.
   * BattleScreen knows nothing about forests, only about locations, so a
   * fight in a cave or on a mountain needs no change here.
   */
  battleLocationId: LocationId;
  /**
   * Who the fight is with. Left out, it is Gald on the forest path —
   * the story's one fight, with his art and his line when he goes down.
   * Anything else that can be met while exploring passes itself here,
   * and this screen learns nothing new about who it is.
   */
  enemy?: EnemySpeciesDef;
  onVictory: () => void;
  onDefeat: () => void;
  /** Development only: make the enemy do one thing every turn. */
  forcedEnemyAction?: EnemyAction | null;
}

/** A species, in the units the battle speaks. */
function specOf(species: EnemySpeciesDef): EnemySpec {
  return {
    name: species.name,
    hp: species.hp,
    attackMin: species.attackMin,
    attackMax: species.attackMax,
    attackName: species.attackName,
    skill: species.skill,
    appearLine: species.appearLine,
  };
}

/**
 * Which brief reaction is on screen.
 *
 * Two of them belong to the player's command (a blow landing, a guard
 * going up) and two to the creature's answer — its one attack, and its
 * one way of protecting itself. They play in that order, because that
 * is the order they happen in.
 */
type Reaction = 'NONE' | 'HIT' | 'GUARD' | 'TACKLE' | 'HIDE';

/** How long each beat is held. Short: this is a small animal, not a boss. */
const BEAT_MS: Record<Exclude<Reaction, 'NONE'>, number> = {
  HIT: 300,
  GUARD: 300,
  TACKLE: 460,
  HIDE: 620,
};

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

export function BattleScreen({
  battleLocationId,
  enemy,
  onVictory,
  onDefeat,
  forcedEnemyAction = null,
}: Props) {
  // The bandit is named from the first line of the encounter, so the bar
  // above belongs to a person the player has already met.
  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(enemy ? specOf(enemy) : `盗賊 ${GALD.name}`),
  );
  const [reaction, setReaction] = useState<Reaction>('NONE');
  const beats = useRef<number[]>([]);

  useEffect(() => () => beats.current.forEach(clearTimeout), []);

  /** Plays a short sequence of reactions, then clears the screen. */
  const play = (sequence: Exclude<Reaction, 'NONE'>[]) => {
    beats.current.forEach(clearTimeout);
    beats.current = [];
    let at = 0;
    for (const beat of sequence) {
      const delay = at;
      beats.current.push(window.setTimeout(() => setReaction(beat), delay));
      at += BEAT_MS[beat];
    }
    beats.current.push(window.setTimeout(() => setReaction('NONE'), at));
  };

  /** What the creature did in reply, if it is still standing. */
  const answer = (next: BattleState): Exclude<Reaction, 'NONE'>[] =>
    next.lastEnemyAction === 'SKILL' ? ['HIDE'] : next.lastEnemyAction === 'ATTACK' ? ['TACKLE'] : [];

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
  // Gald has standing art at both moments; a species has one picture.
  const portrait = enemy ? enemy.portrait : galdPortrait(beaten ? 'defeated' : 'ready');
  const backdrop = locationBackground(battleLocationId);

  const attack = () => {
    const next = playerAttack(battle, undefined, forcedEnemyAction);
    setBattle(next);
    play(['HIT', ...answer(next)]);
  };
  const defend = () => {
    const next = playerDefend(battle, undefined, forcedEnemyAction);
    setBattle(next);
    play(['GUARD', ...answer(next)]);
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
              className={[
                'battle-portrait',
                reaction === 'HIT' ? 'hit' : '',
                reaction === 'TACKLE' ? 'tackle' : '',
                reaction === 'HIDE' ? 'hide' : '',
                beaten ? 'beaten' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              data-testid={
                enemy
                  ? `enemy-portrait-${enemy.speciesId}`
                  : beaten
                    ? 'gald-portrait-defeated'
                    : 'gald-portrait-ready'
              }
              // The art is used exactly as delivered. This only says how
              // big to draw it, because the creature sits inside a lot of
              // transparent margin in its own file.
              style={
                enemy
                  ? ({
                      transform: `scale(${enemy.portraitScale})`,
                      '--enemy-scale': enemy.portraitScale,
                    } as React.CSSProperties)
                  : undefined
              }
              src={portrait}
              alt={enemy ? enemy.name : beaten ? '膝をついた盗賊' : '短剣を構えた盗賊'}
            />
          ) : (
            <div className="enemy-figure">🗡</div>
          )}
          {reaction === 'GUARD' && <div className="battle-guard-mark" aria-hidden="true" />}
          {/* Its own attack: a few leaves come off as it hits. */}
          {reaction === 'TACKLE' && (
            <div className="battle-leaves" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} className={`leaf leaf-${i}`} />
              ))}
            </div>
          )}
          {/* And its own way of not being hit. */}
          {reaction === 'HIDE' && <div className="battle-moss-mark" aria-hidden="true" />}
        </div>
        <HpBar
          label="あなた"
          hp={battle.playerHp}
          max={battle.playerMaxHp}
          testId="player-hp"
        />
      </div>
      {beaten ? (
        <div
          className="battle-log"
          data-testid={enemy ? 'enemy-defeated-line' : 'gald-defeated-line'}
          role="status"
          aria-live="polite"
        >
          <div className="dialogue-speaker">{enemy ? null : GALD_DEFEATED_LINES[0].speaker}</div>
          <div className="dialogue-text">
            {enemy ? enemy.defeatedText : GALD_DEFEATED_LINES[0].text}
          </div>
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
