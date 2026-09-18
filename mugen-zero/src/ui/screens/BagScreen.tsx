import { useEffect, useRef, useState } from 'react';
import { itemDef } from '../../content/economy/itemDefs';
import {
  categoryLabel,
  usableIn,
  useStatLabel,
  type Inventory,
} from '../../core/economy/items';
import { sellPriceOf } from '../../core/economy/shop';
import { itemRefusalLine, refuseUse } from '../../game/battle/battleLogic';
import type { BagUseResult } from '../../core/world/world';
import type { PartyCondition } from '../../core/party/condition';
import type { PartyStats } from '../../core/progression/levelStats';

interface Props {
  inventory: Inventory;
  /** What the party has left, and what they can hold. */
  condition: PartyCondition;
  stats: PartyStats;
  /**
   * ONE CALL, AND THE WORLD DOES ALL OF IT.
   *
   * The thing and the effect land in a single commit on the other side
   * of this, which is the whole reason the screen does not do the
   * arithmetic: a bag that spent the item and then healed could be
   * interrupted between the two, and both halves of that are bugs a
   * player would notice — a herb that vanished without healing, or one
   * that healed for ever.
   */
  onUse: (itemId: string) => Promise<BagUseResult>;
  onBack: () => void;
}

/** How long a line about what just happened stays up. */
const SAID_MS = 2600;

/**
 * 持ち物 — everything the player is carrying, and the things they can
 * do something with.
 *
 * THE SHOP'S SELL TAB WAS NOT THIS. It looked like it: a list of what
 * you own, with numbers. But it is a list of what a shopkeeper will
 * take, which is a different list — a key item is not on it, a pretty
 * acorn is not on it, and a thing that heals is on it for the price of
 * getting rid of it.
 *
 * So this says everything about a thing at once: what it is, how many,
 * what kind of thing it is, what it does, whether it can be used right
 * now, and whether anybody will buy it. A thing that CAN be used here
 * has a 使う beside it; a thing that cannot keeps the row and loses
 * the button, because "there is nothing to heal" is information and a
 * missing row is not.
 */
export function BagScreen({ inventory, condition, stats, onUse, onBack }: Props) {
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  const say = (text: string) => {
    setSaid(text);
    if (timer.current !== null) window.clearTimeout(timer.current);
    // It goes away on its own. A line about a herb is not a thing to
    // dismiss, and one that stayed would still be there next time.
    timer.current = window.setTimeout(() => setSaid(null), SAID_MS);
  };

  const rows = inventory
    .map((stack) => ({ stack, def: itemDef(stack.itemId) }))
    .filter((row): row is { stack: (typeof inventory)[number]; def: NonNullable<typeof row.def> } =>
      row.def !== null,
    );

  const use = async (itemId: string, name: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await onUse(itemId);
      if (result.ok) {
        // The world's own numbers, not a repeat of the arithmetic.
        say(`${result.name}を使った。${result.stat}が${result.given}回復した。`);
      } else if (result.refusal) {
        say(itemRefusalLine(result.refusal, result.name));
      }
    } catch {
      // A save that would not take it is not a reason to lose the
      // screen. Nothing was spent — the world commits both halves
      // together or neither — so this is honest.
      say(`${name}は 今は使えない。`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="screen-title">持ち物</div>
      {/* What there is to put back, so a refusal is never a surprise. */}
      <p className="bag-condition" data-testid="bag-condition">
        HP {condition.hp} / {stats.maxHp} ・ MP {condition.mp} / {stats.maxMp}
      </p>
      {rows.length === 0 ? (
        <p className="bag-empty" data-testid="bag-empty">
          何も持っていない。
        </p>
      ) : (
        <div className="bag-list" data-testid="bag-list">
          {rows.map(({ stack, def }) => {
            const price = sellPriceOf(def);
            const here =
              def.use && usableIn(def.use.where, 'FIELD')
                ? refuseUse(
                    {
                      place: 'FIELD',
                      hp: condition.hp,
                      maxHp: stats.maxHp,
                      mp: condition.mp,
                      maxMp: stats.maxMp,
                    },
                    def.use,
                    stack.quantity,
                  )
                : null;
            return (
              <div className="bag-row" key={stack.itemId} data-testid={`bag-${stack.itemId}`}>
                <div className="bag-head">
                  <span className="bag-name">{def.name}</span>
                  <span className="bag-count" data-testid={`bag-count-${stack.itemId}`}>
                    ×{stack.quantity}
                  </span>
                </div>
                <div className="bag-tags">
                  <span className="bag-tag" data-testid={`bag-category-${stack.itemId}`}>
                    {categoryLabel(def.category)}
                  </span>
                  <span
                    className={def.use ? 'bag-tag can' : 'bag-tag'}
                    data-testid={`bag-use-${stack.itemId}`}
                  >
                    {def.use
                      ? `${useStatLabel(def.use.kind)} +${def.use.amount}`
                      : '使えない'}
                  </span>
                  <span className="bag-tag" data-testid={`bag-sell-${stack.itemId}`}>
                    {def.isKeyItem
                      ? '売れない（大切なもの）'
                      : price > 0
                        ? `売値 ${price} LUMI`
                        : '売れない'}
                  </span>
                </div>
                <p className="bag-desc">{def.description}</p>
                {/* ONLY FOR SOMETHING THIS PLACE CAN DO ANYTHING WITH.
                    A thing that is no use out here has no button at
                    all — a disabled 使う on an acorn is a promise the
                    game has no intention of keeping. A thing that IS
                    usable here and simply cannot be right now keeps
                    its button and wears the reason. */}
                {def.use && usableIn(def.use.where, 'FIELD') && (
                  <button
                    className="btn bag-use"
                    data-testid={`bag-use-button-${stack.itemId}`}
                    disabled={here !== null || busy}
                    onClick={() => void use(stack.itemId, def.name)}
                  >
                    {here === null ? '使う' : itemRefusalLine(here, def.name)}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {/* One line, and it goes away on its own. */}
      {said && (
        <p className="bag-said" data-testid="bag-said" role="status">
          {said}
        </p>
      )}
      <div className="screen-footer">
        <button className="btn" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
