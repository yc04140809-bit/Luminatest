import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { ALDEN_SHOP_NAME, ALDEN_SHOP_OFFERS } from '@mugen/content/economy/aldenShop';
import { buyPriceOf, inStock } from '@mugen/core/economy/shop';
import { itemDef } from '@mugen/content/economy/itemDefs';

/**
 * THE DOOR AT ALDEN.
 *
 * The board is `ALDEN_SHOP_OFFERS` — content, not a list retyped here
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
 */
export function ItemShopScreen({ world, onLeave }: { world: World; onLeave: () => void }) {
  const [said, setSaid] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lumi = world.getLumi();

  const buy = (itemId: string) => {
    if (busy) return;
    const offer = ALDEN_SHOP_OFFERS.find((o) => o.itemId === itemId);
    const def = itemDef(itemId);
    if (!offer || !def) return;
    setBusy(true);
    void world
      .buyItem(offer, 1)
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

  return (
    <div className="screen shop" data-testid="shop-screen">
      <h1 className="place">{ALDEN_SHOP_NAME}</h1>
      <p className="purse" data-testid="shop-lumi">
        LUMI {lumi}
      </p>
      <ul className="shop-list">
        {ALDEN_SHOP_OFFERS.map((offer) => {
          const def = itemDef(offer.itemId);
          const price = buyPriceOf(offer);
          if (!def || price === null) return null;
          const held = world.getItemCount(offer.itemId);
          const affordable = lumi >= price && inStock(offer, 1);
          return (
            <li className="shop-row" key={offer.itemId} data-testid={`shop-row-${offer.itemId}`}>
              <span className="shop-name">{def.name}</span>
              <span className="shop-price" data-testid={`shop-price-${offer.itemId}`}>
                {price} LUMI
              </span>
              <span className="shop-held" data-testid={`shop-held-${offer.itemId}`}>
                所持 {held}
              </span>
              <span className="shop-desc">{def.description}</span>
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
