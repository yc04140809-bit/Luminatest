import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { ALDEN_SHOP_NAME, ALDEN_SHOPKEEPER, ALDEN_TOOL_SHOP_OFFERS } from '@mugen/content/economy/aldenShop';
import { buyPriceOf, inStock, sellPriceOf } from '@mugen/core/economy/shop';
import { itemDef } from '@mugen/content/economy/itemDefs';

/**
 * THE DOOR AT ALDEN.
 *
 * The board is `ALDEN_TOOL_SHOP_OFFERS` — content, not a list retyped here
 * — and the price is `buyPriceOf(offer)`, because what a keeper
 * charges is the offer's business and not this screen's. Buying is one
 * call to `world.buyItem`, which moves the LUMI and the goods in a
 * single commit: there is no moment in which the purse has been
 * lightened and the bag has not been filled, and this screen could not
 * create one if it tried.
 *
 * What it must NOT do, and does not: work out change, decide
 * affordability, or write either number itself. It asks, and it shows
 * what came back.
 *
 * 買う／売る (2026-10-07). Selling is `world.sellItem`, the same single
 * commit the other way: the thing out, the LUMI in. A key item (古代の破片)
 * is never sold, and the row says so rather than hiding it.
 *
 * LAID OUT FOR A COUNTER: the top for whoever is behind it (today a
 * placeholder, `ALDEN_SHOPKEEPER` — no keeper is decided), the purse and
 * the two tabs where the counter would be, the goods below. One at a time
 * for now; `buy(itemId, quantity)` takes the count a 5 / MAX picker would.
 */
export function ItemShopScreen({
  world,
  onLeave,
  rumor = null,
  onRumor,
}: {
  world: World;
  onLeave: () => void;
  /**
   * THE KEEPER'S RUMOUR (the first boss route) — said over the counter as
   * the door opens, there being no talking at a shop board. Heard by being
   * shown: `onRumor` is told once, when it is.
   */
  rumor?: DialogueLine | null;
  onRumor?: () => void;
}) {
  const [said, setSaid] = useState<string | null>(null);
  const [tab, setTab] = useState<'BUY' | 'SELL'>('BUY');
  useEffect(() => {
    if (rumor) onRumor?.();
  }, []);
  const [busy, setBusy] = useState(false);
  const lumi = world.getLumi();
  const bag = world.getInventory();

  const buy = (itemId: string, quantity = 1) => {
    if (busy) return;
    const offer = ALDEN_TOOL_SHOP_OFFERS.find((o) => o.itemId === itemId);
    const def = itemDef(itemId);
    if (!offer || !def) return;
    setBusy(true);
    void world
      .buyItem(offer, quantity)
      .then((bought) => {
        // FALSE IS AN ANSWER, NOT A FAILURE. The world refuses for a
        // handful of reasons — no money, no room, nothing in stock —
        // and the honest thing is to say the common one rather than
        // guess which it was.
        setSaid(bought ? `${def.name}を買った。` : `${def.name}は買えなかった。`);
      })
      .catch(() => setSaid('買えなかった。'))
      .finally(() => setBusy(false));
  };

  const sell = (itemId: string, quantity = 1) => {
    if (busy) return;
    const def = itemDef(itemId);
    if (!def) return;
    setBusy(true);
    void world
      .sellItem(itemId, quantity)
      .then((paid) => setSaid(paid > 0 ? `${def.name}を売った。（+${paid} LUMI）` : `${def.name}は売れなかった。`))
      .catch(() => setSaid('売れなかった。'))
      .finally(() => setBusy(false));
  };

  return (
    <div className="screen shop" data-testid="shop-screen" data-tab={tab}>
      {/* WHO IS BEHIND THE COUNTER — a placeholder until a keeper is decided. */}
      <div className="shop-keeper-area" data-testid="shop-keeper-area" data-keeper={ALDEN_SHOPKEEPER.id}>
        <h1 className="place">{ALDEN_SHOP_NAME}</h1>
        {rumor ? (
          <p className="say shop-keeper" data-testid="shop-keeper-line">
            {rumor.speaker}「{rumor.text.replace(/\n/g, '')}」
          </p>
        ) : (
          <p className="shop-greeting" data-testid="shop-greeting">
            {ALDEN_SHOPKEEPER.label}「{ALDEN_SHOPKEEPER.greeting}」
          </p>
        )}
      </div>
      {/* THE COUNTER: the purse, and buying or selling. */}
      <div className="shop-counter">
        <p className="purse" data-testid="shop-lumi">
          LUMI {lumi}
        </p>
        <div className="shop-tabs" role="tablist">
          {(['BUY', 'SELL'] as const).map((t) => (
            <button
              key={t}
              className={`shop-tab${tab === t ? ' on' : ''}`}
              role="tab"
              aria-selected={tab === t}
              data-testid={`shop-tab-${t.toLowerCase()}`}
              onClick={() => {
                setTab(t);
                setSaid(null);
              }}
            >
              {t === 'BUY' ? '買う' : '売る'}
            </button>
          ))}
        </div>
      </div>
      <div className="shop-goods" data-testid="shop-goods">
        {tab === 'BUY' ? (
          <ul className="shop-list">
            {ALDEN_TOOL_SHOP_OFFERS.map((offer) => {
              const def = itemDef(offer.itemId);
              const price = buyPriceOf(offer);
              if (!def || price === null) return null;
              const held = world.getItemCount(offer.itemId);
              const full = held >= def.maxStack;
              const short = lumi < price;
              const affordable = !short && !full && inStock(offer, 1);
              return (
                <li className="shop-row" key={offer.itemId} data-testid={`shop-row-${offer.itemId}`}>
                  <span className="shop-info">
                    <span className="shop-name">{def.name}</span>
                    <span className="shop-price" data-testid={`shop-price-${offer.itemId}`}>
                      {price} LUMI
                    </span>
                    <span className="shop-held" data-testid={`shop-held-${offer.itemId}`}>
                      所持 {held}
                    </span>
                    {(full || short) && (
                      <span className="shop-why" data-testid={`shop-why-${offer.itemId}`}>
                        {full ? 'これ以上持てない' : 'LUMIが足りない'}
                      </span>
                    )}
                    <span className="shop-desc">{def.description}</span>
                  </span>
                  <button
                    className="btn"
                    data-testid={`shop-buy-${offer.itemId}`}
                    disabled={busy || !affordable}
                    onClick={() => buy(offer.itemId)}
                  >
                    買う
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="shop-list">
            {bag.length === 0 && (
              <li className="shop-row shop-empty" data-testid="shop-sell-empty">
                売れるものを持っていない。
              </li>
            )}
            {bag.map((stack) => {
              const def = itemDef(stack.itemId);
              if (!def) return null;
              // Never sold: a key item, or a thing the shop would pay nothing for.
              const price = def.isKeyItem ? 0 : sellPriceOf(def);
              return (
                <li className="shop-row" key={stack.itemId} data-testid={`shop-sell-row-${stack.itemId}`}>
                  <span className="shop-info">
                    <span className="shop-name">{def.name}</span>
                    <span className="shop-held" data-testid={`shop-sell-held-${stack.itemId}`}>
                      所持 {stack.quantity}
                    </span>
                    {price > 0 ? (
                      <span className="shop-price" data-testid={`shop-sell-price-${stack.itemId}`}>
                        売値 {price} LUMI
                      </span>
                    ) : (
                      <span className="shop-why" data-testid={`shop-sell-refused-${stack.itemId}`}>
                        売れない
                      </span>
                    )}
                  </span>
                  {price > 0 && (
                    <button
                      className="btn"
                      data-testid={`shop-sell-${stack.itemId}`}
                      disabled={busy}
                      onClick={() => sell(stack.itemId)}
                    >
                      1つ売る
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {said && (
        <p className="say" data-testid="shop-message">
          {said}
        </p>
      )}
      <button className="btn primary" data-testid="shop-leave" onClick={onLeave}>
        店を出る
      </button>
    </div>
  );
}
