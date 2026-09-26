import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  castMagic,
  clearAwakeningLines,
  createBattle,
  playerAttack,
  playerDefend,
  refuseItem,
  useItem,
  type BattleState,
} from '@mugen/game/battle/battleLogic';
import type { EnemySpec } from '@mugen/game/battle/battleLogic';
import { magicBlocked } from '@mugen/game/battle/magicChoice';
import {
  DEFAULT_BATTLE_SPEED,
  beatMs,
  nextSpeed,
  type BattleSpeed,
} from '@mugen/game/battle/battleSpeed';
import { availableMagic } from '@mugen/core/magic/magic';
import { kaosHasAwakened } from '@mugen/core/magic/awakened';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { ARCANA_DEFS } from '@mugen/content/arcana/arcanaDefs';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { memoryEventLabel } from '@mugen/content/events/creatureLifeChoice';
import type { LocationId } from '@mugen/content/locations/locationVisuals';
import { statsForLevels } from '@mugen/core/progression/levelStats';
import type { AppliedReward } from '@mugen/core/progression/battleReward';
import type { World } from '@mugen/core/world/world';
import type { BattleBackgroundKey } from '@mugen/assets/keys';
import { BattleStage, type BattleCommand, type BattleOpponentView } from './battle/BattleStage';
import {
  DEFEAT_WAIT_MS,
  KNOCKDOWN_MS,
  VICTORY_WAIT_MS,
  useBattleTheatre,
  type TurnKind,
} from './battle/battleTheatre';
import { arcanaReading } from './battle/arcanaDepth';

/**
 * THE FIGHT, DRIVEN BY THE SHARED CORE AND NOTHING ELSE.
 *
 * Every number on this screen comes from `@mugen/game/battle` —
 * `createBattle`, `playerAttack`, `playerDefend`, `castMagic`,
 * `useItem` — which is the same code, in the same file, that the
 * Artifact's battle runs on. There is no second damage calculation, no
 * second enemy definition, no second idea of what a spell costs and no
 * second idea of what a herb is worth. What is different is only what
 * is drawn, which is the thing an app is allowed to differ about.
 *
 * It carries the party's condition in and hands what is left back out,
 * exactly as the Artifact does, so a wound taken here is a wound the
 * village still shows.
 */
export function BattleScreen({
  world,
  spec,
  opponent,
  locationId,
  onWon,
  onLost,
  music,
  background = null,
}: {
  world: World;
  /**
   * WHO IS BEING FOUGHT, handed in rather than decided here: the moss
   * rabbit and the story's Gald differ in their numbers and nothing else.
   */
  spec: EnemySpec;
  /** How they are drawn: whose pictures, how near, what they say beaten. */
  opponent: BattleOpponentView;
  /** Where — the place's name on the screen. */
  locationId: LocationId;
  onWon: (final: { hp: number; mp: number }) => void;
  onLost: () => void;
  music?: { label: string; onCycle: () => void };
  /** The ground the fight is fought on (content/locations/battleBackgrounds). */
  background?: BattleBackgroundKey | null;
}) {
  // The bag can change mid-fight, so this screen watches the world.
  useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.getVersion(),
  );
  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(spec, undefined, {
      stats: statsForLevels(world.getLevel('hero'), world.getLevel('kaos')),
      condition: world.getBattleCondition(),
      /**
       * WHETHER SHE HAS WOKEN, ASKED OF THE WORLD — the core's own
       * reading of what the world remembers, as the Artifact asks it.
       */
      magicUnlocked: kaosHasAwakened(world.getKnownEvents().map((e) => e.type)),
    }),
  );

  // HOW FAST IT IS WATCHED — this fight only, starting at ×1, as in the
  // Artifact. It changes the showing, never the fighting.
  const [speed, setSpeed] = useState<BattleSpeed>(DEFAULT_BATTLE_SPEED);
  // His 攻撃 is v18's (STEP 3, checked on a device): the walk to the
  // creature, the swing with the sword's trail and bite, the walk back.
  const theatre = useBattleTheatre(speed, { slash: true });

  /**
   * One thing at a time. Using an item writes to the save first, and
   * until it has, the bag still shows the old count — a second tap in
   * that window would drink one herb twice.
   */
  const [busy, setBusy] = useState(false);
  const [say, setSay] = useState<{ name: string; line: string; result: string } | null>(null);
  /** A spell's result line (BattleStage `told`), until the next command. */
  const [told, setTold] = useState<string | null>(null);
  /** The creature has finished going down. */
  const [downed, setDowned] = useState(false);
  /** What the party carries out, fixed the moment the fight is decided. */
  const ended = useRef<{ hp: number; mp: number } | null>(null);

  const spells = availableMagic(MAGIC_DEFS, { awakened: battle.magicUnlocked });
  const carried = world.getInventory().filter((stack) => itemDef(stack.itemId)?.use);
  const reading = arcanaReading(ARCANA_DEFS, world.getArcanaRecords());
  const memoryLines = world.getKnownEvents().map((e) => memoryEventLabel(e));

  /** A turn the core has decided: kept, and shown. */
  const turn = (next: BattleState, kind: TurnKind) => {
    const before = battle;
    setBattle(next);
    if (next.outcome !== 'ONGOING' && !ended.current) {
      ended.current = { hp: next.playerHp, mp: next.playerMp };
    }
    theatre.playTurn(before, next, kind);
  };

  const idle = battle.outcome === 'ONGOING' && !busy && !theatre.playing;

  const onCommand = (command: BattleCommand) => {
    if (!idle) return;
    setSay(null);
    setTold(null);
    if (command === 'ATTACK') turn(playerAttack(battle), 'ATTACK');
    if (command === 'DEFEND') turn(playerDefend(battle), 'DEFEND');
    // SKILL opens its own (empty) tray; ARCANA is locked in the App.
  };

  /**
   * HER SPELL: decided by the core in one call, as always, and then shown
   * in full — her cut-in with the spell's name, her aura, the landing, the
   * creature's answer (battleTheatre.playSpell). When it lands, the plate
   * says what it did in the battle's own words, as an item's does.
   */
  const cast = (id: string) => {
    if (!idle) return;
    const magic = spells.find((m) => m.id === id);
    if (!magic || magicBlocked(battle, magic) !== null) return;
    setSay(null);
    setTold(null);
    const before = battle;
    const next = castMagic(battle, magic);
    setBattle(next);
    if (next.outcome !== 'ONGOING' && !ended.current) {
      ended.current = { hp: next.playerHp, mp: next.playerMp };
    }
    // Only the battle's own result sentence — the line that names the
    // spell ("《彗星撃》！ …のダメージ。") — shown light, once it lands.
    const result = next.log.slice(before.log.length).find((l) => l.includes(`《${magic.name}》`));
    theatre.playSpell(before, next, magic, () => setTold(result ?? `《${magic.name}》`));
  };

  /**
   * What is drawn: the battle as it is — except while a spell is still on
   * its way, when it is the battle as it was. The end of the fight waits
   * for the same moment, so nothing falls down before it has been hit.
   */
  // Her MP is spent the moment the spell is decided — before her cut-in —
  // as the order of a cast has it; everything the spell DOES waits for it
  // to land.
  const shown = theatre.holding ? { ...theatre.holding, playerMp: battle.playerMp } : battle;

  const drink = (itemId: string) => {
    if (!idle) return;
    const def = itemDef(itemId);
    if (!def?.use) return;
    // Refused HERE, before anything is spent, by the same function the
    // tray greys its button with.
    if (refuseItem(battle, def.use, world.getItemCount(itemId)) !== null) return;
    setBusy(true);
    setSay(null);
    setTold(null);
    const before = battle;
    void world
      .removeItem(itemId, 1)
      .then((moved) => {
        // Nothing left the bag, so nothing happens in the fight either.
        if (moved <= 0) return;
        const next = useItem(before, def.use!);
        turn(next, 'ITEM');
        const said = next.log.slice(before.log.length);
        setSay({ name: def.name, line: said[0] ?? def.use!.line, result: said[1] ?? '' });
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  /**
   * DECIDED, AND THEN SHOWN BEING DECIDED — the Artifact's order and
   * waits. A lost fight sits a moment and moves on. A won one lets the
   * creature go down, lets its line be read, and then hands back what
   * the party carries out. Every wait is cleared if the screen goes.
   */
  useEffect(() => {
    if (shown.outcome === 'DEFEAT') {
      const t = setTimeout(onLost, beatMs(DEFEAT_WAIT_MS, speed));
      return () => clearTimeout(t);
    }
    if (shown.outcome === 'VICTORY' && !downed) {
      const t = setTimeout(() => setDowned(true), beatMs(KNOCKDOWN_MS, speed));
      return () => clearTimeout(t);
    }
    if (shown.outcome === 'VICTORY' && downed) {
      const t = setTimeout(
        () => onWon(ended.current ?? { hp: battle.playerHp, mp: battle.playerMp }),
        beatMs(VICTORY_WAIT_MS, speed),
      );
      return () => clearTimeout(t);
    }
    return undefined;
    // The handlers are the parent's and stable in effect; the fight's
    // outcome and the fall are what these waits hang on.
  }, [shown.outcome, downed, speed]);

  return (
    <BattleStage
      battle={shown}
      opponent={opponent}
      locationId={locationId}
      background={background}
      memoryLines={memoryLines}
      memoryDepth={reading.depth}
      arcanaReady={reading.anyComplete}
      turn={{
        beat: theatre.beat,
        camera: theatre.camera,
        blows: theatre.blows,
        playing: theatre.playing || busy,
      }}
      downed={downed}
      say={say}
      told={told}
      speed={speed}
      onCycleSpeed={() => setSpeed((at) => nextSpeed(at))}
      onCommand={onCommand}
      magic={{ spells, onCast: cast }}
      items={{ bag: carried, onUse: drink }}
      onAwakeningDone={() => setBattle((b) => clearAwakeningLines(b))}
      spell={theatre.spell}
      cinematic={theatre.cinematic}
      slash={theatre.slash}
      swordplay
      reach={theatre.reach}
      bgm={music}
      testId="battle-screen"
    />
  );
}

export function ResultScreen({
  reward,
  onDone,
}: {
  reward: AppliedReward;
  onDone: () => void;
}) {
  return (
    <div className="screen result">
      <h1 className="place">BATTLE RESULT</h1>
      <p className="row" data-testid="result-exp">
        EXP +{reward.exp}
      </p>
      <p className="row" data-testid="result-lumi">
        LUMI +{reward.lumi}
      </p>
      <p className="row" data-testid="result-items">
        {reward.items.length === 0
          ? 'ITEM なし'
          : reward.items.map((i) => `${i.itemId} ×${i.quantity}`).join(' / ')}
      </p>
      {reward.levels.length > 0 && (
        <p className="row level" data-testid="result-levels">
          {reward.levels.map((l) => `${l.label} Lv.${l.from} → Lv.${l.to}`).join(' / ')}
        </p>
      )}
      <button className="btn primary" data-testid="result-done" onClick={onDone}>
        もどる
      </button>
    </div>
  );
}
