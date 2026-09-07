import { useEffect, useRef, useState } from 'react';
import {
  castMagic,
  clearAwakeningLines,
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
  type EnemyAction,
} from '../../game/battle/battleLogic';
import { availableMagic, harmsEnemy } from '../../core/magic/magic';
import { MAGIC_DEFS } from '../../content/magic/magicDefs';
import { decideTurn, magicBlocked } from '../../game/battle/magicChoice';
import {
  DEFAULT_BATTLE_SPEED,
  beatMs,
  nextSpeed,
  speedLabel,
  type BattleSpeed,
} from '../../game/battle/battleSpeed';
import { MagicTray } from '../battle/MagicTray';
import { AwakeningScene } from '../battle/AwakeningScene';
import { specOf } from '../../game/battle/enemySpec';
import { GALD_BATTLE } from '../../content/enemies/galdBattle';
import { GALD_DEFEATED_LINES } from '../../content/dialogue/galdEncounter';
import { enemyArtFor, partyArtFor } from '../../content/art';
import { CharacterArt } from '../art/CharacterArt';
import { spriteHeight } from '../../content/art/spriteFrames';
import { BattleParty } from '../battle/BattleParty';
import { activeParty } from '../../game/party/battleParty';
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
  /**
   * Whether Kaos has already reached past what she was doing.
   *
   * Ignored by the one fight that carries the awakening — Gald's — and
   * read by every other fight this screen shows.
   */
  magicUnlocked?: boolean;
}

/** A species, in the units the battle speaks. */
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

/**
 * How long AUTO waits after the theatre has finished before it acts.
 *
 * Long enough to read the line that just appeared, short enough that
 * watching does not feel like waiting. Scaled with everything else, so
 * at ×2 it is half of this.
 */
const AUTO_GAP_MS = 550;

/** And how long it holds a line of the awakening scene. */
const AUTO_READ_MS = 2200;

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
  magicUnlocked = false,
}: Props) {
  // The bandit is named from the first line of the encounter, so the bar
  // above belongs to a person the player has already met.
  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(enemy ? specOf(enemy) : GALD_BATTLE, undefined, { magicUnlocked }),
  );
  const [reaction, setReaction] = useState<Reaction>('NONE');
  /**
   * How tall the field is, in real pixels.
   *
   * Everybody standing in it is a share of this, so the three of them
   * keep their scale to the place rather than to a pixel count — the
   * same rule, and the same registry, as the prototype screen.
   */
  /**
   * How fast the theatre is watched. Nothing changes the numbers of the
   * fight; every duration on this screen goes through `beatMs`, so
   * offering the player a control is adding a setter and a button and
   * touching nothing else. One until then, which is what the fight has
   * always been timed at.
   */
  const [speed, setSpeed] = useState<BattleSpeed>(DEFAULT_BATTLE_SPEED);
  /**
   * Whether the fight is being watched rather than played.
   *
   * It chooses with the same rules a player has — `decideTurn` reads
   * the same state, the same spells and the same power — and it presses
   * the same three commands. There is no second battle underneath it,
   * which is why turning it off is nothing more than not scheduling the
   * next press.
   */
  const [auto, setAuto] = useState(false);
  const fieldRef = useRef<HTMLDivElement>(null);
  const [fieldH, setFieldH] = useState(260);
  const beats = useRef<number[]>([]);
  /** When the theatre currently on screen finishes, in epoch ms. */
  const busyUntil = useRef(0);

  useEffect(() => () => beats.current.forEach(clearTimeout), []);

  useEffect(() => {
    const node = fieldRef.current;
    if (!node) return;
    const measure = () => setFieldH(node.getBoundingClientRect().height || 260);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /** Plays a short sequence of reactions, then clears the screen. */
  const play = (sequence: Exclude<Reaction, 'NONE'>[]) => {
    beats.current.forEach(clearTimeout);
    beats.current = [];
    let at = 0;
    for (const beat of sequence) {
      const delay = at;
      beats.current.push(window.setTimeout(() => setReaction(beat), delay));
      at += beatMs(BEAT_MS[beat], speed);
    }
    beats.current.push(window.setTimeout(() => setReaction('NONE'), at));
    // What AUTO waits for. A person waits for the same thing.
    busyUntil.current = Date.now() + at;
  };

  /** What the creature did in reply, if it is still standing. */
  const answer = (next: BattleState): Exclude<Reaction, 'NONE'>[] =>
    next.lastEnemyAction === 'SKILL' ? ['HIDE'] : next.lastEnemyAction === 'ATTACK' ? ['TACKLE'] : [];

  useEffect(() => {
    if (battle.outcome === 'VICTORY') {
      // No EXP screen. He is beaten, not dead — his life is the next
      // screen's question.
      const t = setTimeout(onVictory, beatMs(1500, speed));
      return () => clearTimeout(t);
    }
    if (battle.outcome === 'DEFEAT') {
      const t = setTimeout(onDefeat, beatMs(1200, speed));
      return () => clearTimeout(t);
    }
  }, [battle.outcome, onVictory, onDefeat, speed]);

  const ongoing = battle.outcome === 'ONGOING';
  const beaten = battle.enemyHp <= 0;
  const lastLogs = battle.log.slice(-2);
  /**
   * Who is standing where, asked for as poses rather than as files.
   *
   * Gald has standing art at both moments; a creature met while
   * exploring has whatever its own registry holds. Either way the size
   * on screen comes from content/art/spriteFrames and the stage, never
   * from the pixel size of the picture — which is what used to put his
   * knees at the top of the screen and his head off it.
   */
  const enemyArt = enemy
    ? enemyArtFor(enemy.speciesId, beaten ? 'down' : 'front')
    : partyArtFor('gald', beaten ? 'battle_damage' : 'battle_idle');
  const enemySpriteId = enemy ? enemy.speciesId : 'gald';
  /**
   * The party, as a list rather than as two variables.
   *
   * Who is in it comes from the roster and where they stand comes from
   * the formation table, so a third member joining is a change to
   * neither this screen nor the party layer.
   */
  const partyActors = activeParty().map((member, i) => ({
    id: member.id,
    label: member.label,
    art: partyArtFor(member.id, 'battle_idle'),
    face: 'left' as const,
    testId: `battle-${member.id}-art`,
    // The front rank is the one whose blow lands. That is him today;
    // when the fight records which member acted, this reads that.
    beat: i === 0 && reaction === 'HIT' ? 'strike' : null,
  }));
  const backdrop = locationBackground(battleLocationId);

  /**
   * Her spells, and whether the tray is open.
   *
   * The tray is a way of choosing, not an extra action: closing it
   * costs nothing and casting from it spends the one turn the player
   * had. Nothing in here can produce a swing as well.
   */
  const spells = availableMagic(MAGIC_DEFS, { awakened: battle.magicUnlocked });
  const [magicOpen, setMagicOpen] = useState(false);

  const cast = (id: string) => {
    const magic = spells.find((m) => m.id === id);
    if (!magic || magicBlocked(battle, magic) !== null) return;
    setMagicOpen(false);
    const next = castMagic(battle, magic, undefined, forcedEnemyAction);
    setBattle(next);
    // Only a spell aimed at the creature struck anything, so only that
    // one makes something flinch and him swing. For the other two the
    // bar moving and the line in the log are what happened, and playing
    // a hit over them would be a lie.
    play([...(harmsEnemy(magic) ? (['HIT'] as const) : []), ...answer(next)]);
  };

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

  /**
   * AUTO, which is one timer and no second battle.
   *
   * When it is on and nothing is playing, it asks `decideTurn` what to
   * do with the turn and presses the command a player would have
   * pressed. It reads the same state, the same spells and the same
   * power, and it cannot do anything the player could not: there is no
   * path from here into the battle that the three buttons do not also
   * take.
   *
   * Turning it off clears this timer and nothing else, so the very next
   * tap is a hand-played turn. The awakening is left alone — the scene
   * advances itself while AUTO is on, at a reading pace, and until it
   * is done nobody's turn is taken.
   */
  useEffect(() => {
    if (!auto || battle.outcome !== 'ONGOING') return;
    if (battle.awakeningLines.length > 0) return;
    const wait = Math.max(0, busyUntil.current - Date.now()) + beatMs(AUTO_GAP_MS, speed);
    const t = window.setTimeout(() => {
      const plan = decideTurn(battle, spells);
      if (plan.action === 'MAGIC' && plan.magicId !== null) cast(plan.magicId);
      else if (plan.action === 'GUARD') defend();
      else attack();
    }, wait);
    return () => clearTimeout(t);
    // `spells`, `cast`, `attack` and `defend` are rebuilt every render
    // and all of them read the same `battle` this effect already
    // watches. Listing them would clear and re-arm the timer on every
    // repaint — including the four this screen does while a blow is
    // playing — and AUTO would never reach the end of its own wait.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, battle, speed]);

  return (
    <div
      className={backdrop ? 'screen battle-screen has-backdrop' : 'screen battle-screen'}
      data-testid="battle-screen"
    >
      {/* The moment she steps forward. Read over the fight, which stays
          exactly where it was behind it — nothing is reset, nobody has
          taken a turn, and tapping through it returns to the same
          board. */}
      {battle.awakeningLines.length > 0 && (
        <AwakeningScene
          lines={battle.awakeningLines}
          onDone={() => setBattle((b) => clearAwakeningLines(b))}
          advanceMs={auto ? beatMs(AUTO_READ_MS, speed) : undefined}
        />
      )}
      <ScreenBackdrop src={backdrop} variant="battle" testId="battle-backdrop" />
      <div className="battle-enemy">
        <HpBar
          label={battle.enemyName}
          hp={battle.enemyHp}
          max={battle.enemyMaxHp}
          enemy
          testId="enemy-hp"
        />
        {/* THE FIELD. What you are fighting on the left, the two of
            you on the right, both standing on the same ground line.
            Sizes come from the shared registry, so the man who used to
            arrive as a pair of knees is now a man. */}
        <div className="battle-field" ref={fieldRef}>
          <div
            className={[
              'bf-actor bf-enemy',
              reaction === 'HIT' ? 'hit' : '',
              reaction === 'TACKLE' ? 'tackle' : '',
              reaction === 'HIDE' ? 'hide' : '',
              beaten ? 'beaten' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="bf-shadow" aria-hidden="true" />
            <CharacterArt
              art={enemyArt}
              height={spriteHeight(enemySpriteId, enemyArt.state, fieldH)}
              className="bf-art"
              face="right"
              label={enemy ? enemy.name : '盗賊 ガルド'}
              testId={
                enemy
                  ? `enemy-portrait-${enemy.speciesId}`
                  : beaten
                    ? 'gald-portrait-defeated'
                    : 'gald-portrait-ready'
              }
            />
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

          {/* The party. He is in front, she is a step behind him — the
              order the fight is fought in, readable at a glance, and
              now the formation table's business rather than this
              screen's. */}
          <BattleParty actors={partyActors} stageHeight={fieldH} />
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
      {/* Her spells, when she has any and the player has asked. One
          action a turn: choosing one of these IS the turn. */}
      {magicOpen && (
        <MagicTray
          spells={spells}
          mp={battle.playerMp}
          onCast={cast}
          onClose={() => setMagicOpen(false)}
        />
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
        {/* Only once she can. Before that there is nothing to show and
            nothing to explain — the fight itself explains it. */}
        {battle.magicUnlocked && (
          <button
            className={magicOpen ? 'btn primary' : 'btn'}
            data-testid="magic-button"
            disabled={!ongoing}
            onClick={() => setMagicOpen((open) => !open)}
          >
            魔法
            <span className="battle-mp" data-testid="player-mp">
              MP {battle.playerMp}/{battle.playerMaxMp}
            </span>
          </button>
        )}
        <button className="btn" data-testid="defend-button" disabled={!ongoing} onClick={defend}>
          身構える
        </button>
        {/* How the fight is watched, rather than what is done in it —
            so they are narrow, at the end of the row, and the three
            things that spend a turn keep the width they had. Still in
            the same reach: this row is where the thumbs already are. */}
        <button
          className={auto ? 'btn battle-mode on' : 'btn battle-mode'}
          data-testid="auto-button"
          aria-pressed={auto}
          disabled={!ongoing}
          onClick={() => {
            setAuto((on) => !on);
            setMagicOpen(false);
          }}
        >
          AUTO
        </button>
        <button
          className="btn battle-mode"
          data-testid="speed-button"
          data-speed={speed}
          aria-label={`速度 ${speedLabel(speed)}`}
          disabled={!ongoing}
          onClick={() => setSpeed(nextSpeed)}
        >
          {speedLabel(speed)}
        </button>
      </div>
    </div>
  );
}
