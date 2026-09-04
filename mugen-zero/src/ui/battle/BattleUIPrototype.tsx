import { useEffect, useRef, useState } from 'react';
import {
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
  type EnemyAction,
  type EnemySpec,
} from '../../game/battle/battleLogic';
import type { EnemySpeciesDef } from '../../content/enemies/species';
import { EXPLORATION_SPRITES } from '../../content/characters/explorationSprites';
import { locationBackground, type LocationId } from '../../content/locations/locationVisuals';
import type { LifeChoiceId } from '../../core/flow/types';
import { vibrate } from '../../platform/haptics';

/**
 * A piece of a picture, drawn at a given height with its own feet on the
 * ground.
 *
 * Every character here is an existing asset used exactly as it is. Two
 * of them live inside files with a lot of transparent margin (Kaos
 * shares one file with three other views of her), so the crop says which
 * part of the file is the character — nothing is redrawn, recoloured or
 * regenerated, and cropping in CSS leaves the files untouched.
 */
interface ArtCrop {
  src: string;
  fileW: number;
  fileH: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

const KAOS_LEFT = EXPLORATION_SPRITES.KAOS.frames.left.idle;
const HERO_LEFT = EXPLORATION_SPRITES.HERO.frames.left.idle;

/** Measured from the assets themselves: the box the drawing occupies. */
const HERO_CROP: ArtCrop = {
  src: HERO_LEFT.url,
  fileW: 120,
  fileH: 180,
  x: 14,
  y: 18,
  w: 101,
  h: 159,
};

const KAOS_CROP: ArtCrop = {
  src: KAOS_LEFT.url,
  fileW: 1221,
  fileH: 1289,
  // The registry already knows which rectangle of her sheet is the
  // left-facing view; this is that rectangle and nothing else.
  x: KAOS_LEFT.rect!.x,
  y: KAOS_LEFT.rect!.y,
  w: KAOS_LEFT.rect!.width,
  h: KAOS_LEFT.rect!.height,
};

function cropOf(species: EnemySpeciesDef): ArtCrop {
  return {
    src: species.portrait!,
    fileW: 1024,
    fileH: 1536,
    x: 129,
    y: 387,
    w: 703,
    h: 850,
  };
}

/** The art, sized by height, with the bottom edge on the ground line. */
function ActorArt({ crop, height, className }: { crop: ArtCrop; height: number; className: string }) {
  const k = height / crop.h;
  return (
    <div
      className={className}
      style={{
        width: crop.w * k,
        height,
        backgroundImage: `url(${crop.src})`,
        backgroundSize: `${crop.fileW * k}px ${crop.fileH * k}px`,
        backgroundPosition: `${-crop.x * k}px ${-crop.y * k}px`,
      }}
    />
  );
}

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

interface Props {
  species: EnemySpeciesDef;
  /** Where the fight broke out. Supplies the battlefield itself. */
  battleLocationId: LocationId;
  /**
   * Whether this particular creature turns out to have a life. Ordinary
   * fights end ordinarily; only now and then do the four answers come
   * up, and in this prototype which one happens is a debug switch.
   */
  finishesInMugenChoice: boolean;
  /** Start with the creature already beatable, to look at the swap. */
  startFinishable?: boolean;
  /** An ordinary fight, over. */
  onNormalEnd: () => void;
  /** The other kind. The choice is real and is recorded by the caller. */
  onMugenChoice: (choice: LifeChoiceId) => void;
  onDefeat: () => void;
}

/** The four answers, in this creature's own words. */
const MUGEN_LABELS: Record<LifeChoiceId, string> = {
  KILL: 'とどめ',
  SPARE: '見のがす',
  HELP: '助ける',
  CAPTURE: '連れて行く',
};

/** How long each moment of the fight is held on screen. */
const BEAT_MS: Record<string, number> = {
  STRIKE: 320,
  TACKLE: 460,
  HIDE: 560,
  HURT: 300,
};

/**
 * BATTLE UI — PROTOTYPE.
 *
 * Not the battle screen. A second one, built beside it so that the
 * question "is this the right direction" can be answered on a phone
 * instead of on paper, and answered with the real battle logic rather
 * than a mock: the numbers, the skill, the cooldowns and the enemy's
 * turn are all the ones the game already uses.
 *
 * What it is trying to show:
 *
 *  - the world is the screen. The forest is the same picture the player
 *    just walked through, at its own colour, and no panel, veil or fade
 *    is allowed to cover it;
 *  - there is a place, and people are standing in it. The creature on
 *    the left, the two of them on the right, all three with their feet
 *    on one ground line rather than pasted on;
 *  - fighting and deciding are different things. The commands are
 *    ATTACK and SKILL while the fight is a fight, and become the four
 *    answers only once there is a life to decide about.
 *
 * Nothing here is adopted. The old screen is untouched and one flag
 * away.
 */
export function BattleUIPrototype({
  species,
  battleLocationId,
  finishesInMugenChoice,
  startFinishable = false,
  onNormalEnd,
  onMugenChoice,
  onDefeat,
}: Props) {
  const [battle, setBattle] = useState<BattleState>(() => {
    const fresh = createBattle(specOf(species));
    return startFinishable ? { ...fresh, enemyHp: 1 } : fresh;
  });
  const [beat, setBeat] = useState<string>('NONE');
  const [skillOpen, setSkillOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (battle.outcome === 'DEFEAT') {
      const t = setTimeout(onDefeat, 1200);
      return () => clearTimeout(t);
    }
  }, [battle.outcome, onDefeat]);

  const play = (sequence: string[]) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    let at = 0;
    for (const step of sequence) {
      const delay = at;
      timers.current.push(window.setTimeout(() => setBeat(step), delay));
      at += BEAT_MS[step] ?? 300;
    }
    timers.current.push(window.setTimeout(() => setBeat('NONE'), at));
  };

  const answerOf = (next: BattleState): string[] =>
    next.lastEnemyAction === 'SKILL' ? ['HIDE'] : next.lastEnemyAction === 'ATTACK' ? ['TACKLE', 'HURT'] : [];

  const command = (kind: 'ATTACK' | 'DEFEND', forced: EnemyAction | null = null) => {
    if (battle.outcome !== 'ONGOING') return;
    setSkillOpen(false);
    const next = kind === 'ATTACK' ? playerAttack(battle, undefined, forced) : playerDefend(battle, undefined, forced);
    setBattle(next);
    play([kind === 'ATTACK' ? 'STRIKE' : 'GUARD', ...answerOf(next)]);
  };

  const decide = (choice: LifeChoiceId) => {
    if (saving) return;
    setSaving(true);
    vibrate(24); // a decision you feel
    onMugenChoice(choice);
  };

  const beaten = battle.outcome === 'VICTORY';
  const backdrop = locationBackground(battleLocationId);
  const lastLine = battle.log[battle.log.length - 1];
  const enemyCrop = cropOf(species);

  return (
    <div className="screen bp-screen" data-testid="battle-prototype">
      {/* 1. The world. Its own colour, nothing over it. */}
      <div className="bp-stage">
        {backdrop && <img className="bp-bg" src={backdrop} alt="" aria-hidden="true" />}

        {/* 2. The creature, on the left, further up the path. */}
        <div className={`bp-actor bp-enemy${beat === 'TACKLE' ? ' tackle' : ''}${beat === 'HIDE' ? ' hide' : ''}${beat === 'STRIKE' ? ' struck' : ''}${beaten ? ' beaten' : ''}`}>
          <span className="bp-shadow" aria-hidden="true" />
          {/* A moss rabbit is a small animal, and has to read as one
              next to two people. */}
          <ActorArt crop={enemyCrop} height={122} className="bp-art" />
          {beat === 'HIDE' && <span className="bp-moss" aria-hidden="true" />}
          {beat === 'TACKLE' && (
            <span className="bp-leaves" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} className={`bp-leaf bp-leaf-${i}`} />
              ))}
            </span>
          )}
        </div>

        {/* 3. The two of them, on the right, nearer. */}
        <div className={`bp-actor bp-kaos${beat === 'HURT' ? ' flinch' : ''}`}>
          <span className="bp-shadow" aria-hidden="true" />
          <ActorArt crop={KAOS_CROP} height={112} className="bp-art" />
        </div>
        <div className={`bp-actor bp-hero${beat === 'STRIKE' ? ' strike' : ''}${beat === 'HURT' ? ' hurt' : ''}`}>
          <span className="bp-shadow" aria-hidden="true" />
          <ActorArt crop={HERO_CROP} height={132} className="bp-art" />
        </div>

        {/* 4. What is happening, as small as it can be and still be read. */}
        <div className="bp-hp bp-hp-enemy" data-testid="bp-enemy-hp">
          <span className="bp-hp-name">{battle.enemyName}</span>
          <span className="bp-hp-track">
            <span
              className="bp-hp-fill enemy"
              style={{ width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%` }}
            />
          </span>
          <span className="bp-hp-num">
            {battle.enemyHp}/{battle.enemyMaxHp}
          </span>
        </div>
        <div className="bp-hp bp-hp-party" data-testid="bp-player-hp">
          <span className="bp-hp-name">あなた</span>
          <span className="bp-hp-track">
            <span
              className="bp-hp-fill"
              style={{ width: `${(battle.playerHp / battle.playerMaxHp) * 100}%` }}
            />
          </span>
          <span className="bp-hp-num">
            {battle.playerHp}/{battle.playerMaxHp}
          </span>
        </div>
      </div>

      {/* 5. One line, not a conversation box. */}
      <p className="bp-message" data-testid="bp-message" role="status" aria-live="polite">
        {beaten && !finishesInMugenChoice ? species.defeatedText : lastLine}
      </p>

      {/* 6. Fighting, and then — separately — deciding. */}
      {!beaten && (
        <div className="bp-commands" data-testid="bp-commands">
          <button className="bp-cmd" data-testid="bp-attack" onClick={() => command('ATTACK')}>
            攻撃
          </button>
          <button
            className={skillOpen ? 'bp-cmd open' : 'bp-cmd'}
            data-testid="bp-skill"
            aria-expanded={skillOpen}
            onClick={() => setSkillOpen((open) => !open)}
          >
            スキル
          </button>
        </div>
      )}
      {!beaten && skillOpen && (
        <div className="bp-tray" data-testid="bp-skill-tray">
          <button className="bp-tray-item" data-testid="bp-skill-guard" onClick={() => command('DEFEND')}>
            身構える
            <span className="bp-tray-sub">受けるダメージを半分にする</span>
          </button>
          <p className="bp-tray-empty">このさきに覚えるものが入ります。</p>
        </div>
      )}

      {beaten && finishesInMugenChoice && (
        <div className="bp-mugen" data-testid="bp-mugen-choice">
          <p className="bp-mugen-label">MUGEN CHOICE</p>
          <div className="bp-mugen-grid">
            {(Object.keys(MUGEN_LABELS) as LifeChoiceId[]).map((id) => (
              <button
                key={id}
                className="bp-mugen-btn"
                data-testid={`bp-mugen-${id}`}
                disabled={saving}
                onClick={() => decide(id)}
              >
                {MUGEN_LABELS[id]}
                <span className="bp-mugen-sub">{id}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {beaten && !finishesInMugenChoice && (
        <div className="bp-commands">
          <button className="bp-cmd wide" data-testid="bp-normal-end" onClick={onNormalEnd}>
            森へ戻る
          </button>
        </div>
      )}
    </div>
  );
}
