import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  castMagic,
  clearAwakeningLines,
  createBattle,
  playerAttack,
  playerDefend,
  playerSkill,
  skillReadyIn,
  refuseItem,
  useItem,
  NO_MODIFIERS,
  type BattleState,
} from '@mugen/game/battle/battleLogic';
import { breadInBattle } from '@mugen/core/economy/bread';
import type { EnemySpec } from '@mugen/game/battle/battleLogic';
import { decideTurn, magicBlocked } from '@mugen/game/battle/magicChoice';
import { autoHealPlan } from '@mugen/game/battle/autoHeal';
import { HERO_STARTING_SKILLS } from '@mugen/content/skills/heroSkills';
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
import { playSfx } from '../platform/audio';
import { bossCutInFor } from './battle/cutin/bossCutIn';

/** AUTO's breath between one shown turn and the next, at ×1 — the Artifact's. */
const AUTO_GAP_MS = 550;

/** What each of his skills says of itself in the tray. */
const SKILL_NOTE: Record<string, string> = {
  shundan: '通常攻撃の2倍・3ターンに1回',
};

/** How long the escape is heard before the fight is gone, at ×1. */
export const ESCAPE_WAIT_MS = 520;

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
  onEscape,
  music,
  background = null,
  autoAvailable = false,
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
  locationId: LocationId | 'ANCIENT_RUINS';
  onWon: (final: { hp: number; mp: number }) => void;
  onLost: () => void;
  /**
   * 逃げる — back to where the fight began, as if it had not happened.
   * Absent for a fight that cannot be fled (the story's).
   */
  onEscape?: () => void;
  music?: { label: string; onCycle: () => void };
  /** The ground the fight is fought on (content/locations/battleBackgrounds). */
  background?: BattleBackgroundKey | null;
  /**
   * AUTO is open to this world (after Gald's fight). Absent or false: no
   * AUTO chip at all.
   */
  autoAvailable?: boolean;
}) {
  // The bag can change mid-fight, so this screen watches the world.
  useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.getVersion(),
  );
  const [battle, setBattle] = useState<BattleState>(() => {
    const firstStrike = world.getHeroFirstStrike();
    // A LOAF'S LIFT (パン屋 MVP), until the next night's rest: a twentieth
    // less taken, or a twentieth more health or magic. Nothing else moves.
    const base = world.getPartyStats();
    const bread = breadInBattle(world.getBreadBuff(), base);
    // The longer bar comes filled by what it added; what the fight leaves is
    // written back within the ordinary bar, as always.
    const left = world.getBattleCondition();
    return createBattle(spec, bread.damageTaken === 1 ? undefined : { ...NO_MODIFIERS, playerDamageTaken: bread.damageTaken }, {
      // Levels, and what his held weapon adds to his swing.
      stats: bread.stats,
      condition: {
        hp: left.hp + (bread.stats.maxHp - base.maxHp),
        mp: left.mp + (bread.stats.maxMp - base.maxMp),
      },
      // His held weapon's first-strike (星紋の遺剣's 先手の一閃), if any.
      ...(firstStrike ? { firstStrike } : {}),
      /**
       * WHETHER SHE HAS WOKEN, ASKED OF THE WORLD — the core's own
       * reading of what the world remembers, as the Artifact asks it.
       */
      magicUnlocked: kaosHasAwakened(world.getKnownEvents().map((e) => e.type)),
    });
  });

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
  /** What was drunk in this fight, so fleeing it can put it back. */
  const drunk = useRef(new Map<string, number>());

  const spells = availableMagic(MAGIC_DEFS, { awakened: battle.magicUnlocked });
  // Bread is eaten on the road, not in a fight (パン屋 MVP): not in the tray.
  const carried = world.getInventory().filter((stack) => {
    const def = itemDef(stack.itemId);
    return !!def?.use && !def.bread;
  });
  const reading = arcanaReading(ARCANA_DEFS, world.getArcanaRecords());
  const memoryLines = world.getKnownEvents().map((e) => memoryEventLabel(e));

  /** A turn the core has decided: kept, and shown. */
  const turn = (next: BattleState, kind: TurnKind) => {
    const before = battle;
    setBattle(next);
    if (next.outcome !== 'ONGOING' && !ended.current) {
      ended.current = { hp: next.playerHp, mp: next.playerMp };
    }
    // A boss's one great move gets its cut-in, between his turn and its answer.
    const cutIn = bossCutInFor(opponent.artId, next);
    theatre.playTurn(before, next, kind, { skill: kind === 'SKILL', ...(cutIn ? { answerCutIn: cutIn } : {}) });
  };

  const idle = battle.outcome === 'ONGOING' && !busy && !theatre.playing;

  const onCommand = (command: BattleCommand) => {
    if (!idle) return;
    setSay(null);
    setTold(null);
    if (command === 'ATTACK') turn(playerAttack(battle), 'ATTACK');
    if (command === 'DEFEND') turn(playerDefend(battle), 'DEFEND');
    // SKILL opens its tray (his skills, below); ARCANA is locked in the App.
  };

  /**
   * ONE OF HIS SKILLS (《瞬断》): decided by the core like any swing, shown
   * as his swing with its own trail and sound. Using it is looking at it:
   * its NEW is cleared.
   */
  const swingSkill = (id: string) => {
    if (!idle) return;
    const skill = HERO_STARTING_SKILLS.find((k) => k.id === id);
    if (!skill || skillReadyIn(battle, skill) > 0) return;
    setSay(null);
    setTold(null);
    turn(playerSkill(battle, skill), 'SKILL');
    void world.markRead([`skill:${id}`]).catch(() => {});
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
        drunk.current.set(itemId, (drunk.current.get(itemId) ?? 0) + moved);
        const next = useItem(before, def.use!);
        turn(next, 'ITEM');
        const said = next.log.slice(before.log.length);
        setSay({ name: def.name, line: said[0] ?? def.use!.line, result: said[1] ?? '' });
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  /**
   * 逃げる: BACK TO BEFORE THE FIGHT.
   *
   * Nothing a fight changes is kept unless it is won: its wounds and the
   * MP it cost are only ever handed back by a win, so fleeing simply
   * never hands them back — the party is as it was when it walked in.
   * The one thing that has already left is anything drunk from the bag,
   * and that is put back before leaving. No EXP, no LUMI, nothing found.
   * Only between turns, and only once.
   */
  const escape = () => {
    if (!idle || !onEscape) return;
    setBusy(true);
    setSay(null);
    setTold(null);
    playSfx('battle_escape', { speed });
    const back = [...drunk.current].map(([itemId, n]) => world.addItem(itemId, n));
    drunk.current.clear();
    const leave = new Promise((resolve) => setTimeout(resolve, beatMs(ESCAPE_WAIT_MS, speed)));
    void Promise.all([...back, leave])
      .catch(() => {})
      .finally(() => onEscape());
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

  /**
   * AUTO — open once Gald's fight is behind the player (`autoAvailable`).
   * Each turn, once the last one has been shown: brace if the creature is
   * gathering itself (its roar); else, hurt to 35%, mend (core/autoHeal —
   * her spell, else 薬草／上薬草 from the bag); else the core's own AUTO brain
   * (`decideTurn`, the Artifact's) — and a swing becomes 《瞬断》 whenever
   * it has come round. Never through her awakening. Off clears the timer
   * and nothing else, so the next tap is a hand-played turn.
   */
  const [auto, setAuto] = useState(false);
  useEffect(() => {
    if (!auto || !idle || battle.awakeningLines.length > 0) return;
    const t = window.setTimeout(() => {
      if (battle.enemyCharging) return onCommand('DEFEND');
      // Hurt (35% or less): her mending spell if she can, else a herb from
      // the bag — through the same path as a tapped one (one fewer, saved).
      const heal = autoHealPlan(battle, spells, world.getInventory(), itemDef);
      if (heal?.kind === 'MAGIC') return cast(heal.magicId);
      if (heal?.kind === 'ITEM') return drink(heal.itemId);
      const plan = decideTurn(battle, spells);
      if (plan.action === 'MAGIC' && plan.magicId) return cast(plan.magicId);
      if (plan.action === 'GUARD') return onCommand('DEFEND');
      const ready = HERO_STARTING_SKILLS.find((k) => skillReadyIn(battle, k) === 0);
      if (ready) return swingSkill(ready.id);
      return onCommand('ATTACK');
    }, beatMs(AUTO_GAP_MS, speed));
    return () => clearTimeout(t);
    // The handlers read the same `battle` this already watches; listing them
    // would re-arm the timer on every repaint (as the Artifact's notes say).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, idle, battle, speed]);

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
      onEscape={onEscape ? escape : undefined}
      skills={{
        list: HERO_STARTING_SKILLS.map((k) => ({
          id: k.id,
          name: k.name,
          note: SKILL_NOTE[k.id] ?? '',
          readyIn: skillReadyIn(battle, k),
          isNew: !world.isRead(`skill:${k.id}`),
        })),
        onUse: swingSkill,
      }}
      skillSwing={theatre.skillSwing}
      frost={theatre.frost !== null}
      auto={auto}
      onToggleAuto={autoAvailable ? () => setAuto((on) => !on) : undefined}
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
    <div className="screen result paper">
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
          : reward.items.map((i) => `${itemDef(i.itemId)?.name ?? i.itemId} ×${i.quantity}`).join(' / ')}
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
