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
import { modifiersOf, type ChaosInterventionDef } from '../../core/chaos/chaosIntervention';
import { CHAOS_INTERVENTIONS } from '../../content/chaos/chaosInterventions';
import type { ArcanaConditionId } from '../../core/arcana/arcana';
import { planIntervention, type InterventionPlan } from '../../core/chaos/interventionPlan';
import {
  SUMMON_CONFIG,
  summonEffectFor,
  type SummonKind,
  type SummonOutcome,
} from '../../core/summon/summon';
import { mendPlayer, strikeAllEnemies } from '../../game/battle/battleLogic';
import type { AccidentRecord, SummonAccidentDef } from '../../core/summon/summonAccident';
import { SUMMON_ACCIDENTS } from '../../content/summon/accidents';
import { unknownArcanaDef } from '../../content/arcana/unknownArcana';
import {
  AccidentCard,
  AccidentStage,
  AccidentTalk,
  accidentStageClass,
  useAccidentSequence,
} from '../cinematic/accidentCinematic';
import type { BattleArcana } from './battleArcana';
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
   * The book, as this fight sees it: what can be called, how complete
   * it is, and what it does. The screen never reads the world — it is
   * handed this, so summoning one ARCANA and summoning a hundred are
   * the same code.
   */
  arcana?: readonly BattleArcana[];
  /**
   * Development only: open this fight with an attempt at a summon and
   * settle how it goes. Ignored when there is nothing unfinished to
   * call, so it can never invent a memory the player has not made.
   */
  forcedSummon?: SummonOutcome | null;
  /** Where this save stands with each thing that could cross it. */
  accidentRecords?: readonly AccidentRecord[];
  /** ARCANA the player owns, which can never cross by accident. */
  acquiredArcanaIds?: readonly string[];
  /** Today, in absolute world days, for the cooldown between sightings. */
  worldDay?: number | null;
  /**
   * Something crossed. Reported once, as it happens.
   *
   * Seeing is not obtaining: what the caller does with this is write
   * down that it was seen, and nothing else. No ARCANA is granted, no
   * page is started, and nothing enters WORLD MEMORY.
   */
  onAccidentObserved?: (accidentId: string) => void;
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
  arcana = [],
  forcedSummon = null,
  accidentRecords = [],
  acquiredArcanaIds = [],
  worldDay = null,
  onAccidentObserved,
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
  const [plan] = useState<InterventionPlan>(() =>
    planIntervention({
      defs: CHAOS_INTERVENTIONS,
      candidates: arcana.map((a) => ({ arcanaId: a.arcanaId, progress: a.progress })),
      accidents: SUMMON_ACCIDENTS,
      accidentRecords,
      acquiredArcanaIds,
      day: worldDay,
      location: battleLocationId,
      forcedChaos,
      forcedSummon,
    }),
  );
  const chaos = plan.kind === 'MODIFIER' ? plan.def : null;
  /** The unfinished memory she reached for, if she did. */
  const openingSummon =
    plan.kind === 'SUMMON'
      ? (arcana.find((a) => a.arcanaId === plan.arcanaId) ?? null)
      : null;
  const [battle, setBattle] = useState<BattleState>(() => {
    const fresh = createBattle(specOf(species), modifiersOf(chaos));
    return startFinishable ? { ...fresh, enemyHp: 1 } : fresh;
  });
  /** Her moment, before the fight. Skipped entirely when she does not. */
  const [showingChaos, setShowingChaos] = useState(plan.kind !== 'NONE');
  /**
   * What is standing on the field right now because it was called.
   *
   * Runtime only, and short-lived: an ARCANA is a memory put back
   * together for a moment, not a party member. It arrives, it does its
   * one thing, and it goes.
   */
  const [summoned, setSummoned] = useState<{ arcana: BattleArcana; kind: SummonKind } | null>(null);
  /**
   * What a summon just said, while it is saying it.
   *
   * The message plate normally shows the last line of the log. For the
   * second and a half a memory is standing on the field it shows this
   * instead: the ability's name, what it did, and what came of it, all
   * three at once. That is the fix for "a summon at full health told
   * the player nothing" — it is not that nothing happened, it is that
   * one line at the bottom of a log was never enough room to say what.
   */
  const [said, setSaid] = useState<{ name: string; line: string; result: string } | null>(null);
  /**
   * The accident, if this fight has one, and which beat it is on.
   *
   * NONE while nothing has crossed. It never returns to NONE from TALK
   * by any route but time or a tap, and nothing about it is rolled
   * here — the plan settled it before the first render.
   */
  // The same sequence the admin preview plays, driven by the same
  // hook: there is one accident in this codebase, not two.
  const { beat: accidentBeat, start: startAccident, stop: stopAccident } = useAccidentSequence();
  const accident: SummonAccidentDef | null =
    plan.kind === 'SUMMON' && plan.outcome === 'ACCIDENT' ? plan.accident : null;
  const unknown = accident ? unknownArcanaDef(accident.unknownArcanaId) : null;
  /** The complete memories already spent in this fight. */
  const [spent, setSpent] = useState<string[]>([]);
  const [arcanaTrayOpen, setArcanaTrayOpen] = useState(false);
  const completeArcana = arcana.filter((a) => a.complete);
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

  /**
   * Her attempt resolves as her moment ends.
   *
   * Only on the way out, and only once: the card says she is trying,
   * and the creature appears when she has finished saying it. A failed
   * attempt costs the player nothing at all — no damage, no turn, no
   * lost ARCANA. It simply did not hold.
   */
  const openingResolved = useRef(false);
  useEffect(() => {
    if (showingChaos || openingResolved.current) return;
    openingResolved.current = true;
    if (plan.kind !== 'SUMMON') return;
    if (plan.outcome === 'SUCCESS' && openingSummon) {
      callArcana(openingSummon, 'INCOMPLETE');
      return;
    }
    if (plan.outcome === 'ACCIDENT' && accident) {
      // Written down as it happens rather than when the beat ends: a
      // player who closes the game mid-sight still saw it.
      onAccidentObserved?.(accident.id);
      startAccident();
    }
    // The card is what carries the outcome; nothing else to do on a
    // failure, which is the point of it being harmless.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showingChaos]);

  /**
   * The breath lands as its picture appears, once.
   *
   * Through the ordinary battle rules, not around them: everything it
   * brings to zero goes VICTORY → down → the four answers, exactly as
   * if the player had done it. An accident is not allowed to decide
   * anybody's fate.
   */
  const breathed = useRef(false);
  useEffect(() => {
    if (accidentBeat !== 'BREATH' || breathed.current || !accident) return;
    breathed.current = true;
    const effect = accident.ability.effect;
    if (effect.kind === 'STRIKE_ALL') {
      setBattle((current) => strikeAllEnemies(current, effect.amount));
    }
  }, [accidentBeat, accident]);

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

  /**
   * A memory arrives, does its one thing, and goes.
   *
   * The effect lands as it appears rather than when it leaves, so the
   * player sees the creature and the number in the same breath; the
   * timer only takes it off the field again.
   */
  const callArcana = (entry: BattleArcana, kind: SummonKind) => {
    setSummoned({ arcana: entry, kind });
    const effect = summonEffectFor(entry.ability, kind);
    if (effect.kind === 'MEND') {
      setBattle((current) => {
        // Which of its two faces the player gets depends on whether
        // they are hurt, and the rule for that lives in the battle,
        // not here. The screen only reads back what happened.
        const hurt = current.playerHp < current.playerMaxHp;
        const line = hurt ? entry.ability.line : entry.ability.fullLine;
        const next = mendPlayer(current, effect, line);
        setSaid({
          name: entry.ability.name,
          line,
          result: next.log[next.log.length - 1] ?? '',
        });
        return next;
      });
    }
    // The creature leaves on a timer. What it said does not: three
    // lines of Japanese in a second and a half is a thing the player
    // is watching disappear rather than reading. The plate holds them
    // until the fight moves on, which is the player's own next move.
    timers.current.push(window.setTimeout(() => setSummoned(null), SUMMON_CONFIG.stayMs));
  };

  // Meeting it at all, and whether anyone helped. Both are true the
  // moment the fight exists, so they are reported on mount rather than
  // waiting for a turn the player might never take.
  useEffect(() => {
    observe('FIRST_ENCOUNTER');
    if (plan.kind !== 'NONE') observe('KAOS_INTERVENED');
    // Once, for this fight. The battle and the intervention are both
    // settled before the first render and neither can change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const command = (kind: 'ATTACK' | 'DEFEND') => {
    if (battle.outcome !== 'ONGOING') return;
    setSkillOpen(false);
    // The fight moves on, so the plate goes back to reporting it.
    setSaid(null);
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
  /** The fight itself is suspended while any of it is happening. */
  const inAccident = accidentBeat !== 'NONE';
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
    // Smaller than the creature actually in the fight. A rebuilt memory
    // should not read as the same weight of thing as the animal in
    // front of you, and in a moss-rabbit-versus-moss-rabbit fight the
    // difference in size is the first thing that tells them apart.
    summon: Math.round(stageH * 0.15),
  };

  return (
    <div className="screen bp-screen" data-testid="battle-prototype">
      {/* 1. The world. Its own colour, nothing over it. */}
      <div
        className={`bp-stage${accidentStageClass(accidentBeat)}`}
        ref={stageRef}
        data-accident={accidentBeat === 'NONE' ? undefined : accidentBeat}
      >
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

        {/* 3b. What was called. On THIS side of the clearing, in front
               of the two of them and well clear of the creature they
               are fighting — which matters most in the one fight where
               both of them are moss rabbits. It is smaller than the
               real one, it stands inside a ring of her light, and it is
               labelled; nothing about the drawing itself is recoloured. */}
        {/* What crossed, and its one move. Shared with the admin
            preview so the two can never drift apart. */}
        <AccidentStage
          beat={accidentBeat}
          unknown={unknown}
          ability={accident?.ability ?? null}
        />

        {summoned && (
          <div
            className={`bp-actor bp-summon ${summoned.kind.toLowerCase()}`}
            data-testid="bp-summoned"
            data-arcana={summoned.arcana.arcanaId}
            data-kind={summoned.kind}
          >
            <span className="bp-shadow" aria-hidden="true" />
            <span className="bp-summon-ring" aria-hidden="true" />
            <span className="bp-summon-tag">ARCANA</span>
            <ActorArt
              crop={cropOf({ src: summoned.arcana.visual.src, box: summoned.arcana.visual.box })}
              height={stage.summon}
              className="bp-art"
            />
          </div>
        )}

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

      {/* 5. One line, not a conversation box — except for the second
             and a half a called memory is speaking, when it is three:
             what came, what it did, and what came of it. The plate is
             replaced rather than added to, so nothing below it moves. */}
      {!(downed && finishesInMugenChoice && !inAccident) && (
        <div
          className={said ? 'bp-message bp-said' : 'bp-message'}
          data-testid="bp-message"
          data-said={said ? 'yes' : undefined}
          role="status"
          aria-live="polite"
        >
          {said ? (
            // The same plate, saying three things instead of one. It
            // keeps its identity on purpose: everything that watches
            // this line — the rest of the suite included — must not
            // find it missing for a second and a half.
            <div className="bp-said-body" data-testid="bp-said">
              <span className="bp-said-name">《{said.name}》</span>
              <p className="bp-said-line">{said.line}</p>
              <p className="bp-said-result" data-testid="bp-said-result">
                {said.result}
              </p>
            </div>
          ) : (
            <>
              <p className="bp-message-text">
                {/* While something is crossing, the plate reports the
                    fight rather than its ending: the player needs to
                    read what the breath just did before being told the
                    creature is lying down. */}
                {beaten && !finishesInMugenChoice && !inAccident ? species.defeatedText : lastLine}
              </p>
              <Ornament kind="ring" size={26} className="bp-message-mark" />
            </>
          )}
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

      {/* 6c. The other thing she can do: reach for a memory that is not
             all there. The same card, the same place, the same second
             or two — the forest is not covered for this either. What it
             shows instead of a blessing is which page she is reaching
             for and how much of it there is, because that number is the
             reason it works or does not. */}
      {showingChaos && plan.kind === 'SUMMON' && openingSummon && (
        <button
          className={`bp-chaos-card bp-summon-card ${plan.outcome.toLowerCase()}`}
          data-testid="bp-summon-card"
          data-outcome={plan.outcome}
          data-arcana={openingSummon.arcanaId}
          onClick={() => setShowingChaos(false)}
          aria-label={`${openingSummon.name} — ${plan.outcome === 'FAILURE' ? '不成立' : '召喚'}`}
        >
          <span className="bp-chaos-who">ケイオス</span>
          <span className="bp-chaos-line">
            {/* An accident starts the way an ordinary attempt starts.
                She is reaching for the same page and says the same
                thing; what arrives is not what she reached for. */}
            「{plan.outcome === 'FAILURE' ? openingSummon.failureLine : openingSummon.incompleteLine}」
          </span>
          <span className="bp-chaos-rule" aria-hidden="true" />
          <span className="bp-summon-id">
            ARCANA #{String(openingSummon.number).padStart(3, '0')}
            <i>{openingSummon.name}</i>
          </span>
          <span className="bp-summon-meter">
            <span className="bp-summon-track" aria-hidden="true">
              <span className="bp-summon-fill" style={{ width: `${openingSummon.progress}%` }} />
            </span>
            <span className="bp-summon-pct" data-testid="bp-summon-progress">
              CONSTRUCTION {openingSummon.progress}%
            </span>
          </span>
        </button>
      )}

      {/* 6d. It was not what she reached for, and then nobody
             explains it. Both cards come from the shared cinematic. */}
      {accidentBeat === 'CROSS' && accident && (
        <AccidentCard unknown={unknown} accidentId={accident.id} />
      )}
      {accidentBeat === 'TALK' && <AccidentTalk onSkip={stopAccident} />}

      {/* 6. Fighting, and then — separately — deciding. */}
      {!beaten && !showingChaos && !inAccident && (
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
          {/* A finished memory is the player's to spend, so it is a
              command and not something that happens to them. Its own
              row rather than a third column: at 360px three of these
              side by side stop being readable, and this is the one the
              collecting is for. */}
          {completeArcana.length > 0 && (
            <button
              className={`bp-cmd wide arcana${arcanaTrayOpen ? ' open' : ''}`}
              data-testid="bp-arcana"
              aria-expanded={arcanaTrayOpen}
              disabled={spent.length >= SUMMON_CONFIG.usesPerBattle}
              onClick={() => {
                setSkillOpen(false);
                setArcanaTrayOpen((open) => !open);
              }}
            >
              <Ornament kind="ring" size={17} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">
                アルカナ
                {spent.length >= SUMMON_CONFIG.usesPerBattle && (
                  <i className="bp-cmd-spent" data-testid="bp-arcana-spent">
                    この戦いではもう呼べない
                  </i>
                )}
              </span>
              <span className="bp-cmd-en">ARCANA</span>
            </button>
          )}
        </div>
      )}
      {!beaten && !showingChaos && !inAccident && skillOpen && (
        <div className="bp-tray" data-testid="bp-skill-tray">
          <button className="bp-tray-item" data-testid="bp-skill-guard" onClick={() => command('DEFEND')}>
            身構える
            <span className="bp-tray-sub">受けるダメージを半分にする</span>
          </button>
          <p className="bp-tray-empty">このさきに覚えるものが入ります。</p>
        </div>
      )}
      {/* Which memory. One today; the list is built from the book, so a
          hundred of them cost this screen nothing. */}
      {!beaten && !showingChaos && !inAccident && arcanaTrayOpen && (
        <div className="bp-tray" data-testid="bp-arcana-tray">
          {completeArcana.map((entry) => (
            <button
              key={entry.arcanaId}
              className="bp-tray-item"
              data-testid={`bp-arcana-${entry.arcanaId}`}
              onClick={() => {
                if (spent.includes(entry.arcanaId) || spent.length >= SUMMON_CONFIG.usesPerBattle) return;
                setArcanaTrayOpen(false);
                setSpent((used) => [...used, entry.arcanaId]);
                callArcana(entry, 'COMPLETE');
              }}
            >
              {entry.name}
              <span className="bp-tray-sub">
                《{entry.ability.name}》 — {entry.completeLine}
              </span>
            </button>
          ))}
        </div>
      )}

      {downed && finishesInMugenChoice && !inAccident && (
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

      {downed && !finishesInMugenChoice && !inAccident && (
        <div className="bp-commands">
          <button className="bp-cmd wide" data-testid="bp-normal-end" onClick={onNormalEnd}>
            <span className="bp-cmd-jp">森へ戻る</span>
          </button>
        </div>
      )}
    </div>
  );
}
