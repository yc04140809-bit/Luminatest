import { itemDef } from '../../content/economy/itemDefs';
import { categoryLabel, useStatLabel, type Inventory } from '../../core/economy/items';
import { sellPriceOf } from '../../core/economy/shop';

interface Props {
  inventory: Inventory;
  onBack: () => void;
}

/**
 * 持ち物 — everything the player is carrying, in one place.
 *
 * THE SHOP'S SELL TAB WAS NOT THIS. It looked like it: a list of what
 * you own, with numbers. But it is a list of what a shopkeeper will
 * take, which is a different list — a key item is not on it, a pretty
 * acorn is not on it, and a thing that heals is on it for the price of
 * getting rid of it. A player who wants to know what they are carrying
 * should not have to walk to a counter and read the answer sideways.
 *
 * So this says everything about a thing at once: what it is, how many,
 * what kind of thing it is, what it does, whether it can be used right
 * now, and whether anybody will buy it. Nothing here is a button that
 * does something to the world — the bag is for LOOKING, and the one
 * place a consumable is worth spending is a fight. That refusal is
 * stated rather than implied, because 「戦いの中でしか使えない」 is
 * information and a greyed-out button is not.
 */
export function BagScreen({ inventory, onBack }: Props) {
  const rows = inventory
    .map((stack) => ({ stack, def: itemDef(stack.itemId) }))
    .filter((row): row is { stack: (typeof inventory)[number]; def: NonNullable<typeof row.def> } =>
      row.def !== null,
    );

  return (
    <div className="screen">
      <div className="screen-title">持ち物</div>
      {rows.length === 0 ? (
        <p className="bag-empty" data-testid="bag-empty">
          何も持っていない。
        </p>
      ) : (
        <div className="bag-list" data-testid="bag-list">
          {rows.map(({ stack, def }) => {
            const price = sellPriceOf(def);
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
                      ? `戦闘中に使える — ${useStatLabel(def.use.kind)} +${def.use.amount}`
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
              </div>
            );
          })}
        </div>
      )}
      {/* Said once, under the list, rather than on every row that could
          be used: it is a rule about the game, not a fact about a herb. */}
      {rows.some((row) => row.def.use) && (
        <p className="bag-note" data-testid="bag-note">
          使えるものは、戦いの中で アイテム から使う。
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
