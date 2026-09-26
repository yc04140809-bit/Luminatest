import { useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  castMagic,
  clearAwakeningLines,
  createBattle,
  playerAttack,
  playerDefend,
  refuseItem,
  useItem,
  type BattleState,
  type EnemyAction,
  type Rng,
} from '@mugen/game/battle/battleLogic';
import { specOf } from '@mugen/game/battle/enemySpec';
import { magicBlocked } from '@mugen/game/battle/magicChoice';
import {
  beatMs,
  nextSpeed,
  DEFAULT_BATTLE_SPEED,
  type BattleSpeed,
} from '@mugen/game/battle/battleSpeed';
import { statsForLevels } from '@mugen/core/progression/levelStats';
import { availableMagic } from '@mugen/core/magic/magic';
import { MOSS_RABBIT } from '@mugen/content/enemies/species';
import { GALD_BATTLE } from '@mugen/content/enemies/galdBattle';
import { GALD_DEFEATED_LINES } from '@mugen/content/dialogue/galdEncounter';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { ITEM_DEFS, itemDef } from '@mugen/content/economy/itemDefs';
import { BATTLE_BACKGROUND_KEYS, type BattleBackgroundKey } from '@mugen/assets/keys';
import { BattleStage, type BattleCommand, type BattleOpponentView } from '../ui/battle/BattleStage';
import { KNOCKDOWN_MS, useBattleTheatre, type TurnKind } from '../ui/battle/battleTheatre';

/**
 * THE BATTLE SCREEN, ON ITS OWN — for checking how a fight LOOKS.
 *
 * DEBUG BUILDS ONLY: the dev server, and the debug APK (built with
 * `npm run build:debug`, which sets VITE_MUGEN_DEBUG_TOOLS). A release
 * build (`npm run build`) contains neither this file nor the way in.
 *
 * A REAL FIGHT, KEPT OFF THE WORLD. Every turn is the shared core's —
 * `playerAttack`, `playerDefend`, `castMagic`, `useItem` — exactly as the
 * game's own battle screen calls them, so there is no second battle
 * calculation here. What is different is only what it is attached to:
 * nothing. No world is opened, read or written; no save, no WORLD
 * MEMORY, no reward, no result screen. Winning or losing leaves the
 * fight where it ended until it is played again.
 *
 * FIXED CONDITIONS, SO A MOVE CAN BE WATCHED AGAIN AND AGAIN. The dice
 * are a fixed sequence, restarted by 「もう一度」, so the same presses
 * give the same numbers every time; and what the enemy answers with can
 * be pinned (the core's own forced-action parameter), so the answer
 * being judged comes every turn.
 *
 * Reached from the title screen's DEBUG chip on a device, or by URL:
 *
 *   ?preview=battle              the forest's moss rabbit, level 1
 *   &enemy=gald                  Gald, as the story fights him (she wakes
 *                                in the fight, as she does in the game)
 *   &magic=1                     she has already woken (the 魔法 command)
 *   &bg=FOREST|RUINS|SWAMP|CITY|BEACH|GRASSLAND
 *                                fight on another of the battle paintings
 *                                (default: the greenwood's own, FOREST)
 *   &bag=1                       one of every item the game defines
 *   &answer=ATTACK|SKILL|NONE    what the enemy does every turn (default:
 *                                whatever the core decides)
 *   &escape=1 / &escape=0        force the 逃走 chip on or off. By default
 *                                it is there for a creature and not for
 *                                Gald, as in the Artifact's real fights.
 *                                It is only drawn: escape is not built.
 *   &debug=0                     hide the DEBUG panel (for screenshots)
 */

/** The fixed dice: mulberry32, from one seed. Not a battle rule — just repeatable. */
const SEED = 0x6d756765;
function fixedDice(seed = SEED): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Answer = EnemyAction | 'CORE';

interface Setup {
  gald: boolean;
  magic: boolean;
  bag: boolean;
  background: BattleBackgroundKey | undefined;
  answer: Answer;
  escape: boolean | null;
}

function setupFrom(params: URLSearchParams): Setup {
  const bg = params.get('bg');
  const answer = params.get('answer');
  return {
    gald: params.get('enemy') === 'gald',
    magic: params.get('magic') === '1',
    bag: params.get('bag') === '1',
    background: BATTLE_BACKGROUND_KEYS.find((key) => key === bg),
    answer: answer === 'ATTACK' || answer === 'SKILL' || answer === 'NONE' ? answer : 'CORE',
    escape: params.has('escape') ? params.get('escape') === '1' : null,
  };
}

export function BattlePreview({ params }: { params: URLSearchParams }) {
  const [setup, setSetup] = useState<Setup>(() => setupFrom(params));
  // Kept across replays: a move judged at ×2 is replayed at ×2.
  const [speed, setSpeed] = useState<BattleSpeed>(DEFAULT_BATTLE_SPEED);
  const [run, setRun] = useState(0);
  const [panel, setPanel] = useState(false);
  /** How long the last turn took to watch, and at what speed — for judging ×2 without AUTO. */
  const [lastTurn, setLastTurn] = useState<{ ms: number; speed: BattleSpeed } | null>(null);
  const showPanel = params.get('debug') !== '0';

  const change = (patch: Partial<Setup>) => {
    setSetup((s) => ({ ...s, ...patch }));
    setRun((n) => n + 1);
  };

  return (
    <>
      <PreviewFight
        // A new fight — fresh state, fresh dice, no timer left over from
        // the last one — every time it is played again or changed.
        key={run}
        setup={setup}
        speed={speed}
        onCycleSpeed={() => setSpeed((at) => nextSpeed(at))}
        onTurnWatched={(ms) => setLastTurn({ ms, speed })}
      />
      {showPanel && (
        <DebugPanel
          open={panel}
          onToggle={() => setPanel((o) => !o)}
          setup={setup}
          speed={speed}
          lastTurn={lastTurn}
          onChange={change}
          onReplay={() => setRun((n) => n + 1)}
        />
      )}
    </>
  );
}

function PreviewFight({
  setup,
  speed,
  onCycleSpeed,
  onTurnWatched,
}: {
  setup: Setup;
  speed: BattleSpeed;
  onCycleSpeed: () => void;
  onTurnWatched: (ms: number) => void;
}) {
  const dice = useRef<Rng>(fixedDice());
  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(setup.gald ? GALD_BATTLE : specOf(MOSS_RABBIT), undefined, {
      stats: statsForLevels(1, 1),
      magicUnlocked: setup.magic,
    }),
  );
  const [bag, setBag] = useState(() =>
    setup.bag ? ITEM_DEFS.map((def) => ({ itemId: def.itemId, quantity: 1 })) : [],
  );
  const [auto, setAuto] = useState(false);
  const [downed, setDowned] = useState(false);
  const [say, setSay] = useState<{ name: string; line: string; result: string } | null>(null);
  const theatre = useBattleTheatre(speed);
  const forced: EnemyAction | null = setup.answer === 'CORE' ? null : setup.answer;

  const opponent: BattleOpponentView = setup.gald
    ? { artId: 'gald', stands: 'NEAR', defeated: { speaker: GALD_BATTLE.name, text: GALD_DEFEATED_LINES[0].text } }
    : { artId: 'moss_rabbit', stands: 'FAR', defeated: { text: MOSS_RABBIT.defeatedText } };
  const spells = availableMagic(MAGIC_DEFS, { awakened: battle.magicUnlocked });
  const idle = battle.outcome === 'ONGOING' && !theatre.playing;

  const turn = (next: BattleState, kind: TurnKind) => {
    const before = battle;
    setBattle(next);
    theatre.playTurn(before, next, kind);
    startedAt.current = performance.now();
  };

  // From the press to the row being free again: what ×2 is meant to shorten.
  const startedAt = useRef<number | null>(null);
  useEffect(() => {
    if (theatre.playing || startedAt.current === null) return;
    onTurnWatched(performance.now() - startedAt.current);
    startedAt.current = null;
  }, [theatre.playing]);

  const onCommand = (command: BattleCommand) => {
    if (!idle) return;
    setSay(null);
    if (command === 'ATTACK') turn(playerAttack(battle, dice.current, forced), 'ATTACK');
    if (command === 'DEFEND') turn(playerDefend(battle, dice.current, forced), 'DEFEND');
  };

  const cast = (id: string) => {
    if (!idle) return;
    const magic = spells.find((m) => m.id === id);
    if (!magic || magicBlocked(battle, magic) !== null) return;
    setSay(null);
    turn(castMagic(battle, magic, dice.current, forced), 'MAGIC');
  };

  const drink = (itemId: string) => {
    if (!idle) return;
    const def = itemDef(itemId);
    const held = bag.find((s) => s.itemId === itemId)?.quantity ?? 0;
    if (!def?.use || refuseItem(battle, def.use, held) !== null) return;
    const next = useItem(battle, def.use, dice.current, forced);
    setBag((b) => b.map((s) => (s.itemId === itemId ? { ...s, quantity: s.quantity - 1 } : s)).filter((s) => s.quantity > 0));
    turn(next, 'ITEM');
    const said = next.log.slice(battle.log.length);
    setSay({ name: def.name, line: said[0] ?? def.use.line, result: said[1] ?? '' });
  };

  // Beaten, it goes down — and stays down, until it is played again.
  useEffect(() => {
    if (battle.outcome !== 'VICTORY' || downed) return undefined;
    const t = setTimeout(() => setDowned(true), beatMs(KNOCKDOWN_MS, speed));
    return () => clearTimeout(t);
  }, [battle.outcome, downed, speed]);

  const escape = setup.escape ?? !setup.gald;
  return (
    <BattleStage
      battle={battle}
      opponent={opponent}
      locationId="GREENWOOD_FOREST"
      background={setup.background}
      memoryLines={[]}
      memoryDepth={0}
      arcanaReady={false}
      turn={{ beat: theatre.beat, camera: theatre.camera, blows: theatre.blows, playing: theatre.playing }}
      downed={downed}
      say={say}
      speed={speed}
      auto={auto}
      // Drawn so the screen can be judged with them; neither is built.
      onToggleAuto={() => setAuto((on) => !on)}
      onEscape={escape ? () => {} : undefined}
      onCycleSpeed={onCycleSpeed}
      onCommand={onCommand}
      magic={{ spells, onCast: cast }}
      items={{ bag, onUse: drink }}
      onAwakeningDone={() => setBattle((b) => clearAwakeningLines(b))}
      testId="battle-preview"
    />
  );
}

const ANSWERS: { id: Answer; label: string }[] = [
  { id: 'CORE', label: 'おまかせ' },
  { id: 'ATTACK', label: '攻撃' },
  { id: 'SKILL', label: '技' },
  { id: 'NONE', label: 'なし' },
];

/**
 * THE KNOBS, ON THE SCREEN — a phone has no address bar to type
 * `&enemy=gald` into. Folded to one small chip until it is wanted, and
 * drawn over everything, choice panels included, because it is not part
 * of the screen being judged.
 */
function DebugPanel({
  open,
  onToggle,
  setup,
  speed,
  lastTurn,
  onChange,
  onReplay,
}: {
  open: boolean;
  onToggle: () => void;
  setup: Setup;
  speed: BattleSpeed;
  lastTurn: { ms: number; speed: BattleSpeed } | null;
  onChange: (patch: Partial<Setup>) => void;
  onReplay: () => void;
}) {
  const bgIndex = setup.background ? BATTLE_BACKGROUND_KEYS.indexOf(setup.background) : 0;
  const nextBg = BATTLE_BACKGROUND_KEYS[(bgIndex + 1) % BATTLE_BACKGROUND_KEYS.length];
  const answerIndex = ANSWERS.findIndex((a) => a.id === setup.answer);
  const nextAnswer = ANSWERS[(answerIndex + 1) % ANSWERS.length];
  return (
    <div style={styles.wrap} data-testid="debug-panel">
      <button style={styles.chip} data-testid="debug-toggle" onClick={onToggle}>
        DEBUG {open ? '▴' : '▾'}
        {lastTurn && (
          <span data-testid="debug-last-turn">
            {' '}
            ・直前のターン {(lastTurn.ms / 1000).toFixed(2)}秒（×{lastTurn.speed}）
          </span>
        )}
      </button>
      {open && (
        <div style={styles.box}>
          <button style={styles.btn} data-testid="debug-replay" onClick={onReplay}>
            もう一度（最初から）
          </button>
          <button style={styles.btn} data-testid="debug-enemy" onClick={() => onChange({ gald: !setup.gald })}>
            敵：{setup.gald ? 'ガルド' : 'モスラビット'}
          </button>
          <button
            style={styles.btn}
            data-testid="debug-magic"
            disabled={setup.gald}
            onClick={() => onChange({ magic: !setup.magic })}
          >
            魔法：{setup.gald ? '戦闘中に目覚める' : setup.magic ? 'あり' : 'なし'}
          </button>
          <button style={styles.btn} data-testid="debug-bag" onClick={() => onChange({ bag: !setup.bag })}>
            持ち物：{setup.bag ? '全種1つずつ' : 'なし'}
          </button>
          <button style={styles.btn} data-testid="debug-bg" onClick={() => onChange({ background: nextBg })}>
            背景：{setup.background ?? 'FOREST'}
          </button>
          <button style={styles.btn} data-testid="debug-answer" onClick={() => onChange({ answer: nextAnswer.id })}>
            敵の行動：{ANSWERS[answerIndex].label}
          </button>
          <p style={styles.note}>
            速度 ×{speed}（右下のチップで切替）。上の「直前のターン」は、押してから次に押せるまでの時間。
            オート（AUTO）はまだ作っていないので、1ターンずつ押して比べてください。保存はされません。
          </p>
          <button
            style={styles.btn}
            data-testid="debug-exit"
            onClick={() => window.location.assign(window.location.pathname)}
          >
            タイトルへ戻る
          </button>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  wrap: {
    position: 'fixed',
    top: 'calc(4px + env(safe-area-inset-top))',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1000,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    font: '12px system-ui, sans-serif',
  },
  chip: {
    minHeight: 28,
    padding: '2px 12px',
    border: '1px solid #e0b84a',
    borderRadius: 14,
    background: 'rgba(60, 20, 0, 0.85)',
    color: '#ffd76a',
    letterSpacing: '0.1em',
  },
  box: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 4,
    width: 'min(420px, calc(100vw - 24px))',
    maxHeight: 'calc(100vh - 48px)',
    overflowY: 'auto',
    padding: 8,
    border: '1px solid #e0b84a',
    borderRadius: 8,
    background: 'rgba(20, 12, 4, 0.94)',
  },
  btn: {
    minHeight: 44,
    padding: '4px 8px',
    border: '1px solid rgba(224, 184, 74, 0.6)',
    borderRadius: 6,
    background: 'rgba(255, 255, 255, 0.06)',
    color: '#fff3d0',
    font: 'inherit',
    textAlign: 'left',
  },
  note: {
    gridColumn: '1 / -1',
    margin: 0,
    color: '#d8c79a',
  },
};
