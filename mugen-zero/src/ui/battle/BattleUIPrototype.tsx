import { useEffect, useRef, useState } from 'react';
import {
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
  type EnemyAction,
} from '../../game/battle/battleLogic';
import { castMagic, clearAwakeningLines } from '../../game/battle/battleLogic';
import { availableMagic } from '../../core/magic/magic';
import { MAGIC_DEFS } from '../../content/magic/magicDefs';
import { decideTurn, magicBlocked } from '../../game/battle/magicChoice';
import {
  DEFAULT_BATTLE_SPEED,
  beatMs,
  visualMs,
  nextSpeed,
  speedLabel,
  type BattleSpeed,
} from '../../game/battle/battleSpeed';
import { MagicTray } from './MagicTray';
import { AwakeningScene } from './AwakeningScene';
import { spriteHeight } from '../../content/art/spriteFrames';
import {
  cameraStyle,
  swingCues,
  CAMERA_GLIDE_MS,
  type CameraPhase,
} from './battleCamera';
import type { EnemySpeciesDef } from '../../content/enemies/species';
import { partyArtFor } from '../../content/art';
import { enemyPose, heroPose, kaosPose } from '../../game/battle/battleArtState';
import { CharacterArt } from '../art/CharacterArt';
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
import { PartyCard, PartyHud, Readout, TurnOrder, WorldMemoryPanel, Meter } from './BattleHud';
import {
  actingSideOf,
  memoryDepth,
  memoryRows,
  turnOrderLine,
  type TurnActor,
} from './battleHud';
import { FIELD_FIGURE_SCALE } from './formation';
import { creatureOpponent, type BattleOpponent } from './opponent';
import { locationNameOf } from '../../content/locations/alden';
import { BATTLE_UI } from '../../assets/manifest';

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

interface Props {
  /**
   * WHO IS BEING FOUGHT. A creature by default, because the forest
   * fight is one — but the type is `BattleOpponent`, which a person is
   * too. The fight this slice is built to arrive at is against a man,
   * and a screen that could only be handed a species could never show
   * him without somebody making him into one.
   */
  species: EnemySpeciesDef;
  /** Somebody other than a creature. Overrides `species` when given. */
  opponent?: BattleOpponent;
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
  /**
   * Whether Kaos has already reached past what she was doing.
   *
   * Read from WORLD MEMORY by the caller rather than decided here: she
   * learned it in the fight with Gald and did not forget it afterwards.
   */
  magicUnlocked?: boolean;
  /** An ordinary fight, over. */
  onNormalEnd: () => void;
  /** The other kind. The choice is real and is recorded by the caller. */
  onMugenChoice: (choice: LifeChoiceId) => void;
  onDefeat: () => void;
  /**
   * The fight is left rather than finished.
   *
   * Running away is not losing and is not winning: nothing is recorded,
   * no life is decided about, and the creature is still out there. The
   * caller puts the player back where they came from and writes
   * nothing down. Absent means this fight cannot be left, and the
   * command is not drawn.
   */
  onEscape?: () => void;
  /**
   * What this world already remembers, in its own words, oldest first.
   *
   * Handed in rather than read: the battle screen must not open WORLD
   * MEMORY any more than it opens the book. Empty is a perfectly good
   * answer and the corner panel says so, in question marks.
   */
  memoryLines?: readonly string[];
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

/**
 * One word for the state a creature has got itself into.
 *
 * A label on a bar rather than a line anybody says — the creature's own
 * words for the same moment are in content, where its voice lives.
 */
const PHASE_WORD: Record<string, string> = {
  WARY: '警戒',
  CORNERED: '必死',
  SERIOUS: '本気',
  DESPERATE: '死に物狂い',
};

/** How long each moment of the fight is held on screen. */
const BEAT_MS: Record<string, number> = {
  STRIKE: 320,
  TACKLE: 460,
  HIDE: 560,
  HURT: 300,
  // Hers: a moment for the light to gather and reach across the field.
  // Short, like the rest of them. A spell that stops the fight for two
  // seconds every time it is cast is a spell people stop casting.
  MAGIC: 520,
};

/**
 * And the shortest each can become before it stops being watchable.
 *
 * A beat is not a wait. The player is looking at a sword going in or a
 * creature landing on them, and halving that past a point does not make
 * the fight quicker to follow — it removes the part they were
 * following. These are the floors `visualMs` holds the line at.
 */
const BEAT_MIN_MS: Record<string, number> = {
  STRIKE: 110,
  TACKLE: 140,
  HIDE: 140,
  HURT: 140,
  MAGIC: 140,
};

/**
 * A beat's length on screen at this speed — the timer AND the drawing.
 *
 * ONE NUMBER FOR BOTH, which is the whole of the ×2 fix. The beat and
 * the animation of it were two halves of one motion and only the timer
 * half knew about speed, so at ×2 the class came off at 53% and every
 * character teleported back to its mark mid-swing. The creature's
 * tackle was cut 61 pixels short of landing. What the stylesheet draws
 * now lasts exactly as long as what this schedules, at every speed,
 * because it is handed this number.
 */
function cameraGlideMs(speed: BattleSpeed): number {
  // Floored like the beats, and for the same reason: a lean that
  // arrives in 60ms has not arrived, it has appeared. `visualMs` will
  // not stretch it past the 120ms it is authored at, so ×1 is untouched.
  return visualMs(CAMERA_GLIDE_MS, speed, CAMERA_GLIDE_MS);
}

function beatLength(step: string, speed: BattleSpeed): number {
  return visualMs(BEAT_MS[step] ?? 300, speed, BEAT_MIN_MS[step] ?? 140);
}

/**
 * How long it takes to go down.
 *
 * Short. Long enough that the creature is seen to fall rather than to
 * blink into a different picture, and no longer — being made to wait is
 * not the same as being moved. Nothing is asked of the player until it
 * has finished falling, so the picture and the question never disagree.
 */
const KNOCKDOWN_MS = 340;

/** How long a lost fight sits before the screen moves on. */
const DEFEAT_WAIT_MS = 1200;

/**
 * How long AUTO waits after the theatre has finished before it acts.
 *
 * Long enough that a watched fight still reads as a fight rather than
 * as a log scrolling past. The same numbers the old screen uses — this
 * is a second SCREEN with AUTO on it, not a second AUTO.
 */
const AUTO_GAP_MS = 550;
/** And how long it leaves the awakening on screen before moving on. */
const AUTO_READ_MS = 2200;

/**
 * How long her moment lasts before the fight starts.
 *
 * A remark and a name, not a scene. Long enough to read, short enough
 * that a player who has seen it forty times is not waiting on it — and
 * it can be tapped away.
 */
const CHAOS_BEAT_MS = 1800;
/**
 * And the shortest it may become at speed.
 *
 * NOT SIMPLY HALVED. This is her moment — a remark and a name, the one
 * beat of the fight that is about somebody rather than about damage —
 * and 900ms is not a faster version of that, it is a version nobody
 * finishes reading. Twelve hundred is the floor a player at ×2 still
 * gets to hear her in.
 */
const CHAOS_MIN_MS = 1200;

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
  opponent: given,
  battleLocationId,
  finishesInMugenChoice,
  startFinishable = false,
  forcedEnemyAction = null,
  magicUnlocked = false,
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
  onEscape,
  memoryLines = [],
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
  /** Settled once: the fight cannot change who it is against. */
  const [opponent] = useState<BattleOpponent>(() => given ?? creatureOpponent(species));
  const [battle, setBattle] = useState<BattleState>(() => {
    const fresh = createBattle(opponent.spec, modifiersOf(chaos), {
      // Whether she can already do this is the world's business, not
      // this fight's: she learned it somewhere else and did not forget.
      magicUnlocked,
    });
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
   * Where the fight is looking.
   *
   * Presentation, like `beat` beside it and like nothing else on this
   * screen: it moves where people are DRAWN and reads nothing about the
   * fight. IDLE is the formation exactly as written, so a turn nobody
   * is taking looks like it always did.
   */
  const [camera, setCamera] = useState<CameraPhase>('IDLE');
  /**
   * NORMAL while it is fighting; DOWNED once it is beaten.
   *
   * DOWNED is not dead. It is a creature lying in the grass that the
   * player is about to decide about, and it stays on the battlefield
   * through the whole of that decision.
   */
  const [stance, setStance] = useState<'NORMAL' | 'DOWNED'>('NORMAL');
  const [skillOpen, setSkillOpen] = useState(false);
  /**
   * The bag, which is empty and says so.
   *
   * アイテム is a command the fight has to have: a player who cannot
   * find it assumes the game has no items rather than that they have
   * none. What it must not be is a fake inventory — so it opens, it is
   * honest about being empty, and the day a bag exists it is handed in
   * exactly where this tray already is.
   */
  const [itemOpen, setItemOpen] = useState(false);
  const [magicOpen, setMagicOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  /**
   * ×1 or ×2, and the structure holds ×3 the day somebody wants it.
   *
   * PRESENTATION ONLY. It reaches `beatMs` and the `--fx` custom
   * property and nothing else — the battle itself imports nothing about
   * speed and plays the same fight blow for blow at every one, which is
   * a test rather than a promise (battleReadiness.test.ts).
   */
  const [speed, setSpeed] = useState<BattleSpeed>(DEFAULT_BATTLE_SPEED);
  /**
   * Whether an unattended player is taking the turns.
   *
   * It presses the same three commands a thumb does — see the effect
   * below. There is no path from AUTO into the battle that the command
   * row does not also take.
   */
  const [auto, setAuto] = useState(false);
  const timers = useRef<number[]>([]);
  /** When the theatre currently on screen finishes, in epoch ms. */
  const busyUntil = useRef(0);
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

  /**
   * THE RETURN GUARANTEE.
   *
   * A turn that runs to the end returns by itself — the last cue of
   * every track is IDLE, so the camera cannot finish anywhere but the
   * formation. This is for the turns that do NOT run to the end.
   *
   * A fight that is won or lost, her moment beginning, an accident
   * crossing the field: each of them takes the screen away mid-swing,
   * and a phase left behind would hold the party in a lean nobody threw.
   * Unmounting is covered by the line above, which drops every timer the
   * camera's cues are scheduled in; a new turn is covered by `play`,
   * which clears them before it schedules its own.
   */
  useEffect(() => {
    if (battle.outcome !== 'ONGOING' || showingChaos || accidentBeat !== 'NONE') setCamera('IDLE');
  }, [battle.outcome, showingChaos, accidentBeat]);

  useEffect(() => {
    if (!showingChaos) return;
    const t = setTimeout(() => setShowingChaos(false), visualMs(CHAOS_BEAT_MS, speed, CHAOS_MIN_MS));
    return () => clearTimeout(t);
  }, [showingChaos, speed]);

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
      // A wait, not a motion: nothing is moving, so ×2 may shorten it.
      const t = setTimeout(onDefeat, beatMs(DEFEAT_WAIT_MS, speed));
      return () => clearTimeout(t);
    }
    if (battle.outcome === 'VICTORY' && stance === 'NORMAL') {
      // It goes down first, and only then is anything asked.
      const t = setTimeout(() => setStance('DOWNED'), beatMs(KNOCKDOWN_MS, speed));
      return () => clearTimeout(t);
    }
  }, [battle.outcome, stance, onDefeat, speed]);

  /**
   * The theatre for one turn — and, when the turn is a swing, the camera
   * that films it.
   *
   * ONE TIMELINE. The camera's cues are scheduled from the same loop,
   * with the same `beatMs`, into the same `timers` array that the beats
   * use, so there is nothing here for a second timing system to drift
   * against: cancelling the theatre cancels the camera, and twice speed
   * halves both because it halved the numbers they are both built from.
   *
   * `filming` is the slot doing the acting, or null for a turn the
   * camera has not been taught yet — guarding, magic, a summon. Those
   * play exactly as they did, with the field at rest.
   */
  const play = (sequence: string[], filming: 'hero' | null = null) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    let at = 0;
    let firstBeatMs = 0;
    for (const step of sequence) {
      const delay = at;
      timers.current.push(window.setTimeout(() => setBeat(step), delay));
      const held = beatLength(step, speed);
      if (delay === 0) firstBeatMs = held;
      at += held;
    }
    timers.current.push(window.setTimeout(() => setBeat('NONE'), at));
    // What AUTO waits for. A person waits for the same thing.
    busyUntil.current = Date.now() + at;

    if (filming === null) {
      // Not a shot this camera knows. Whatever it was doing, it stops
      // doing it here rather than holding the last phase of the last
      // turn over a turn it is not filming.
      setCamera('IDLE');
      return;
    }
    for (const cue of swingCues(firstBeatMs, at, cameraGlideMs(speed))) {
      timers.current.push(window.setTimeout(() => setCamera(cue.phase), cue.at));
    }
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
    // A fight that is over cannot be called into. `mendPlayer` already
    // hands a finished fight straight back, so the state was safe — but
    // the two lines below are this screen's own and would have put a
    // creature on the field and a plate of its words over a fight
    // nobody is fighting. `command` and `cast` have refused this way
    // since they were written; this is the one that did not.
    if (battle.outcome !== 'ONGOING') return;
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
    setItemOpen(false);
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
    // One case, filmed: an ordinary swing. Guarding plays as it always
    // has, with the field at rest, until somebody asks for its own shot.
    play([kind === 'ATTACK' ? 'STRIKE' : 'GUARD', ...answerOf(next)], kind === 'ATTACK' ? 'hero' : null);
  };

  /**
   * She casts, and that is the turn.
   *
   * The same shape as `command` above on purpose: it ends the player's
   * action, hands the creature its turn, and plays one beat. There is
   * no path through here that also swings.
   */
  const cast = (id: string) => {
    if (battle.outcome !== 'ONGOING') return;
    const magic = spells.find((m) => m.id === id);
    if (!magic || magicBlocked(battle, magic) !== null) return;
    setMagicOpen(false);
    setSaid(null);
    const next = castMagic(battle, magic, undefined, forcedEnemyAction);
    setBattle(next);
    if (next.lastEnemyAction === 'ATTACK') observe('OBSERVE_NORMAL_ATTACK');
    if (next.lastEnemyAction === 'SKILL') observe('OBSERVE_UNIQUE_SKILL');
    if (next.outcome === 'VICTORY') observe('WON_A_FIGHT');
    if (next.outcome === 'DEFEAT') observe('LOST_A_FIGHT');
    play(['MAGIC', ...answerOf(next)]);
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
  /**
   * Which picture of each of them belongs to this moment.
   *
   * The battle asks for the pose the moment deserves and the art layer
   * answers with the nearest thing that has been drawn. Today the moss
   * rabbit has two pictures, so 'attack' and 'damage' both come back as
   * the standing one and the field looks exactly as it did — but the
   * asking is real, and a drawn attack pose appears here the day it is
   * added to content/art, with no change to this screen.
   */
  const spells = availableMagic(MAGIC_DEFS, { awakened: battle.magicUnlocked });
  const view = { beat, downed };
  const enemyShown = opponent.artFor(enemyPose(view));
  const heroShown = partyArtFor('hero', heroPose(view));
  const kaosShown = partyArtFor('kaos', kaosPose(view));
  // It is only lying down on screen if a picture of it lying down
  // exists; otherwise it stays standing rather than being drawn in a
  // pose that means something else.
  const showingDown = downed && enemyShown.state === 'down';
  /** The fight itself is suspended while any of it is happening. */
  const inAccident = accidentBeat !== 'NONE';

  /**
   * AUTO, which is one timer and no second battle.
   *
   * When it is on and nothing is playing, it asks `decideTurn` what to
   * do with the turn and presses the command a player would have
   * pressed. It reads the same state, the same spells and the same
   * power, and it cannot do anything the player could not: every path
   * out of here goes through `command` or `cast` — the two functions
   * the three buttons call.
   *
   * Deliberately does nothing while Kaos is intervening, while an
   * accident is crossing, or while the awakening is on screen: those
   * are moments the fight is paused for, and an unattended player
   * should watch them exactly as a person does.
   *
   * Turning it off clears this timer and nothing else, so the very next
   * tap is a hand-played turn.
   */
  useEffect(() => {
    if (!auto || battle.outcome !== 'ONGOING') return;
    if (showingChaos || inAccident || battle.awakeningLines.length > 0) return;
    const wait = Math.max(0, busyUntil.current - Date.now()) + beatMs(AUTO_GAP_MS, speed);
    const t = window.setTimeout(() => {
      const plan = decideTurn(battle, spells);
      if (plan.action === 'MAGIC' && plan.magicId !== null) cast(plan.magicId);
      else if (plan.action === 'GUARD') command('DEFEND');
      else command('ATTACK');
    }, wait);
    return () => clearTimeout(t);
    // `spells`, `cast` and `command` are rebuilt every render and all
    // of them read the same `battle` this effect already watches.
    // Listing them would clear and re-arm the timer on every repaint —
    // including the several this screen does while a blow is playing —
    // and AUTO would never reach the end of its own wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, battle, speed, showingChaos, inAccident]);
  const backdrop = locationBackground(battleLocationId);
  const lastLine = battle.log[battle.log.length - 1];
  /**
   * Their sizes, as a share of the battlefield.
   *
   * Not worked out here: every number lives in content/art/spriteFrames
   * and is read by every screen that draws somebody standing in a
   * place, so a moss rabbit is the same moss rabbit on this screen and
   * on the story one. What this screen decides is WHO is on the field;
   * how big they are is a fact about them.
   *
   * The one thing this screen does say is how big the FIELD is, and
   * that changed: it was a band between two rows of numbers and is now
   * the whole screen, so the same share draws a half again bigger
   * person. `FIELD_FIGURE_SCALE` converts a share of the old field into
   * a share of the new one — and sits a shade under the ratio, which is
   * the "a little smaller, with ground between them" the overhaul asks
   * for and the room three and four of them will stand in.
   */
  const figure = (id: string, state: string | null) =>
    Math.round(spriteHeight(id, state, stageH) * FIELD_FIGURE_SCALE);
  const stage = {
    enemy: figure(opponent.artId, enemyShown.state),
    hero: figure('hero', heroShown.state),
    kaos: figure('kaos', kaosShown.state),
    summon: figure('arcana_summon', null),
  };

  /**
   * WHO TAKES TURNS, and who is taking one now.
   *
   * Two today, and the strip is built from the list rather than drawn
   * for two: a party of three plus a creature is a longer roster and no
   * change here. Kaos is not in it — she acts on the fight without
   * holding a place in its order — so she is in the party column and
   * not in this line, which is the truth about how the fight runs.
   */
  const turnRoster: TurnActor[] = [
    { id: 'hero', name: 'あなた', side: 'ALLY' },
    { id: opponent.artId, name: battle.enemyName, side: 'ENEMY' },
  ];
  const actingSide = actingSideOf(beat === 'NONE' ? null : beat);
  const turnSlots = turnOrderLine(
    turnRoster,
    turnRoster.findIndex((a) => a.side === actingSide),
    5,
  );
  const turnArtOf = (actorId: string) =>
    actorId === 'hero' ? heroShown : actorId === 'kaos' ? kaosShown : enemyShown;
  const memoryDepthNow = memoryDepth(arcana);
  const memoryPanelRows = memoryRows(memoryLines);
  const placeName = locationNameOf(battleLocationId);
  const placeMark = battleLocationId.replace(/_/g, ' ');

  /**
   * The pack's own pieces, as CSS variables.
   *
   * One object, built once, so the stylesheet can say
   * `border-image-source: var(--ui-enemy-plate)` and never learn a path.
   */
  const uiVars: Record<string, string> = {
    '--ui-enemy-plate': `url(${BATTLE_UI.enemyPlate})`,
    '--ui-party-card': `url(${BATTLE_UI.partyCard})`,
    '--ui-message': `url(${BATTLE_UI.messageWindow})`,
    '--ui-memory': `url(${BATTLE_UI.memoryPanel})`,
    '--ui-memory-star': `url(${BATTLE_UI.memoryStar})`,
    '--ui-diamond': `url(${BATTLE_UI.commandDiamond})`,
    '--ui-turn-slot': `url(${BATTLE_UI.turnSlot})`,
    '--ui-turn-next': `url(${BATTLE_UI.turnNext})`,
    '--ui-bar-rail': `url(${BATTLE_UI.barRail})`,
    '--ui-bar-hp': `url(${BATTLE_UI.barHp})`,
    '--ui-bar-mp': `url(${BATTLE_UI.barMp})`,
    '--ui-auto-on': `url(${BATTLE_UI.autoOn})`,
    '--ui-auto-off': `url(${BATTLE_UI.autoOff})`,
    '--ui-speed-on': `url(${BATTLE_UI.speedOn})`,
    '--ui-speed-off': `url(${BATTLE_UI.speedOff})`,
    '--ui-escape-on': `url(${BATTLE_UI.escapeOn})`,
    '--ui-escape-off': `url(${BATTLE_UI.escapeOff})`,
  };

  /** Leaving. Only while there is a fight to leave. */
  const escape = () => {
    if (battle.outcome !== 'ONGOING' || !onEscape) return;
    setAuto(false);
    onEscape();
  };

  return (
    <div
      className="screen bp-screen bp-field"
      data-testid="battle-prototype"
      // Every spell effect reads its own duration from --fx, so at twice
      // speed the whole lot is half as long and not one of the CSS rules
      // has had to learn what speed is.
      style={{
        ['--fx' as string]: String(1 / speed),
        // How long a camera move takes to be seen. Owned by
        // battleCamera and scaled like every other duration here, so
        // the stylesheet never learns a number or a speed.
        ['--bp-cam' as string]: `${cameraGlideMs(speed)}ms`,
        // And how long each beat's drawing lasts, which MUST be how long
        // its class is on the element. The stylesheet reads these rather
        // than holding durations of its own; while it held its own, ×2
        // took the class off at 53% and every motion snapped to its mark.
        ['--bp-strike' as string]: `${beatLength('STRIKE', speed)}ms`,
        ['--bp-tackle' as string]: `${beatLength('TACKLE', speed)}ms`,
        ['--bp-hide' as string]: `${beatLength('HIDE', speed)}ms`,
        ['--bp-hurt' as string]: `${beatLength('HURT', speed)}ms`,
        ['--bp-fall' as string]: `${beatMs(KNOCKDOWN_MS, speed)}ms`,
        // THE DELIVERED UI, handed to the stylesheet as urls.
        //
        // Through here rather than written into styles.css, for one
        // build reason: the single-file artifact swaps every asset for a
        // re-encoded copy by ALIASING THE IMPORT, and only a real import
        // goes through that. A `url()` written into the stylesheet would
        // be a second path to the same picture and the one the artifact
        // does not know how to shrink.
        ...uiVars,
      }}
    >
      {/* She steps forward. Over the fight, which stays exactly where it
          was: nobody has taken a turn for this. */}
      {battle.awakeningLines.length > 0 && (
        <AwakeningScene
          lines={battle.awakeningLines}
          // While nobody is watching, it reads itself at a reading pace
          // rather than waiting for a tap that is not coming.
          advanceMs={auto ? beatMs(AUTO_READ_MS, speed) : undefined}
          onDone={() => setBattle((b) => clearAwakeningLines(b))}
        />
      )}
      {/* 1. THE BATTLEFIELD, which is now the screen.
             It used to be the middle of three bands, with the numbers
             above it and the commands below. It is the whole surface
             now and everything that has to be read is laid into the
             corners of it — so the fight is what the player is looking
             at, and the reading happens at the edges of their eye. */}
      <div
        className={`bp-stage${accidentStageClass(accidentBeat)}`}
        ref={stageRef}
        data-accident={accidentBeat === 'NONE' ? undefined : accidentBeat}
        // What the camera is doing, for the one CSS rule that needs to
        // know: positions are only allowed to glide while it is working.
        // At rest they snap, which is how the creature has always
        // dropped into the grass when it is beaten.
        data-camera={camera}
      >
        {backdrop && <img className="bp-bg" src={backdrop} alt="" aria-hidden="true" />}

        {/* 2. The creature: left, and further up the path than they are,
               which is what makes the ground between them a distance. */}
        <div
          className={[
            'bp-actor bp-enemy',
            beat === 'TACKLE' ? 'tackle' : '',
            beat === 'HIDE' ? 'hide' : '',
            beat === 'STRIKE' || beat === 'MAGIC' ? 'struck' : '',
            beaten && !showingDown ? 'falling' : '',
            showingDown ? 'downed' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={cameraStyle(
            opponent.stands === 'NEAR'
              ? showingDown
                ? 'enemyNearDowned'
                : 'enemyNear'
              : showingDown
                ? 'enemyDowned'
                : 'enemy',
            camera,
          )}
          data-testid={showingDown ? 'bp-enemy-downed' : 'bp-enemy-normal'}
        >
          <span className="bp-shadow" aria-hidden="true" />
          {showingChaos && chaos?.target === 'ENEMY' && (
            <span className="bp-chaos-mark debuff" aria-hidden="true" />
          )}
          <CharacterArt
            art={enemyShown}
            height={stage.enemy}
            className="bp-art"
            // Enemies look across the field at the party.
            face="right"
            label={opponent.name}
            testId="bp-enemy-art"
          />
          {beat === 'HIDE' && <span className="bp-moss" aria-hidden="true" />}
          {/* Where her star lands. Drawn on the creature rather than
              flown across the field: a travelling projectile is a
              second timing system, and this one is 520ms long. */}
          {beat === 'MAGIC' && <span className="bp-star-hit" aria-hidden="true" />}
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
            showingChaos || beat === 'MAGIC' ? 'casting' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={cameraStyle('kaos', camera)}
        >
          <span className="bp-shadow" aria-hidden="true" />
          {(showingChaos || beat === 'MAGIC') && (
            <span className="bp-chaos-aura" aria-hidden="true" />
          )}
          <CharacterArt
            art={kaosShown}
            height={stage.kaos}
            className="bp-art"
            face="left"
            label="ケイオス"
            testId="bp-kaos-art"
          />
        </div>
        <div
          className={`bp-actor bp-hero${beat === 'STRIKE' ? ' strike' : ''}${beat === 'HURT' ? ' hurt' : ''}`}
          style={cameraStyle('hero', camera)}
        >
          <span className="bp-shadow" aria-hidden="true" />
          {showingChaos && chaos?.target === 'PLAYER' && (
            <span className="bp-chaos-mark buff" aria-hidden="true" />
          )}
          <CharacterArt
            art={heroShown}
            height={stage.hero}
            className="bp-art"
            // The party looks across the field at the enemy.
            face="left"
            label="あなた"
            testId="bp-hero-art"
          />
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
            style={cameraStyle('summon', camera)}
            data-testid="bp-summoned"
            data-arcana={summoned.arcana.arcanaId}
            data-kind={summoned.kind}
          >
            <span className="bp-shadow" aria-hidden="true" />
            <span className="bp-summon-ring" aria-hidden="true" />
            <span className="bp-summon-tag">ARCANA</span>
            <CharacterArt
              art={{
                asset: { src: summoned.arcana.visual.src, box: summoned.arcana.visual.box },
                state: 'front',
                substituted: false,
                placeholder: false,
              }}
              height={stage.summon}
              className="bp-art"
              testId="bp-summon-art"
            />
          </div>
        )}

      </div>

      {/* 2. THE HUD — four corners over one field.
             Laid out as a grid whose middle cell is deliberately empty:
             that hole in the centre is the room an attack, a spell or a
             summon moves through, and it is reserved by the layout
             rather than left over by luck. Nothing in here takes a tap
             it was not given — the layer is transparent to the thumb
             and only the controls inside it are not. */}
      <div className="bp-hud" data-testid="bp-hud">
        {/* LEFT TOP — the order, then who you are fighting. No logo:
            a brand mark in the corner of a fight is the one thing on
            this screen that tells the player nothing. */}
        <div className="bx-corner bx-tl">
          <TurnOrder slots={turnSlots} artOf={turnArtOf} />
          <div className="bx-enemy-plate" data-testid="bp-enemy-hp">
            <span className="bx-enemy-head">
              <b className="bx-enemy-name">{battle.enemyName}</b>
              {/* What it has become on the way down. One word, in its
                  own colour, so a phase is something the player SEES
                  rather than a line they may have tapped past. */}
              {battle.enemyPhaseId && (
                <i className="bp-phase" data-testid="bp-enemy-phase">
                  {PHASE_WORD[battle.enemyPhaseId] ?? battle.enemyPhaseId}
                </i>
              )}
              <Readout
                now={battle.enemyHp}
                max={battle.enemyMaxHp}
                className="bx-enemy-read"
              />
            </span>
            <Meter kind="enemy-hp" now={battle.enemyHp} max={battle.enemyMaxHp} bare>
              {/* Its footing, under its health: the thing to aim at in
                  the middle of a fight. Only drawn for creatures that
                  have any. */}
              {battle.enemyMaxPoise > 0 && (
                <span
                  className={`bp-poise${battle.enemyStaggerTurns > 0 ? ' broken' : ''}`}
                  data-testid="bp-enemy-poise"
                  data-broken={battle.enemyStaggerTurns > 0 ? 'yes' : undefined}
                  style={{
                    width: `${(battle.enemyPoise / battle.enemyMaxPoise) * 100}%`,
                  }}
                />
              )}
            </Meter>
          </div>
        </div>

        {/* RIGHT TOP — where this is, and who is standing with you. */}
        <div className="bx-corner bx-tr">
          <div className="bx-place" data-testid="bx-place">
            <b>{placeMark}</b>
            <i>{placeName}</i>
          </div>
          <PartyHud>
            {/* His health is what the fight keeps; the magic is hers.
                Each card carries the one it has and says 「—」 on the
                other, which is the truth until B-2 splits the pools. */}
            <PartyCard
              name="あなた"
              role="剣"
              art={heroShown}
              hp={{ now: battle.playerHp, max: battle.playerMaxHp, testId: 'bp-player-hp' }}
              mp={{ now: null, max: null }}
              testId="bx-member-hero"
            />
            <PartyCard
              name="ケイオス"
              role="魔法"
              art={kaosShown}
              hp={{ now: null, max: null }}
              mp={
                battle.magicUnlocked
                  ? { now: battle.playerMp, max: battle.playerMaxMp, testId: 'bx-kaos-mp' }
                  : { now: null, max: null }
              }
              testId="bx-member-kaos"
            />
          </PartyHud>
        </div>

        {/* LEFT BOTTOM — what the world has written down so far. */}
        <div className="bx-corner bx-bl">
          <WorldMemoryPanel rows={memoryPanelRows} depth={memoryDepthNow} />
        </div>

        {/* RIGHT BOTTOM — how the fight is WATCHED, and the way out.
            Never a turn, so never in the command row: a thumb going
            for 攻撃 must not be able to land on 逃走. */}
        <div className="bx-corner bx-br">
          <div className="bp-modes" data-testid="bp-modes">
            <button
              className={`bp-mode bp-auto-chip${auto ? ' on' : ''}`}
              data-testid="bp-auto"
              aria-pressed={auto}
              onClick={() => setAuto((on) => !on)}
            >
              {/* ON is said as well as painted. A filled chip carries it
                  for a player looking at the screen; the word carries it
                  for one glancing at it, and the brief asks for the state
                  to be unmistakable rather than merely present. */}
              <span className="bp-mode-en">{auto ? 'AUTO ON' : 'AUTO'}</span>
              <span className="bp-mode-jp">オート</span>
            </button>
            <button
              className={`bp-mode bp-speed-chip${speed > 1 ? ' on' : ''}`}
              data-testid="bp-speed"
              data-speed={speed}
              aria-label={`速度 ${speedLabel(speed)}`}
              onClick={() => setSpeed((at) => nextSpeed(at))}
            >
              <span className="bp-mode-en">{speedLabel(speed)}</span>
              <span className="bp-mode-jp">倍速</span>
            </button>
            {onEscape && (
              <button
                className="bp-mode bp-escape"
                data-testid="bp-escape"
                disabled={battle.outcome !== 'ONGOING'}
                onClick={escape}
              >
                <span className="bp-mode-en">ESCAPE</span>
                <span className="bp-mode-jp">逃走</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. THE DOCK — the bottom centre strip.
             What is being said, what can be chosen, and the commands
             themselves, in one column at the foot of the field. It is
             the narrow thing at the bottom of the picture rather than a
             band the field has to make room for, and it is the place
             her moment takes over when she has one. */}
      <div className="bp-dock">
        {/* Still in force. One chip, so a player who tapped past her
            moment can still see that something is helping. */}
        {chaos && !showingChaos && battle.outcome === 'ONGOING' && (
          <p className={`bp-chaos-badge ${chaos.category.toLowerCase()}`} data-testid="bp-chaos-badge">
            《{chaos.name}》
          </p>
        )}


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
                  {beaten && !finishesInMugenChoice && !inAccident ? opponent.defeatedText : lastLine}
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

        {/* 6. Fighting, and then — separately — deciding.

               Five commands and a diamond each, in the bottom centre:
               the shape is the house's, and the row is centred because
               it is the thing the player's thumb goes to and the two
               corners beside it are things they only read. 防御 is one
               of the five now rather than an item inside スキル — a
               guard is a turn, and a turn belongs on the row of turns.
               ARCANA joins them only when the book has a finished page,
               because a command that is never available is furniture. */}
        {!beaten && !showingChaos && !inAccident && (
          <div className="bp-commands" data-testid="bp-commands">
            <button className="bp-cmd" data-testid="bp-attack" onClick={() => command('ATTACK')}>
              <span className="bp-cmd-plate" aria-hidden="true" />
              <SwordIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">攻撃</span>
              <span className="bp-cmd-en">ATTACK</span>
            </button>
            {/* Hers. Only once she can, and never as an extra swing:
                picking a spell IS this turn. */}
            {battle.magicUnlocked && (
              <button
                className={magicOpen ? 'bp-cmd open' : 'bp-cmd'}
                data-testid="bp-magic"
                aria-expanded={magicOpen}
                onClick={() => {
                  setSkillOpen(false);
                  setItemOpen(false);
                  setArcanaTrayOpen(false);
                  setMagicOpen((open) => !open);
                }}
              >
                <span className="bp-cmd-plate" aria-hidden="true" />
                <SparkIcon size={15} className="bp-cmd-mark" />
                <span className="bp-cmd-jp">魔法</span>
                <span className="bp-cmd-en" data-testid="bp-mp">
                  MP {battle.playerMp}
                </span>
              </button>
            )}
            <button
              className={skillOpen ? 'bp-cmd open' : 'bp-cmd'}
              data-testid="bp-skill"
              aria-expanded={skillOpen}
              onClick={() => {
                setMagicOpen(false);
                setItemOpen(false);
                setArcanaTrayOpen(false);
                setSkillOpen((open) => !open);
              }}
            >
              <span className="bp-cmd-plate" aria-hidden="true" />
              <SparkIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">スキル</span>
              <span className="bp-cmd-en">SKILL</span>
            </button>
            <button
              className={itemOpen ? 'bp-cmd open' : 'bp-cmd'}
              data-testid="bp-item"
              aria-expanded={itemOpen}
              onClick={() => {
                setMagicOpen(false);
                setSkillOpen(false);
                setArcanaTrayOpen(false);
                setItemOpen((open) => !open);
              }}
            >
              <span className="bp-cmd-plate" aria-hidden="true" />
              <LeafIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">アイテム</span>
              <span className="bp-cmd-en">ITEM</span>
            </button>
            <button className="bp-cmd" data-testid="bp-defend" onClick={() => command('DEFEND')}>
              <span className="bp-cmd-plate" aria-hidden="true" />
              <CageIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">防御</span>
              <span className="bp-cmd-en">DEFEND</span>
            </button>
            {/* A finished memory is the player's to spend, so it is a
                command and not something that happens to them. */}
            {completeArcana.length > 0 && (
              <button
                className={`bp-cmd arcana${arcanaTrayOpen ? ' open' : ''}`}
                data-testid="bp-arcana"
                aria-expanded={arcanaTrayOpen}
                disabled={spent.length >= SUMMON_CONFIG.usesPerBattle}
                onClick={() => {
                  setSkillOpen(false);
                  setItemOpen(false);
                  setMagicOpen(false);
                  setArcanaTrayOpen((open) => !open);
                }}
              >
                <span className="bp-cmd-plate" aria-hidden="true" />
                <Ornament kind="ring" size={14} className="bp-cmd-mark" />
                <span className="bp-cmd-jp">記憶</span>
                <span className="bp-cmd-en">ARCANA</span>
              </button>
            )}
          </div>
        )}
        {/* Spent, and said outside the diamond: the note is a sentence
            and a diamond is not a place to read one. */}
        {!beaten && !showingChaos && !inAccident && completeArcana.length > 0 &&
          spent.length >= SUMMON_CONFIG.usesPerBattle && (
            <p className="bp-cmd-spent" data-testid="bp-arcana-spent">
              この戦いではもう呼べない
            </p>
          )}
        {!beaten && !showingChaos && !inAccident && magicOpen && (
          <MagicTray
            spells={spells}
            mp={battle.playerMp}
            onCast={cast}
            onClose={() => setMagicOpen(false)}
          />
        )}
        {/* SKILL is now genuinely what it says: the things this one
            learns. 身構える left it and became 防御 on the command row,
            where a turn belongs, so what is in here today is nothing —
            and the tray says so rather than pretending otherwise. */}
        {!beaten && !showingChaos && !inAccident && skillOpen && (
          <div className="bp-tray" data-testid="bp-skill-tray">
            <p className="bp-tray-empty">このさきに覚えるものが入ります。</p>
          </div>
        )}
        {/* And the bag, which is empty for the same honest reason. */}
        {!beaten && !showingChaos && !inAccident && itemOpen && (
          <div className="bp-tray" data-testid="bp-item-tray">
            <p className="bp-tray-empty">持ち物はまだない。</p>
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

      </div>

      {downed && finishesInMugenChoice && !inAccident && (
        <div className="bp-mugen" data-testid="bp-mugen-choice">
          {/* A different kind of moment, so a different ground under it:
              the fight's ivory gives way, and the question is asked in
              the dark. */}
          <p className="bp-mugen-line">{opponent.defeatedText}</p>
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
