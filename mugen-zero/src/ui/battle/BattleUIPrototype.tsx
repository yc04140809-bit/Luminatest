import { useEffect, useRef, useState } from 'react';
import {
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
  type EnemyAction,
  type EnemySpec,
} from '../../game/battle/battleLogic';
import type { EnemySpeciesDef, EnemyVisual } from '../../content/enemies/species';
import { EXPLORATION_SPRITES } from '../../content/characters/explorationSprites';
import { locationBackground, type LocationId } from '../../content/locations/locationVisuals';
import type { LifeChoiceId } from '../../core/flow/types';
import { vibrate } from '../../platform/haptics';
import { Ornament } from '../common/Ornament';
import {
  modifiersOf,
  rollChaosIntervention,
  type ChaosInterventionDef,
} from '../../core/chaos/chaosIntervention';
import { CHAOS_INTERVENTIONS } from '../../content/chaos/chaosInterventions';
import type { ArcanaConditionId } from '../../core/arcana/arcana';
import { CageIcon, HeartIcon, LeafIcon, SparkIcon, SwordIcon } from './BattleIcons';

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

/** A species' art for one state, as a crop this screen can draw. */
function cropOf(visual: EnemyVisual): ArtCrop {
  return {
    src: visual.src,
    fileW: visual.box.fileW,
    fileH: visual.box.fileH,
    x: visual.box.x,
    y: visual.box.y,
    w: visual.box.width,
    h: visual.box.height,
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
  /** Development only: make the creature do one thing every turn. */
  forcedEnemyAction?: EnemyAction | null;
  /** Development only: settle what Kaos does at the start of the fight. */
  forcedChaos?: ChaosInterventionDef['id'] | null;
  /**
   * Something about this creature was just seen for the first time.
   *
   * The screen reports what happened in front of the player and knows
   * nothing about what it is worth — who is keeping the book, and how
   * much any of it counts for, is entirely the caller's business.
   * Fired at the moment each thing is actually on screen, and at most
   * once per fight per thing.
   */
  onObserved?: (id: ArcanaConditionId) => void;
  /** An ordinary fight, over. */
  onNormalEnd: () => void;
  /** The other kind. The choice is real and is recorded by the caller. */
  onMugenChoice: (choice: LifeChoiceId) => void;
  onDefeat: () => void;
}

/**
 * The four answers. Each one has a mark and a colour of its own,
 * because they are not four versions of the same decision — a player
 * must be able to tell them apart before reading a word.
 */
const MUGEN_CHOICES: {
  id: LifeChoiceId;
  jp: string;
  Icon: typeof SwordIcon;
}[] = [
  { id: 'KILL', jp: 'とどめを刺す', Icon: SwordIcon },
  { id: 'SPARE', jp: '見逃す', Icon: HeartIcon },
  { id: 'HELP', jp: '助ける', Icon: LeafIcon },
  { id: 'CAPTURE', jp: '連れて行く', Icon: CageIcon },
];

/** How long each moment of the fight is held on screen. */
const BEAT_MS: Record<string, number> = {
  STRIKE: 320,
  TACKLE: 460,
  HIDE: 560,
  HURT: 300,
};

/**
 * How long it takes to go down.
 *
 * Short. Long enough that the creature is seen to fall rather than to
 * blink into a different picture, and no longer — being made to wait is
 * not the same as being moved. Nothing is asked of the player until it
 * has finished falling, so the picture and the question never disagree.
 */
const KNOCKDOWN_MS = 340;

/**
 * How long her moment lasts before the fight starts.
 *
 * A remark and a name, not a scene. Long enough to read, short enough
 * that a player who has seen it forty times is not waiting on it — and
 * it can be tapped away.
 */
const CHAOS_BEAT_MS = 1800;

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
  forcedEnemyAction = null,
  forcedChaos = null,
  onObserved,
  onNormalEnd,
  onMugenChoice,
  onDefeat,
}: Props) {
  /**
   * What Kaos does about this fight.
   *
   * Rolled once, in the same breath as the battle itself, so it cannot
   * be re-drawn per turn and cannot be shaken loose by a re-render. It
   * lives inside the battle, which means it dies with it: nothing is
   * saved, and the next fight starts from nothing.
   */
  const [chaos] = useState<ChaosInterventionDef | null>(() =>
    rollChaosIntervention({ defs: CHAOS_INTERVENTIONS, forced: forcedChaos }),
  );
  const [battle, setBattle] = useState<BattleState>(() => {
    const fresh = createBattle(specOf(species), modifiersOf(chaos));
    return startFinishable ? { ...fresh, enemyHp: 1 } : fresh;
  });
  /** Her moment, before the fight. Skipped entirely when she does not. */
  const [showingChaos, setShowingChaos] = useState(chaos !== null);
  const [beat, setBeat] = useState<string>('NONE');
  /**
   * NORMAL while it is fighting; DOWNED once it is beaten.
   *
   * DOWNED is not dead. It is a creature lying in the grass that the
   * player is about to decide about, and it stays on the battlefield
   * through the whole of that decision.
   */
  const [stance, setStance] = useState<'NORMAL' | 'DOWNED'>('NORMAL');
  const [skillOpen, setSkillOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const timers = useRef<number[]>([]);
  // How tall the battlefield actually is on this phone. Everybody
  // standing in it is sized as a fraction of that, so the three of them
  // keep their scale to the place rather than to a pixel count.
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageH, setStageH] = useState(460);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setStageH(node.getBoundingClientRect().height || 460);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  useEffect(() => {
    if (!showingChaos) return;
    const t = setTimeout(() => setShowingChaos(false), CHAOS_BEAT_MS);
    return () => clearTimeout(t);
  }, [showingChaos]);

  useEffect(() => {
    if (battle.outcome === 'DEFEAT') {
      const t = setTimeout(onDefeat, 1200);
      return () => clearTimeout(t);
    }
    if (battle.outcome === 'VICTORY' && stance === 'NORMAL') {
      // It goes down first, and only then is anything asked.
      const t = setTimeout(() => setStance('DOWNED'), KNOCKDOWN_MS);
      return () => clearTimeout(t);
    }
  }, [battle.outcome, stance, onDefeat]);

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

  /**
   * Said once per fight, whatever the caller does with it.
   *
   * The screen is the only place that knows a leaf tackle actually
   * landed rather than was rolled, so it is the honest place for this;
   * the ref keeps a long fight from reporting the same sight ten times.
   */
  const seen = useRef<Set<ArcanaConditionId>>(new Set());
  const observe = (id: ArcanaConditionId) => {
    if (seen.current.has(id)) return;
    seen.current.add(id);
    onObserved?.(id);
  };

  // Meeting it at all, and whether anyone helped. Both are true the
  // moment the fight exists, so they are reported on mount rather than
  // waiting for a turn the player might never take.
  useEffect(() => {
    observe('FIRST_ENCOUNTER');
    if (chaos) observe('KAOS_INTERVENED');
    // Once, for this fight. The battle and the intervention are both
    // settled before the first render and neither can change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const command = (kind: 'ATTACK' | 'DEFEND') => {
    if (battle.outcome !== 'ONGOING') return;
    setSkillOpen(false);
    const next =
      kind === 'ATTACK'
        ? playerAttack(battle, undefined, forcedEnemyAction)
        : playerDefend(battle, undefined, forcedEnemyAction);
    setBattle(next);
    if (next.lastEnemyAction === 'ATTACK') observe('OBSERVE_NORMAL_ATTACK');
    if (next.lastEnemyAction === 'SKILL') observe('OBSERVE_UNIQUE_SKILL');
    if (next.outcome === 'VICTORY') observe('WON_A_FIGHT');
    if (next.outcome === 'DEFEAT') observe('LOST_A_FIGHT');
    play([kind === 'ATTACK' ? 'STRIKE' : 'GUARD', ...answerOf(next)]);
  };

  const decide = (choice: LifeChoiceId) => {
    if (saving) return;
    setSaving(true);
    vibrate(24); // a decision you feel
    onMugenChoice(choice);
  };

  const beaten = battle.outcome === 'VICTORY';
  // Everything after the fight waits for it to actually be lying down,
  // so the picture and the question never disagree.
  const downed = beaten && stance === 'DOWNED';
  const downVisual = species.battleVisuals.down;
  const showingDown = downed && downVisual !== null;
  const backdrop = locationBackground(battleLocationId);
  const lastLine = battle.log[battle.log.length - 1];
  const enemyCrop = cropOf(showingDown ? downVisual! : species.battleVisuals.normal);
  /**
   * Their sizes, as a share of the battlefield.
   *
   * A moss rabbit is a small animal that has to read as one from across
   * a clearing; the two of them are nearer the camera and so a little
   * taller. What matters is not the numbers but that all three sit
   * inside the same picture instead of on top of it.
   */
  const stage = {
    enemy: Math.round(stageH * 0.23),
    // Beaten, it is lying in the grass: the same animal, seen from the
    // side, so its height on screen comes from its own drawing rather
    // than from the standing one's.
    enemyDown: Math.round(stageH * 0.16),
    hero: Math.round(stageH * 0.22),
    kaos: Math.round(stageH * 0.215),
  };

  return (
    <div className="screen bp-screen" data-testid="battle-prototype">
      {/* 1. The world. Its own colour, nothing over it. */}
      <div className="bp-stage" ref={stageRef}>
        {backdrop && <img className="bp-bg" src={backdrop} alt="" aria-hidden="true" />}

        {/* 2. The creature: left, and further up the path than they are,
               which is what makes the ground between them a distance. */}
        <div
          className={[
            'bp-actor bp-enemy',
            beat === 'TACKLE' ? 'tackle' : '',
            beat === 'HIDE' ? 'hide' : '',
            beat === 'STRIKE' ? 'struck' : '',
            beaten && !showingDown ? 'falling' : '',
            showingDown ? 'downed' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-testid={showingDown ? 'bp-enemy-downed' : 'bp-enemy-normal'}
        >
          <span className="bp-shadow" aria-hidden="true" />
          {showingChaos && chaos?.target === 'ENEMY' && (
            <span className="bp-chaos-mark debuff" aria-hidden="true" />
          )}
          <ActorArt
            crop={enemyCrop}
            height={showingDown ? stage.enemyDown : stage.enemy}
            className="bp-art"
          />
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
        <div
          className={[
            'bp-actor bp-kaos',
            beat === 'HURT' ? 'flinch' : '',
            showingChaos ? 'casting' : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <span className="bp-shadow" aria-hidden="true" />
          {showingChaos && <span className="bp-chaos-aura" aria-hidden="true" />}
          <ActorArt crop={KAOS_CROP} height={stage.kaos} className="bp-art" />
        </div>
        <div className={`bp-actor bp-hero${beat === 'STRIKE' ? ' strike' : ''}${beat === 'HURT' ? ' hurt' : ''}`}>
          <span className="bp-shadow" aria-hidden="true" />
          {showingChaos && chaos?.target === 'PLAYER' && (
            <span className="bp-chaos-mark buff" aria-hidden="true" />
          )}
          <ActorArt crop={HERO_CROP} height={stage.hero} className="bp-art" />
        </div>

        {/* 4. Who is in this, and how they are doing. A small framed
               plate rather than a status panel: it sits ON the forest
               and takes a corner of it, not a band across it. */}
        <div className="bp-plate bp-plate-enemy" data-testid="bp-enemy-hp">
          <span className="bp-plate-name">{battle.enemyName}</span>
          <span className="bp-plate-row">
            <span className="bp-plate-num">
              {battle.enemyHp} / {battle.enemyMaxHp}
            </span>
            <span className="bp-track">
              <span
                className="bp-fill enemy"
                style={{ width: `${(battle.enemyHp / battle.enemyMaxHp) * 100}%` }}
              />
            </span>
          </span>
        </div>
      </div>

      {/* Still in force. One chip, so a player who tapped past her
          moment can still see that something is helping. */}
      {chaos && !showingChaos && battle.outcome === 'ONGOING' && (
        <p className={`bp-chaos-badge ${chaos.category.toLowerCase()}`} data-testid="bp-chaos-badge">
          《{chaos.name}》
        </p>
      )}

      {/* The party's own plate, under the battlefield rather than over
          it, so nothing of the forest is spent on it. */}
      <div className="bp-plate bp-plate-party" data-testid="bp-player-hp">
        <span className="bp-plate-name">あなた</span>
        <span className="bp-plate-row">
          <span className="bp-plate-num">
            {battle.playerHp} / {battle.playerMaxHp}
          </span>
          <span className="bp-track">
            <span
              className="bp-fill"
              style={{ width: `${(battle.playerHp / battle.playerMaxHp) * 100}%` }}
            />
          </span>
        </span>
      </div>

      {/* 5. One line, not a conversation box. */}
      {!(downed && finishesInMugenChoice) && (
        <div className="bp-message" data-testid="bp-message" role="status" aria-live="polite">
          <p className="bp-message-text">
            {beaten && !finishesInMugenChoice ? species.defeatedText : lastLine}
          </p>
          <Ornament kind="ring" size={26} className="bp-message-mark" />
        </div>
      )}

      {/* 6b. Her moment, in the place the commands were: a remark and a
             name for a second or two, so nothing of the forest is
             covered and nothing above this line moves. Tapping skips. */}
      {showingChaos && chaos && (
        <button
          className="bp-chaos-card"
          data-testid="bp-chaos-card"
          data-chaos={chaos.id}
          onClick={() => setShowingChaos(false)}
          aria-label={`${chaos.name} — ${chaos.effect}`}
        >
          <span className="bp-chaos-who">ケイオス</span>
          <span className="bp-chaos-line">「{chaos.line}」</span>
          <span className="bp-chaos-rule" aria-hidden="true" />
          <span className={`bp-chaos-name ${chaos.category.toLowerCase()}`}>《{chaos.name}》</span>
          <span className="bp-chaos-effect">{chaos.effect}</span>
        </button>
      )}

      {/* 6. Fighting, and then — separately — deciding. */}
      {!beaten && !showingChaos && (
        <div className="bp-commands" data-testid="bp-commands">
          <button className="bp-cmd" data-testid="bp-attack" onClick={() => command('ATTACK')}>
            <SwordIcon size={19} className="bp-cmd-mark" />
            <span className="bp-cmd-jp">攻撃</span>
            <span className="bp-cmd-en">ATTACK</span>
          </button>
          <button
            className={skillOpen ? 'bp-cmd open' : 'bp-cmd'}
            data-testid="bp-skill"
            aria-expanded={skillOpen}
            onClick={() => setSkillOpen((open) => !open)}
          >
            <SparkIcon size={19} className="bp-cmd-mark" />
            <span className="bp-cmd-jp">スキル</span>
            <span className="bp-cmd-en">SKILL</span>
          </button>
        </div>
      )}
      {!beaten && !showingChaos && skillOpen && (
        <div className="bp-tray" data-testid="bp-skill-tray">
          <button className="bp-tray-item" data-testid="bp-skill-guard" onClick={() => command('DEFEND')}>
            身構える
            <span className="bp-tray-sub">受けるダメージを半分にする</span>
          </button>
          <p className="bp-tray-empty">このさきに覚えるものが入ります。</p>
        </div>
      )}

      {downed && finishesInMugenChoice && (
        <div className="bp-mugen" data-testid="bp-mugen-choice">
          {/* A different kind of moment, so a different ground under it:
              the fight's ivory gives way, and the question is asked in
              the dark. */}
          <p className="bp-mugen-line">{species.defeatedText}</p>
          <div className="bp-mugen-grid">
            {MUGEN_CHOICES.map(({ id, jp, Icon }) => (
              <button
                key={id}
                className={`bp-mugen-btn ${id.toLowerCase()}`}
                data-testid={`bp-mugen-${id}`}
                disabled={saving}
                onClick={() => decide(id)}
              >
                <Icon size={20} className="bp-mugen-mark" />
                <span className="bp-mugen-en">{id}</span>
                <span className="bp-mugen-jp">{jp}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {downed && !finishesInMugenChoice && (
        <div className="bp-commands">
          <button className="bp-cmd wide" data-testid="bp-normal-end" onClick={onNormalEnd}>
            <span className="bp-cmd-jp">森へ戻る</span>
          </button>
        </div>
      )}
    </div>
  );
}
