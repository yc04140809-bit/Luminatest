import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { BattleState } from '@mugen/game/battle/battleLogic';
import { enemyPose, heroPose, kaosPose } from '@mugen/game/battle/battleArtState';
import {
  DEFAULT_BATTLE_SPEED,
  speedLabel,
  type BattleSpeed,
} from '@mugen/game/battle/battleSpeed';
import { spriteHeight } from '@mugen/content/art/spriteFrames';
import { locationNameOf } from '@mugen/content/locations/alden';
import type { LocationId } from '@mugen/content/locations/locationVisuals';
import { CharacterArt } from '../art/CharacterArt';
import { Ornament } from '../common/Ornament';
import { CageIcon, LeafIcon, SparkIcon, SwordIcon } from './BattleIcons';
import { Meter, PartyHud, Readout, TurnOrder, WorldMemoryPanel } from './BattleHud';
import { actingSideOf, displayName, memoryRows, turnOrderLine, type TurnActor } from './battleHud';
import { sayOf } from './battleMessage';
import { cameraStyle, type CameraPhase } from './battleCamera';
import { FIELD_FIGURE_SCALE, PROTOTYPE_PLACEMENTS, depthScale } from './formation';
import { stagecraftFor, stagecraftLevels } from './stagecraft';
import {
  AS_PERSON,
  BATTLE_UI_FRAMES,
  battleEnemyArt,
  battleFieldArt,
  battlePartyArt,
} from './battleArt';
import './battle.generated.css';
import './battle.app.css';

/**
 * THE ARTIFACT'S BATTLE SCREEN, DRAWN BY THE APP — AT REST.
 *
 * The same markup, the same class names and the same stylesheet as the
 * Artifact's `BattleUIPrototype`, laid out by the same formation,
 * camera and HUD modules (copied, and held identical by
 * `artifactCopies.test.ts`). What it draws is a REAL `BattleState` from
 * the shared core: every number on it — health, magic, the enemy's name,
 * the line on the plate — is the core's, and none is decided here.
 *
 * WHAT IT DOES NOT DO, ON PURPOSE (Phase 1):
 *   - no turns: it is handed a state and draws it; nothing here calls
 *     the battle logic. Commands report a press through the optional
 *     handlers and do nothing when none is given;
 *   - no motion: the camera is at rest and nobody is mid-blow, so no
 *     hit numbers, no cut-in, no spell effect — those are later phases;
 *   - none of the Artifact's systems the App's fight does not have:
 *     Kaos's interventions (《ケイオスの守護》), arcana summons and
 *     their accidents, the magic/item/skill trays.
 */

export type BattleCommand = 'ATTACK' | 'MAGIC' | 'SKILL' | 'ITEM' | 'DEFEND' | 'ARCANA';

export interface BattleOpponentView {
  /** Whose drawings: a creature's id, or 'gald' for a person. */
  artId: 'moss_rabbit' | 'gald';
  /**
   * A creature stands up the path; a person at arm's length. The
   * Artifact's `stands`: FAR for creatures, NEAR for people.
   */
  stands: 'FAR' | 'NEAR';
}

export interface BattleStageProps {
  battle: BattleState;
  opponent: BattleOpponentView;
  locationId: LocationId;
  /** What the world remembers, newest last — the WORLD MEMORY panel. */
  memoryLines: readonly string[];
  /** How deep that memory runs, 0–100. */
  memoryDepth: number;
  /** Whether a finished arcana page exists — the ARCANA command's lock. */
  arcanaReady: boolean;
  speed?: BattleSpeed;
  auto?: boolean;
  /** A press on the command row. Absent: the row is drawn and inert. */
  onCommand?: (command: BattleCommand) => void;
  onToggleAuto?: () => void;
  onCycleSpeed?: () => void;
  /** Absent: no 逃走 chip, as in a fight that cannot be left. */
  onEscape?: () => void;
  /** The ♪ control, where this fight has one. */
  bgm?: { label: string; onCycle: () => void };
  testId?: string;
}

export function BattleStage({
  battle,
  opponent,
  locationId,
  memoryLines,
  memoryDepth,
  arcanaReady,
  speed = DEFAULT_BATTLE_SPEED,
  auto = false,
  onCommand,
  onToggleAuto,
  onCycleSpeed,
  onEscape,
  bgm,
  testId = 'battle-stage',
}: BattleStageProps) {
  // At rest. The Artifact's beat and camera, before anybody moves.
  const beat = 'NONE';
  const camera: CameraPhase = 'IDLE';
  const downed = false;

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

  const awakened = battle.awakening !== null && battle.magicUnlocked;
  const view = { beat, downed, awakened };
  const heroShown = battlePartyArt('hero', heroPose(view));
  const kaosShown = battlePartyArt('kaos', kaosPose(view));
  const enemyState = enemyPose(view);
  const enemyShown =
    opponent.artId === 'gald'
      ? battlePartyArt('gald', AS_PERSON[enemyState] ?? 'battle_idle')
      : battleEnemyArt(opponent.artId, enemyState);

  const enemySlot = opponent.stands === 'NEAR' ? ('enemyNear' as const) : ('enemy' as const);
  const figure = (id: string, state: string | null, ground: number) =>
    Math.round(spriteHeight(id, state, stageH) * FIELD_FIGURE_SCALE * depthScale(ground));
  const heights = {
    enemy: figure(opponent.artId, enemyShown.state, PROTOTYPE_PLACEMENTS[enemySlot].bottom),
    hero: figure('hero', heroShown.state, PROTOTYPE_PLACEMENTS.hero.bottom),
    kaos: figure('kaos', kaosShown.state, PROTOTYPE_PLACEMENTS.kaos.bottom),
  };

  const backdrop = battleFieldArt(locationId);
  const plate = sayOf(battle.log[battle.log.length - 1]);

  const turnRoster: TurnActor[] = [
    { id: 'hero', name: 'あなた', side: 'ALLY' },
    { id: opponent.artId, name: battle.enemyName, side: 'ENEMY' },
  ];
  const actingSide = actingSideOf(null);
  const turnSlots = turnOrderLine(
    turnRoster,
    turnRoster.findIndex((a) => a.side === actingSide),
    5,
  );
  const turnArtOf = (actorId: string) =>
    actorId === 'hero' ? heroShown : actorId === 'kaos' ? kaosShown : enemyShown;
  const placeName = locationNameOf(locationId);
  const placeMark = locationId.replace(/_/g, ' ');

  const stagecraft = stagecraftFor({ cutIn: false, hitting: false });
  const levels = stagecraftLevels(stagecraft);

  // WHERE ITS HEALTH HANGS: under its feet, measured off the drawing —
  // the Artifact's own rule, so the plate follows the creature.
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
  }, [enemyShown.state]);

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

  const press = (command: BattleCommand) => () => onCommand?.(command);
  const ongoing = battle.outcome === 'ONGOING';

  return (
    <div
      className="screen bp-screen bp-field"
      data-testid={testId}
      data-stagecraft={stagecraft}
      data-connected={onCommand ? 'yes' : 'no'}
      style={{ ['--fx' as string]: String(1 / speed), ...uiVars } as CSSProperties}
    >
      <div className="bp-stage" ref={stageRef} data-camera={camera}>
        {backdrop && <img className="bp-bg" src={backdrop} alt="" aria-hidden="true" />}

        {/* The creature: left, and further up the path. */}
        <div
          className="bp-actor bp-enemy"
          style={cameraStyle(enemySlot, camera)}
          data-testid="bp-enemy-normal"
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
        </div>

        {/* The two of them, on the right, nearer. */}
        <div className="bp-actor bp-kaos" style={cameraStyle('kaos', camera)}>
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
        <div className="bp-actor bp-hero" style={cameraStyle('hero', camera)}>
          <span className="bp-shadow" aria-hidden="true" />
          <CharacterArt
            art={heroShown}
            height={heights.hero}
            className="bp-art"
            face="left"
            label="あなた"
            testId="bp-hero-art"
          />
        </div>

        {/* Its health, under its feet. */}
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
          <div
            className="bp-message"
            data-testid="bp-message"
            data-brief="yes"
            role="status"
            aria-live="polite"
          >
            {plate && (
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
            )}
          </div>
        </div>

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
                art: kaosShown,
                hp: { now: null, max: null },
                mp: battle.magicUnlocked
                  ? { now: battle.playerMp, max: battle.playerMaxMp, testId: 'bx-kaos-mp' }
                  : { now: null, max: null },
                spot: PROTOTYPE_PLACEMENTS.kaos,
                acting: false,
                testId: 'bx-member-kaos',
              },
            ]}
          />
        </div>

        <div className="bx-corner bx-br">
          <div className="bp-modes" data-testid="bp-modes">
            <button
              className={`bp-mode bp-auto-chip${auto ? ' on' : ''}`}
              data-testid="bp-auto"
              aria-pressed={auto}
              onClick={onToggleAuto}
            >
              <span className="bp-mode-en">{auto ? 'AUTO ON' : 'AUTO'}</span>
              <span className="bp-mode-jp">オート</span>
            </button>
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
        {ongoing && (
          <div className="bp-commands" data-testid="bp-commands">
            <button className="bp-cmd" data-testid="bp-attack" onClick={press('ATTACK')}>
              <span className="bp-cmd-plate" aria-hidden="true" />
              <SwordIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">攻撃</span>
              <span className="bp-cmd-en">ATTACK</span>
            </button>
            {battle.magicUnlocked && (
              <button className="bp-cmd" data-testid="bp-magic" onClick={press('MAGIC')}>
                <span className="bp-cmd-plate" aria-hidden="true" />
                <SparkIcon size={15} className="bp-cmd-mark" />
                <span className="bp-cmd-jp">魔法</span>
                <span className="bp-cmd-en" data-testid="bp-mp">
                  MP {battle.playerMp}
                </span>
              </button>
            )}
            <button className="bp-cmd" data-testid="bp-skill" onClick={press('SKILL')}>
              <span className="bp-cmd-plate" aria-hidden="true" />
              <SparkIcon size={15} className="bp-cmd-mark" />
              <span className="bp-cmd-jp">スキル</span>
              <span className="bp-cmd-en">SKILL</span>
            </button>
            <button className="bp-cmd" data-testid="bp-item" onClick={press('ITEM')}>
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
        {ongoing && !arcanaReady && (
          <p className="bp-cmd-spent" data-testid="bp-arcana-locked">
            アルカナ 準備中
          </p>
        )}
      </div>
    </div>
  );
}
