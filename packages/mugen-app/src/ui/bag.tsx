import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { categoryLabel, type ItemDef } from '@mugen/core/economy/items';
import { itemRefusalLine, refuseUse } from '@mugen/game/battle/battleLogic';
import { BATTLE_HP_HOLDER, BATTLE_MP_HOLDER } from '@mugen/core/party/condition';

/**
 * THE BAG — what is being carried, and whether it can be used here.
 *
 * Every judgement on this screen is the shared core's. What may be
 * used is `refuseUse`, the same function the fight's own tray asks;
 * the REASON it may not is `itemRefusalLine`, so the sentence a player
 * reads here and the sentence they read mid-fight are one string in
 * one file. The use itself is `world.useItemFromBag`, which is a
 * single commit covering the effect, the count and the save together.
 *
 * Nothing here decides anything. If this screen and the battle ever
 * disagreed about whether a herb can be drunk, it would be a bug in
 * the core rather than a difference of opinion between two screens —
 * which is the entire reason it is written this way.
 */
export function BagScreen({ world, onBack }: { world: World; onBack: () => void }) {
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const party = world.getPartyCondition();
  const bag = world.getInventory();

  /**
   * Who an item would go to, and what state they are in.
   *
   * The same choice `useItemFromBag` makes internally — health to the
   * front rank, magic to her — read here so the button can say
   * beforehand what the world would answer afterwards.
   */
  const situationFor = (def: ItemDef) => {
    if (!def.use) return null;
    const on = def.use.kind === 'HEAL' ? BATTLE_HP_HOLDER : BATTLE_MP_HOLDER;
    const them = party[on];
    if (!them) return null;
    return {
      place: 'FIELD' as const,
      hp: them.currentHp,
      maxHp: them.maxHp,
      mp: them.currentMp,
      maxMp: them.maxMp,
    };
  };

  const use = (itemId: string) => {
    if (busy) return;
    setBusy(true);
    void world
      .useItemFromBag(itemId)
      .then((result) => {
        setSaid(
          result.ok
            ? `${result.name}をつかった。${result.stat}が${result.given}回復した。`
            : result.refusal
              ? itemRefusalLine(result.refusal, result.name)
              : `${result.name}はつかえなかった。`,
        );
      })
      .catch(() => setSaid('つかえなかった。'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="screen bag" data-testid="bag-screen">
      <h1 className="place">持ち物</h1>
      {bag.length === 0 && (
        <p className="line" data-testid="bag-empty">
          なにも持っていない。
        </p>
      )}
      <ul className="bag-list">
        {bag.map((stack) => {
          const def = itemDef(stack.itemId);
          if (!def) return null;
          const where = situationFor(def);
          // No `use` block at all is a thing that is carried and not
          // drunk — the acorn. That is not a refusal, so it is not
          // phrased as one.
          const refusal = def.use && where ? refuseUse(where, def.use, stack.quantity) : null;
          const usableHere = Boolean(def.use) && where !== null && refusal === null;
          return (
            <li className="bag-row" key={stack.itemId} data-testid={`bag-row-${stack.itemId}`}>
              <span className="bag-name" data-testid={`bag-name-${stack.itemId}`}>
                {def.name}
              </span>
              <span className="bag-count" data-testid={`bag-count-${stack.itemId}`}>
                ×{stack.quantity}
              </span>
              <span className="bag-category">{categoryLabel(def.category)}</span>
              <span className="bag-desc" data-testid={`bag-desc-${stack.itemId}`}>
                {def.description}
              </span>
              {usableHere ? (
                <button
                  className="btn"
                  data-testid={`bag-use-${stack.itemId}`}
                  disabled={busy}
                  onClick={() => use(stack.itemId)}
                >
                  使う
                </button>
              ) : (
                <span className="bag-reason" data-testid={`bag-reason-${stack.itemId}`}>
                  {def.use && where
                    ? itemRefusalLine(refusal!, def.name)
                    : 'ここでは使えない。'}
                </span>
              )}
            </li>
          );
        })}
      </ul>
      {said && (
        <p className="say" data-testid="bag-message">
          {said}
        </p>
      )}
      <button className="btn primary" data-testid="bag-back" onClick={onBack}>
        もどる
      </button>
    </div>
  );
}
