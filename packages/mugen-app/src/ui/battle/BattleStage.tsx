import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { BattleState } from '@mugen/game/battle/battleLogic';
import { enemyPose, heroPose, kaosPose } from '@mugen/game/battle/battleArtState';
import {
  DEFAULT_BATTLE_SPEED,
  speedLabel,
  visualMs,
  type BattleSpeed,
} from '@mugen/game/battle/battleSpeed';
import type { MagicDef } from '@mugen/core/magic/magic';
import type { ItemStack } from '@mugen/core/economy/items';
import { spriteHeight } from '@mugen/content/art/spriteFrames';
import { locationNameOf } from '@mugen/content/locations/alden';
import type { LocationId } from '@mugen/content/locations/locationVisuals';
import { battleBackgroundFor } from '@mugen/content/locations/battleBackgrounds';
import type { BattleBackgroundKey } from '@mugen/assets/keys';
import { battleBackgroundArt } from '../../assets/battleBackground';
import { usePicture } from '../scene';
import { CharacterArt } from '../art/CharacterArt';
import { Ornament } from '../common/Ornament';
import { CageIcon, LeafIcon, SparkIcon, SwordIcon } from './BattleIcons';
import { Meter, PartyHud, Readout, TurnOrder, WorldMemoryPanel } from './BattleHud';
import { actingSideOf, displayName, memoryRows, turnOrderLine, type TurnActor } from './battleHud';
import { sayOf } from './battleMessage';
import { cameraStyle, type CameraPhase } from './battleCamera';
import { FIELD_FIGURE_SCALE, PROTOTYPE_PLACEMENTS, depthScale } from './formation';
import { stagecraftFor, stagecraftLevels } from './stagecraft';
import { latestOn, motionSlot, type Blow } from './blows';
import { HitFx } from './HitFx';
import { MagicTray } from './MagicTray';
import { ItemTray } from './ItemTray';
import { BattlePicker } from './BattlePicker';
import { SpellFx, type SpellFxView } from './magic/SpellFx';
import { SwordSlash, type SlashView } from './slash/SwordSlash';
import type { ReachView } from './battleTheatre';
import type { FieldBox, FieldMarks, FieldScene } from './fieldScene';
import './slash/reach.css';

/**
 * A spell's result sentence as two short lines: the spell ("《彗星撃》！")
 * and what it did ("モスラビットに30のダメージ。…"). The battle's own words,
 * cut where the name ends — nothing added, nothing reworded.
 */
function toldParts(line: string): [string, string] {
  const named = line.match(/^(《[^》]+》！?)\s*(.*)$/);
  return named ? [named[1], named[2]] : [line, ''];
}

/** How long a spell's result line holds before it fades, and its least at ×2. */
const TOLD_MS = 3200;
const TOLD_FLOOR_MS = 2200;
import { AwakeningScene } from './AwakeningScene';
import { HIT_FX_FLOOR_MS, HIT_FX_MS, theatreVars } from './battleTheatre';
import {
  AS_PERSON,
  BATTLE_UI_FRAMES,
  DOWN_POSE,
  battleEnemyArt,
  battlePartyArt,
} from './battleArt';
import './battle.generated.css';
import './battle.app.css';
import './battle.layers.css';

/**
 * THE ARTIFACT'S BATTLE SCREEN, DRAWN BY THE APP.
 *
 * The same markup, class names and stylesheet as the Artifact's
 * `BattleUIPrototype`, laid out by the same formation, camera and HUD
 * modules (copied, and held identical by `artifactCopies.test.ts`).
 *
 * IT DRAWS; IT DOES NOT DECIDE. It is handed a real `BattleState` from
 * the shared core and, while a turn is being shown, the theatre's beat,
 * camera and blows (`battleTheatre.ts`) — which are themselves read off
 * the core's states. Every number on it is the core's. Commands only
 * report a press; the screen that owns the fight decides what it means.
 *
 * NOT HERE, ON PURPOSE (later phases): cut-ins, skill-specific effects,
 * Kaos's interventions (《ケイオスの守護》), arcana summons, escaping,
 * AUTO. The spell's own light (her aura, the star that lands) is also
 * left out until the effects phase: a spell here is her casting pose and
 * the creature's flinch.
 */

export type BattleCommand = 'ATTACK' | 'SKILL' | 'DEFEND' | 'ARCANA';

export interface BattleOpponentView {
  /** Whose drawings: a creature's id, or 'gald' for a person. */
  artId: 'moss_rabbit' | 'gald';
  /** A creature stands up the path (FAR); a person at arm's length (NEAR). */
  stands: 'FAR' | 'NEAR';
  /** What is said over it once it is beaten, and by whom (a person only). */
  defeated?: { speaker?: string; text: string };
}

/** What is being shown of a turn right now — from `useBattleTheatre`. */
export interface TurnView {
  beat: string;
  camera: CameraPhase;
  blows: readonly Blow[];
  /** A turn is being shown: presses are ignored until it is over. */
  playing: boolean;
}

const AT_REST: TurnView = { beat: 'NONE', camera: 'IDLE', blows: [], playing: false };

export interface BattleStageProps {
  battle: BattleState;
  opponent: BattleOpponentView;
  locationId: LocationId;
  /**
   * The ground this fight is fought on. Absent: the place's own, from
   * content (content/locations/battleBackgrounds).
   */
  background?: BattleBackgroundKey | null;
  /** What the world remembers, newest last — the WORLD MEMORY panel. */
  memoryLines: readonly string[];
  /** How deep that memory runs, 0–100. */
  memoryDepth: number;
  /** Whether a finished arcana page exists — the ARCANA command's lock. */
  arcanaReady: boolean;
  turn?: TurnView;
  /** The creature has finished falling (after the knock-down beat). */
  downed?: boolean;
  /** An item's line on the plate, while it is being read. */
  say?: { name: string; line: string; result: string } | null;
  /**
   * WHAT A SPELL DID, IN ONE LINE — the battle's own result sentence
   * ("《彗星撃》！ モスラビットに30のダメージ。"), shown light and brief in
   * place of the plate: no frame, no flavour line.
   */
  told?: string | null;
  speed?: BattleSpeed;
  auto?: boolean;
  onCommand?: (command: BattleCommand) => void;
  /** Her spells. Absent, or before she can cast: no 魔法 command. */
  magic?: { spells: readonly MagicDef[]; onCast: (id: string) => void };
  /** The bag, as this fight can use it. */
  items?: { bag: readonly ItemStack[]; onUse: (itemId: string) => void };
  /** She steps forward — the awakening lines, and moving past them. */
  onAwakeningDone?: () => void;
  /**
   * A cut-in playing now (`useCutInDirector().element`), drawn over the
   * HUD and the commands (battle.layers.css). Null or absent: nothing.
   */
  cinematic?: ReactNode;
  /** Her aura or a spell's landing, while one shows (`useBattleTheatre().spell`). */
  spell?: SpellFxView | null;
  /** His sword's trail and bite, while a swing shows (`useBattleTheatre().slash`). */
  slash?: SlashView | null;
  /**
   * THE ENHANCED 攻撃 (v18 `playAttack`) is being drawn: he is wrapped so
   * he can walk to the creature and swing, and `reach` says where in that
   * he is (`useBattleTheatre().reach`). Off: the Artifact's swing, and his
   * drawing exactly as before.
   */
  swordplay?: boolean;
  reach?: ReachView | null;
  /**
   * A scene played on the field (fieldScene.ts) — somebody stepping in,
   * things arriving at the creature. Null or absent: nothing. Today only
   * the debug preview passes one.
   */
  scene?: FieldScene | null;
  /** Absent: no AUTO chip (AUTO is a later phase). */
  onToggleAuto?: () => void;
  onCycleSpeed?: () => void;
  /** Absent: no 逃走 chip. */
  onEscape?: () => void;
  /** The ♪ control, where this fight has one. */
  bgm?: { label: string; onCycle: () => void };
  testId?: string;
}

export function BattleStage({
  battle,
  opponent,
  locationId,
  background,
  memoryLines,
  memoryDepth,
  arcanaReady,
  turn = AT_REST,
  downed = false,
  say = null,
  told = null,
  speed = DEFAULT_BATTLE_SPEED,
  auto = false,
  onCommand,
  magic,
  items,
  onAwakeningDone,
  cinematic,
  spell = null,
  slash = null,
  swordplay = false,
  reach = null,
  scene = null,
  onToggleAuto,
  onCycleSpeed,
  onEscape,
  bgm,
  testId = 'battle-stage',
}: BattleStageProps) {
  const { beat, camera, blows, playing } = turn;
  const [magicOpen, setMagicOpen] = useState(false);
  const [skillOpen, setSkillOpen] = useState(false);
  const [itemOpen, setItemOpen] = useState(false);

  // HOW TALL THE FIELD IS ON THIS PHONE — measured, as in the Artifact,
  // because everybody standing in it is sized as a fraction of it.
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

  const beaten = battle.outcome === 'VICTORY';
  const ongoing = battle.outcome === 'ONGOING';
  const casting = beat === 'MAGIC';
  const awakened = battle.awakening !== null && battle.magicUnlocked;
  const view = { beat, downed, casting, awakened };
  const heroShown = battlePartyArt('hero', heroPose(view));
  const kaosShown = battlePartyArt('kaos', kaosPose(view));
  // Her picture in the corner does not flicker with the spell.
  const kaosSteady = battlePartyArt('kaos', kaosPose({ beat, downed, awakened }));
  const enemyState = enemyPose(view);
  const person = opponent.artId === 'gald';
  const enemyShown = person
    ? battlePartyArt('gald', AS_PERSON[enemyState] ?? 'battle_idle')
    : battleEnemyArt(opponent.artId, enemyState);
  // It is only lying down on screen if a picture of it lying down exists.
  const showingDown = downed && enemyShown.state === (person ? DOWN_POSE.person : DOWN_POSE.creature);

  const enemySlot =
    opponent.stands === 'NEAR'
      ? showingDown
        ? ('enemyNearDowned' as const)
        : ('enemyNear' as const)
      : showingDown
        ? ('enemyDowned' as const)
        : ('enemy' as const);
  const figure = (id: string, state: string | null, ground: number) =>
    Math.round(spriteHeight(id, state, stageH) * FIELD_FIGURE_SCALE * depthScale(ground));
  const heights = {
    enemy: figure(opponent.artId, enemyShown.state, PROTOTYPE_PLACEMENTS[enemySlot].bottom),
    hero: figure('hero', heroShown.state, PROTOTYPE_PLACEMENTS.hero.bottom),
    kaos: figure('kaos', kaosShown.state, PROTOTYPE_PLACEMENTS.kaos.bottom),
  };

  // THE GROUND — the App's battle paintings.
  const ground = background === undefined ? battleBackgroundFor(locationId) : background;
  const backdrop = usePicture(
    ground ? () => battleBackgroundArt(ground) : null,
    `battle-bg:${ground ?? 'none'}`,
  );

  // What the plate says: the last line of the fight — or, once it is
  // beaten, what it says or is said about it.
  const showingDefeatLine = beaten && opponent.defeated !== undefined;
  const plate = sayOf(showingDefeatLine ? opponent.defeated!.text : battle.log[battle.log.length - 1]);
  const plateKey = `${battle.log.length}:${plate?.lead ?? ''}:${plate?.figure ?? ''}`;

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
    actorId === 'hero' ? heroShown : actorId === 'kaos' ? kaosSteady : enemyShown;
  const placeName = locationNameOf(locationId);
  const placeMark = locationId.replace(/_/g, ' ');

  const stagecraft = stagecraftFor({ cutIn: false, hitting: blows.length > 0 });
  const levels = stagecraftLevels(stagecraft);

  const pointOf = (on: Blow['on']) => {
    const slot = on === 'hero' ? PROTOTYPE_PLACEMENTS.hero : PROTOTYPE_PLACEMENTS[enemySlot];
    return {
      x: slot.edge === 'left' ? slot.inset + 0.08 : 1 - slot.inset - 0.08,
      y: slot.bottom + 0.16,
    };
  };
  // WHERE A SPELL HAPPENS, measured off the drawings when it starts —
  // her chest for the aura, the middle of whoever it lands on — so it is
  // on them whoever they are, however near they stand, on any phone.
  const [spellAt, setSpellAt] = useState<{
    caster: { x: number; y: number };
    enemy: { x: number; y: number };
    party: { x: number; y: number };
  } | null>(null);
  const spellId = spell?.id ?? null;
  useEffect(() => {
    const stageEl = stageRef.current;
    if (spellId === null || !stageEl) return;
    const s = stageEl.getBoundingClientRect();
    const centre = (selector: string, lift = 0) => {
      const art = stageEl.querySelector(selector);
      if (!art || s.width === 0 || s.height === 0) return null;
      const a = art.getBoundingClientRect();
      return {
        x: (a.left + a.width / 2 - s.left) / s.width,
        y: 1 - (a.top + a.height * (0.5 - lift) - s.top) / s.height,
      };
    };
    const caster = centre('.bp-kaos .bp-art', 0.12);
    const enemy = centre('.bp-enemy .bp-art');
    const party = centre('.bp-hero .bp-art');
    if (caster && enemy && party) setSpellAt({ caster, enemy, party });
  }, [spellId]);
  // HOW FAR HE WALKS: measured when a swing starts, off the drawings, to
  // stop with his blade's reach just short of the creature — whichever
  // creature, however far up the path. In his own (possibly scaled)
  // coordinates, so the transform lands where it was measured.
  const [reachTo, setReachTo] = useState({ x: 0, y: 0 });
  const reachId = reach?.id ?? null;
  useEffect(() => {
    const stageEl = stageRef.current;
    if (reachId === null || !stageEl) return;
    const heroActor = stageEl.querySelector<HTMLElement>('.bp-hero');
    const heroArt = stageEl.querySelector('.bp-hero .bp-art');
    const enemyArt = stageEl.querySelector('.bp-enemy .bp-art');
    if (!heroActor || !heroArt || !enemyArt) return;
    const h = heroArt.getBoundingClientRect();
    const e = enemyArt.getBoundingClientRect();
    const scale = heroActor.offsetWidth > 0 ? heroActor.getBoundingClientRect().width / heroActor.offsetWidth : 1;
    // v18's own rule (travelToEnemy): his left edge stops 7.5% of the
    // field's width past the creature's right edge, his feet on its
    // ground line and a touch below — and he always goes at least a
    // quarter of the field, so a creature standing close is still walked to.
    const s = stageEl.getBoundingClientRect();
    const dx = Math.min(-s.width * 0.24, e.right + s.width * 0.075 - h.left);
    const dy = e.bottom - h.bottom + s.height * 0.015;
    setReachTo({ x: dx / (scale || 1), y: dy / (scale || 1) });
  }, [reachId]);

  // WHERE A FIELD SCENE HAPPENS, measured off the drawings when it
  // starts, as for a spell.
  const [sceneAt, setSceneAt] = useState<FieldMarks | null>(null);
  const sceneId = scene?.id ?? null;
  useEffect(() => {
    const stageEl = stageRef.current;
    if (sceneId === null || !stageEl) return;
    const s = stageEl.getBoundingClientRect();
    if (s.width === 0 || s.height === 0) return;
    const box = (selector: string): FieldBox | null => {
      const art = stageEl.querySelector(selector);
      if (!art) return null;
      const a = art.getBoundingClientRect();
      return {
        left: (a.left - s.left) / s.width,
        top: (a.top - s.top) / s.height,
        width: a.width / s.width,
        height: a.height / s.height,
      };
    };
    const enemy = box('.bp-enemy .bp-art');
    const hero = box('.bp-hero .bp-art');
    if (enemy && hero)
      setSceneAt({ stage: { width: s.width, height: s.height }, enemy, hero, kaos: box('.bp-kaos .bp-art') });
  }, [sceneId]);
  const sceneOn = scene !== null && sceneAt !== null;

  const struckHero = latestOn(blows, 'hero');
  const struckEnemy = latestOn(blows, 'enemy');

  // WHERE ITS HEALTH HANGS: under its feet, measured off the drawing.
  const enemyHome = PROTOTYPE_PLACEMENTS[enemySlot];
  const [enemyBox, setEnemyBox] = useState<{ mid: number; foot: number } | null>(null);
  const plateAt = enemyBox ?? { mid: enemyHome.inset + 0.07, foot: enemyHome.bottom };
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;
    const read = () => {
      const actor = stageEl.querySelector('.bp-enemy');
      if (!actor) return;
      const s = stageEl.getBoundingClientRect();
      const a = actor.getBoundingClientRect();
      if (s.width <= 0 || s.height <= 0) return;
      setEnemyBox({
        mid: (a.left + a.width / 2 - s.left) / s.width,
        foot: (s.bottom - a.bottom) / s.height,
      });
    };
    read();
    const observer = new ResizeObserver(read);
    observer.observe(stageEl);
    const actor = stageEl.querySelector('.bp-enemy');
    if (actor) observer.observe(actor);
    const t = window.setTimeout(read, 220);
    return () => {
      observer.disconnect();
      clearTimeout(t);
    };
  }, [enemyShown.state, showingDown]);

  const ui = BATTLE_UI_FRAMES;
  const uiVars: Record<string, string> = {
    '--ui-enemy-plate': `url(${ui.enemyPlate})`,
    '--ui-party-card': `url(${ui.partyCard})`,
    '--ui-message': `url(${ui.messageWindow})`,
    '--ui-memory': `url(${ui.memoryPanel})`,
    '--ui-memory-star': `url(${ui.memoryStar})`,
    '--ui-diamond': `url(${ui.commandDiamond})`,
    '--ui-turn-slot': `url(${ui.turnSlot})`,
    '--ui-turn-next': `url(${ui.turnNext})`,
    '--ui-bar-rail': `url(${ui.barRail})`,
    '--ui-bar-hp': `url(${ui.barHp})`,
    '--ui-bar-mp': `url(${ui.barMp})`,
    '--ui-auto-on': `url(${ui.autoOn})`,
    '--ui-auto-off': `url(${ui.autoOff})`,
    '--ui-speed-on': `url(${ui.speedOn})`,
    '--ui-speed-off': `url(${ui.speedOff})`,
    '--ui-escape-on': `url(${ui.escapeOn})`,
    '--ui-escape-off': `url(${ui.escapeOff})`,
  };

  // ONE TURN AT A TIME. The row keeps its look while a turn is shown —
  // the Artifact's never dims — and a press in that time is not a turn.
  const locked = playing || !ongoing || battle.awakeningLines.length > 0;
  const press = (command: BattleCommand) => () => {
    if (locked) return;
    closeTrays();
    onCommand?.(command);
  };
  const closeTrays = () => {
    setMagicOpen(false);
    setSkillOpen(false);
    setItemOpen(false);
  };
  const canCast = battle.magicUnlocked && magic !== undefined;

  return (
    <div
      className="screen bp-screen bp-field"
      data-testid={testId}
      data-stagecraft={stagecraft}
      data-connected={onCommand ? 'yes' : 'no'}
      style={{ ...theatreVars(speed), ...uiVars } as CSSProperties}
    >
      {battle.awakeningLines.length > 0 && onAwakeningDone && (
        <AwakeningScene lines={battle.awakeningLines} onDone={onAwakeningDone} />
      )}

      <div
        className={`bp-stage${blows.length > 0 ? ' kick' : ''}`}
        ref={stageRef}
        data-camera={camera}
        data-beat={beat}
        data-scene={sceneOn ? scene.name : undefined}
        data-scene-step={sceneOn ? scene.step : undefined}
      >
        {backdrop && (
          <img
            className="bp-bg"
            src={backdrop}
            alt=""
            aria-hidden="true"
            data-testid="bp-battle-bg"
            data-background={ground ?? undefined}
          />
        )}

        {/* EVERY BLOW, where it landed, with the core's own number. */}
        {blows.map((blow) => (
          <HitFx
            key={blow.id}
            fxKey={blow.id}
            at={pointOf(blow.on)}
            amount={blow.amount}
            ms={visualMs(HIT_FX_MS, speed, HIT_FX_FLOOR_MS)}
            facing={blow.on === 'enemy' ? 'left' : 'right'}
          />
        ))}

        {/* The creature: left, and further up the path. */}
        <div
          className={[
            'bp-actor bp-enemy',
            struckEnemy ? 'flash' : '',
            beat === 'TACKLE' ? 'tackle' : '',
            beat === 'HIDE' ? 'hide' : '',
            // The Artifact flinches it for her whole cast. With the spell
            // shown in full, it flinches when a spell that hurts lands —
            // the blow — and not while she is only gathering it.
            struckEnemy || (beat === 'MAGIC' && !spell) ? 'struck' : '',
            beaten && !showingDown ? 'falling' : '',
            showingDown ? 'downed' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          data-blow={motionSlot(struckEnemy)}
          data-scene-enemy={sceneOn ? scene.enemy : undefined}
          style={cameraStyle(enemySlot, camera)}
          data-testid={showingDown ? 'bp-enemy-downed' : 'bp-enemy-normal'}
        >
          <span className="bp-shadow" aria-hidden="true" />
          <CharacterArt
            art={enemyShown}
            height={heights.enemy}
            className="bp-art"
            face="right"
            label={battle.enemyName}
            testId="bp-enemy-art"
          />
          {beat === 'HIDE' && <span className="bp-moss" aria-hidden="true" />}
          {slash && <SwordSlash slash={slash} />}
          {beat === 'TACKLE' && (
            <span className="bp-leaves" aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <i key={i} className={`bp-leaf bp-leaf-${i}`} />
              ))}
            </span>
          )}
        </div>

        {/* The two of them, on the right, nearer. */}
        <div
          className={['bp-actor bp-kaos', beat === 'HURT' ? 'flinch' : '', casting ? 'casting' : '']
            .filter(Boolean)
            .join(' ')}
          style={cameraStyle('kaos', camera)}
        >
          <span className="bp-shadow" aria-hidden="true" />
          <CharacterArt
            art={kaosShown}
            height={heights.kaos}
            className="bp-art"
            face="left"
            label="ケイオス"
            testId="bp-kaos-art"
          />
        </div>
        <div
          className={`bp-actor bp-hero${beat === 'STRIKE' && !swordplay ? ' strike' : ''}${
            struckHero ? ' hurt flash' : ''
          }${sceneOn && scene.heroAside ? ' aside' : ''}`}
          data-blow={motionSlot(struckHero)}
          data-scene-hero={sceneOn ? scene.hero : undefined}
          style={cameraStyle('hero', camera)}
        >
          {swordplay ? (
            <span
              className="bp-reach"
              data-testid="bp-reach"
              data-phase={reach?.phase ?? 'home'}
              style={
                {
                  '--reach-ms': `${reach?.ms ?? 0}ms`,
                  '--reach-x': `${reachTo.x}px`,
                  '--reach-y': `${reachTo.y}px`,
                } as CSSProperties
              }
            >
              <span className="bp-shadow" aria-hidden="true" />
              <span className="bp-swing">
                <CharacterArt
                  art={heroShown}
                  height={heights.hero}
                  className="bp-art"
                  face="left"
                  label="あなた"
                  testId="bp-hero-art"
                />
              </span>
            </span>
          ) : (
            <>
              <span className="bp-shadow" aria-hidden="true" />
              <CharacterArt
                art={heroShown}
                height={heights.hero}
                className="bp-art"
                face="left"
                label="あなた"
                testId="bp-hero-art"
              />
            </>
          )}
        </div>

        {/* A scene's own figures, on the field among the people. */}
        {sceneOn && scene.field && (
          <div className="bp-scene-field" data-testid="bp-scene-field">
            {scene.field(sceneAt)}
          </div>
        )}

        {/* Its health, under its feet — and following it down. */}
        <div
          className="bx-enemy-plate"
          data-testid="bp-enemy-hp"
          style={{
            left: `${plateAt.mid * 100}%`,
            bottom: `${Math.max(0, plateAt.foot * 100 - 14)}%`,
          }}
        >
          <span className="bx-enemy-head">
            <b className="bx-enemy-name" data-testid="bp-enemy-name">
              {displayName(battle.enemyName)}
            </b>
            <Readout
              now={battle.enemyHp}
              max={battle.enemyMaxHp}
              className="bx-enemy-read"
              testId="bp-enemy-read"
            />
          </span>
          <Meter kind="enemy-hp" now={battle.enemyHp} max={battle.enemyMaxHp} bare>
            {battle.enemyMaxPoise > 0 && (
              <span
                className={`bp-poise${battle.enemyStaggerTurns > 0 ? ' broken' : ''}`}
                data-testid="bp-enemy-poise"
                style={{ width: `${(battle.enemyPoise / battle.enemyMaxPoise) * 100}%` }}
              />
            )}
          </Meter>
        </div>
      </div>

      <div
        className="bp-hud"
        data-testid="bp-hud"
        data-stagecraft={stagecraft}
        style={
          {
            ['--ui-reading' as string]: String(levels.reading),
            ['--ui-vitals' as string]: String(levels.vitals),
          } as CSSProperties
        }
      >
        <div className="bx-corner bx-tl">
          <WorldMemoryPanel rows={memoryRows(memoryLines)} depth={memoryDepth} compact />
        </div>

        <div className="bx-corner bx-tc">
          <TurnOrder slots={turnSlots} artOf={turnArtOf} />
          <div className="bx-place-row">
            <div className="bx-place" data-testid="bx-place">
              <b>{placeMark}</b>
              <i>{placeName}</i>
            </div>
            {bgm && (
              <button
                className="bx-bgm"
                data-testid="bp-bgm-cycle"
                onClick={bgm.onCycle}
                aria-label={`戦闘BGMを切り替える（${bgm.label}）`}
                title={`戦闘BGM ${bgm.label}`}
              >
                <span className="bx-bgm-mark" aria-hidden="true">♪</span>
                <span className="bx-bgm-count" data-testid="bp-bgm-label">
                  {bgm.label}
                </span>
              </button>
            )}
          </div>
          {!told && (
          <div
            key={plateKey}
            className={say ? 'bp-message bp-said' : 'bp-message'}
            data-testid="bp-message"
            data-said={say ? 'yes' : undefined}
            data-brief={say || showingDefeatLine ? undefined : 'yes'}
            role="status"
            aria-live="polite"
          >
            {say ? (
              <div className="bp-said-body" data-testid="bp-said">
                <span className="bp-said-name">《{say.name}》</span>
                <p className="bp-said-line">{say.line}</p>
                <p className="bp-said-result" data-testid="bp-said-result">
                  {say.result}
                </p>
              </div>
            ) : showingDefeatLine && opponent.defeated?.speaker ? (
              <div className="bp-said-body bp-enemy-said" data-testid="bp-enemy-said">
                <span className="bp-said-name">《{opponent.defeated.speaker}》</span>
                <p className="bp-said-line">{opponent.defeated.text}</p>
              </div>
            ) : (
              plate && (
                <>
                  <span className="bp-message-lead" data-testid="bp-message-lead">
                    {plate.lead}
                  </span>
                  {plate.figure && (
                    <b className="bp-message-figure" data-testid="bp-message-figure">
                      {plate.figure}
                    </b>
                  )}
                </>
              )
            )}
          </div>
          )}
        </div>

        {/* A spell's result: outside the top group, which the screen dims
            while a blow lands, so the line stays readable through the
            creature's answer. */}
        {told && (
            <p
              key={`told:${battle.log.length}:${told}`}
              className="bp-told"
              data-testid="bp-told"
              role="status"
              aria-live="polite"
              style={{ '--bp-told': `${visualMs(TOLD_MS, speed, TOLD_FLOOR_MS)}ms` } as CSSProperties}
            >
              <span className="bp-told-name" data-testid="bp-told-name">
                {toldParts(told)[0]}
              </span>
              {toldParts(told)[1] && (
                <span className="bp-told-result" data-testid="bp-told-result">
                  {toldParts(told)[1]}
                </span>
              )}
            </p>
        )}

        <div className="bx-corner bx-tr">
          <PartyHud
            members={[
              {
                name: 'あなた',
                role: '剣',
                art: heroShown,
                hp: { now: battle.playerHp, max: battle.playerMaxHp, testId: 'bp-player-hp' },
                mp: { now: null, max: null },
                spot: PROTOTYPE_PLACEMENTS.hero,
                acting: actingSide === 'ALLY',
                testId: 'bx-member-hero',
              },
              {
                name: 'ケイオス',
                role: '魔法',
                art: kaosSteady,
                hp: { now: null, max: null },
                mp: battle.magicUnlocked
                  ? { now: battle.playerMp, max: battle.playerMaxMp, testId: 'bx-kaos-mp' }
                  : { now: null, max: null },
                spot: PROTOTYPE_PLACEMENTS.kaos,
                acting: casting,
                testId: 'bx-member-kaos',
              },
            ]}
          />
        </div>

        <div className="bx-corner bx-br">
          <div className="bp-modes" data-testid="bp-modes">
            {onToggleAuto && (
              <button
                className={`bp-mode bp-auto-chip${auto ? ' on' : ''}`}
                data-testid="bp-auto"
                aria-pressed={auto}
                onClick={onToggleAuto}
              >
                <span className="bp-mode-en">{auto ? 'AUTO ON' : 'AUTO'}</span>
                <span className="bp-mode-jp">オート</span>
              </button>
            )}
            <button
              className={`bp-mode bp-speed-chip${speed > 1 ? ' on' : ''}`}
              data-testid="bp-speed"
              data-speed={speed}
              aria-label={`速度 ${speedLabel(speed)}`}
              onClick={onCycleSpeed}
            >
              <span className="bp-mode-en">{speedLabel(speed)}</span>
              <span className="bp-mode-jp">倍速</span>
            </button>
            {onEscape && (
              <button
                className="bp-mode bp-escape"
                data-testid="bp-escape"
                disabled={!ongoing}
                onClick={onEscape}
              >
                <span className="bp-mode-en">ESCAPE</span>
                <span className="bp-mode-jp">逃走</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="bp-dock">
        {!beaten && (
          <div
            className="bp-commands"
            data-testid="bp-commands"
            data-locked={locked ? 'yes' : 'no'}
          >
            <button className="bp-cmd" data-testid="bp-attack" onClick={press('ATTACK')}>
              <span className="bp-cmd-plate" aria-hidden="true" />
              <SwordIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">攻撃</span>
              <span className="bp-cmd-en">ATTACK</span>
            </button>
            {canCast && (
              <button
                className={magicOpen ? 'bp-cmd open' : 'bp-cmd'}
                data-testid="bp-magic"
                aria-expanded={magicOpen}
                onClick={() => {
                  if (locked) return;
                  setSkillOpen(false);
                  setItemOpen(false);
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
                if (locked) return;
                setMagicOpen(false);
                setItemOpen(false);
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
                if (locked) return;
                setMagicOpen(false);
                setSkillOpen(false);
                setItemOpen((open) => !open);
              }}
            >
              <span className="bp-cmd-plate" aria-hidden="true" />
              <LeafIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">アイテム</span>
              <span className="bp-cmd-en">ITEM</span>
            </button>
            <button className="bp-cmd" data-testid="bp-defend" onClick={press('DEFEND')}>
              <span className="bp-cmd-plate" aria-hidden="true" />
              <CageIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">防御</span>
              <span className="bp-cmd-en">DEFEND</span>
            </button>
            <button
              className={`bp-cmd arcana${arcanaReady ? '' : ' locked'}`}
              data-testid="bp-arcana"
              aria-disabled={arcanaReady ? undefined : true}
              disabled={!arcanaReady}
              onClick={press('ARCANA')}
            >
              <span className="bp-cmd-plate" aria-hidden="true" />
              <Ornament kind="ring" size={14} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">アルカナ</span>
              <span className="bp-cmd-en">ARCANA</span>
            </button>
          </div>
        )}
        {!beaten && !arcanaReady && (
          <p className="bp-cmd-spent" data-testid="bp-arcana-locked">
            アルカナ 準備中
          </p>
        )}
      </div>

      {/* A spell happening: over the people and the HUD, under a cut-in. */}
      {spell && spellAt && (
        <div className="bp-effects" data-testid="bp-effects">
          <SpellFx spell={spell} caster={spellAt.caster} target={spellAt[spell.lands]} />
        </div>
      )}

      {/* A scene's effects: over the people and the HUD, like a spell's. */}
      {sceneOn && scene.over && (
        <div
          className="bp-effects bp-scene-over"
          data-testid="bp-scene-over"
          data-scene={scene.name}
          data-scene-step={scene.step}
        >
          {scene.over(sceneAt)}
        </div>
      )}

      {/* A cut-in, over the fight and its HUD — and taking every press
          while it plays. */}
      {cinematic && (
        <div className="bp-cinematic" data-testid="bp-cinematic">
          {cinematic}
        </div>
      )}

      {/* Every choice the fight asks for is made in front of everything
          else on the screen — see BattlePicker. */}
      {!beaten && magicOpen && canCast && (
        <BattlePicker label="魔法を選ぶ" onClose={closeTrays}>
          <MagicTray
            spells={magic.spells}
            mp={battle.playerMp}
            onCast={(id) => {
              if (locked) return;
              setMagicOpen(false);
              magic.onCast(id);
            }}
            onClose={closeTrays}
          />
        </BattlePicker>
      )}
      {!beaten && skillOpen && (
        <BattlePicker label="スキルを選ぶ" onClose={closeTrays}>
          <div className="bp-tray" data-testid="bp-skill-tray">
            <p className="bp-tray-empty">このさきに覚えるものが入ります。</p>
            <button className="bp-tray-close" data-testid="bp-skill-close" onClick={closeTrays}>
              やめる
            </button>
          </div>
        </BattlePicker>
      )}
      {!beaten && itemOpen && items && (
        <BattlePicker label="アイテムを選ぶ" onClose={closeTrays}>
          <ItemTray
            bag={items.bag}
            battle={battle}
            onUse={(itemId) => {
              if (locked) return;
              setItemOpen(false);
              items.onUse(itemId);
            }}
            onClose={closeTrays}
          />
        </BattlePicker>
      )}
    </div>
  );
}
