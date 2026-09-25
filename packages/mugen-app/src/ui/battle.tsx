import { useState, useSyncExternalStore } from 'react';
import {
  castMagic,
  clearAwakeningLines,
  createBattle,
  itemRefusalLine,
  playerAttack,
  playerDefend,
  refuseItem,
  useItem,
  type BattleState,
} from '@mugen/game/battle/battleLogic';
import type { EnemySpec } from '@mugen/game/battle/battleLogic';
import { availableMagic } from '@mugen/core/magic/magic';
import { kaosHasAwakened } from '@mugen/core/magic/awakened';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { statsForLevels } from '@mugen/core/progression/levelStats';
import type { AppliedReward } from '@mugen/core/progression/battleReward';
import type { World } from '@mugen/core/world/world';
import type { BattleBackgroundKey } from '@mugen/assets/keys';
import { battleBackgroundArt } from '../assets/battleBackground';
import { usePicture } from './scene';

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
  onWon,
  onLost,
  music,
  background = null,
}: {
  world: World;
  /**
   * WHO IS BEING FOUGHT, handed in rather than decided here.
   *
   * Two fights arrive on this screen — a moss rabbit in the forest and
   * the one the story turns on — and they differ in their numbers and
   * in nothing else. Choosing between them is the caller's business;
   * `GALD_BATTLE` and `specOf(MOSS_RABBIT)` are both content, and this
   * screen is not allowed an opinion about which it is looking at.
   */
  spec: EnemySpec;
  onWon: (final: { hp: number; mp: number }) => void;
  onLost: () => void;
  /**
   * THE ♪ CONTROL, or nothing.
   *
   * Absent means there is nothing to choose — a fight that brought its
   * own music, or a save that has won only the one piece — and the
   * control is then not drawn at all rather than drawn and refusing.
   * Which it is is the caller's to decide; this screen only shows it.
   */
  music?: { label: string; onCycle: () => void };
  /**
   * The ground the fight is fought on — a battle background key, from
   * content (content/locations/battleBackgrounds). Drawn behind the
   * fight and dimmed like every place's backdrop, so nothing on this
   * screen is harder to read. Null: the plain ground.
   */
  background?: BattleBackgroundKey | null;
}) {
  const ground = usePicture(
    background ? () => battleBackgroundArt(background) : null,
    `battle-bg:${background ?? 'none'}`,
  );
  const backdrop = ground && (
    <img
      className="backdrop"
      src={ground}
      alt=""
      aria-hidden="true"
      data-testid="battle-bg"
      data-background={background ?? undefined}
    />
  );
  // The bag can change mid-fight, so this screen watches the world the
  // same way the shell does rather than reading a stale copy.
  useSyncExternalStore(
    (cb) => world.subscribe(cb),
    () => world.getVersion(),
  );
  const [battle, setBattle] = useState<BattleState>(() =>
    createBattle(spec, undefined, {
      stats: statsForLevels(world.getLevel('hero'), world.getLevel('kaos')),
      condition: world.getBattleCondition(),
      /**
       * WHETHER SHE HAS WOKEN, ASKED OF THE WORLD.
       *
       * A creature with no awakening beat of its own — a moss rabbit —
       * never turns magic on mid-fight, so a fight that started with
       * it off would never have it. Whether Kaos can cast at all is a
       * fact about the WORLD, not about the rabbit, and
       * `kaosHasAwakened` is the core's own reading of it from what
       * the world remembers. The Artifact asks the identical question
       * of the identical function.
       */
      magicUnlocked: kaosHasAwakened(world.getKnownEvents().map((e) => e.type)),
    }),
  );
  /**
   * One action at a time.
   *
   * Spending an item writes to the save, which takes a moment, and
   * during that moment `getItemCount` still reports the old number. A
   * second tap inside the window would pass a refusal check made
   * against a count that no longer exists — one herb drunk twice. The
   * flag closes the window; it is not a spinner.
   */
  const [busy, setBusy] = useState(false);
  const over = battle.outcome !== 'ONGOING';
  const spells = availableMagic(MAGIC_DEFS, { awakened: battle.magicUnlocked });
  const carried = world.getInventory().filter((stack) => itemDef(stack.itemId)?.use);

  const act = (next: BattleState) => {
    setBattle(next);
    if (next.outcome === 'VICTORY') onWon({ hp: next.playerHp, mp: next.playerMp });
    if (next.outcome === 'DEFEAT') onLost();
  };

  const drink = (itemId: string) => {
    if (busy || over) return;
    const def = itemDef(itemId);
    if (!def?.use) return;
    const held = world.getItemCount(itemId);
    // Refused HERE, before anything is spent, and by the same function
    // that greys the button — so the reason shown and the reason it
    // did not happen can never be two different reasons.
    if (refuseItem(battle, def.use, held) !== null) return;
    setBusy(true);
    void world
      .removeItem(itemId, 1)
      .then((moved) => {
        // Nothing left the bag, so nothing happens in the fight
        // either. The alternative is a free drink.
        if (moved > 0) act(useItem(battle, def.use!));
      })
      .catch(() => {})
      .finally(() => setBusy(false));
  };

  // The awakening is a beat, not a line: it is read, then it becomes
  // the log's one-line record. Same order as the Artifact.
  if (battle.awakeningLines.length > 0) {
    return (
      <div className="screen battle" data-testid="awakening">
        {backdrop}
        {/* A speaker and a line, the same pair the Artifact reads out. */}
        {battle.awakeningLines.map((line, i) => (
          <p className="line" key={i}>
            {line.speaker ? `${line.speaker}「${line.text}」` : line.text}
          </p>
        ))}
        <button
          className="btn primary"
          data-testid="awakening-done"
          onClick={() => setBattle((b) => clearAwakeningLines(b))}
        >
          つづける
        </button>
      </div>
    );
  }

  return (
    <div className="screen battle">
      {backdrop}
      <div className="battle-head">
        <h1 className="place">{battle.enemyName}</h1>
        {/* ♪ — WHICH PIECE THIS FIGHT IS FOUGHT TO. It changes one
            preference and nothing else: no turn is taken and the
            battle does not know it happened. */}
        {music && (
          <button
            className="bgm-cycle"
            data-testid="bgm-cycle"
            onClick={music.onCycle}
            aria-label={`戦闘BGMを切り替える（${music.label}）`}
          >
            <span aria-hidden="true">♪</span>
            <span data-testid="bgm-label">{music.label}</span>
          </button>
        )}
      </div>
      <p className="bar" data-testid="enemy-hp">
        敵 HP {battle.enemyHp} / {battle.enemyMaxHp}
      </p>
      <p className="bar" data-testid="player-hp">
        味方 HP {battle.playerHp} / {battle.playerMaxHp} ・ MP {battle.playerMp} /{' '}
        {battle.playerMaxMp}
      </p>
      <p className="log" data-testid="battle-log">
        {battle.log[battle.log.length - 1]}
      </p>
      <div className="actions">
        <button
          className="btn primary"
          data-testid="attack-button"
          disabled={over || busy}
          onClick={() => act(playerAttack(battle))}
        >
          攻撃
        </button>
        <button
          className="btn"
          data-testid="defend-button"
          disabled={over || busy}
          onClick={() => act(playerDefend(battle))}
        >
          防御
        </button>
      </div>

      {battle.magicUnlocked && (
        <div className="actions magic" data-testid="magic-tray">
          {spells.map((magic) => (
            <button
              className="btn"
              key={magic.id}
              data-testid={`magic-${magic.id}`}
              disabled={over || busy || battle.playerMp < magic.mpCost}
              onClick={() => act(castMagic(battle, magic))}
            >
              {magic.name}（MP{magic.mpCost}）
            </button>
          ))}
        </div>
      )}

      <div className="actions items" data-testid="battle-items">
        {carried.length === 0 && (
          <span className="bag-reason" data-testid="battle-items-empty">
            使えるものを持っていない。
          </span>
        )}
        {carried.map((stack) => {
          const def = itemDef(stack.itemId)!;
          const refusal = refuseItem(battle, def.use!, stack.quantity);
          return (
            <button
              className="btn"
              key={stack.itemId}
              data-testid={`battle-item-${stack.itemId}`}
              title={refusal ? itemRefusalLine(refusal, def.name) : undefined}
              disabled={busy || refusal !== null}
              onClick={() => drink(stack.itemId)}
            >
              {def.name} ×{stack.quantity}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * WHAT THE FIGHT WAS WORTH.
 *
 * Handed the reward the WORLD applied rather than one worked out here,
 * so the screen can only ever show what actually landed — the same
 * rule the Artifact's result screen follows and for the same reason.
 */
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
