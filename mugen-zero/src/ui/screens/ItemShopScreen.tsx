import { useState } from 'react';
import { ALDEN_SHOP_NAME, ALDEN_SHOP_OFFERS } from '../../content/economy/aldenShop';
import { itemDef } from '../../content/economy/itemDefs';
import { sellPriceOf } from '../../core/economy/shop';
import type { Inventory } from '../../core/economy/items';
import type { ShopOffer } from '../../core/economy/shop';

interface Props {
  lumi: number;
  inventory: Inventory;
  /**
   * BOTH OF THESE ARE THE WORLD'S ATOMIC PAIR, and this screen must
   * never take them apart. A shop that called `spendLumi` and then
   * `addItem` could be interrupted between them: money gone, nothing
   * bought. So the screen decides WHAT and the world does it in one
   * commit — which is why neither of these takes a price to subtract.
   */
  onBuy: (offer: ShopOffer, quantity: number) => Promise<boolean>;
  onSell: (itemId: string, quantity: number) => Promise<number>;
  onLeave: () => void;
}

type Tab = 'BUY' | 'SELL';

/**
 * ALDEN'S DOOR — the smallest shop that is really a shop.
 *
 * Buy, sell, and a count of what is in the purse. No haggling, no
 * standing, no keeper with an opinion, no stock that runs out: all of
 * that is the WORLD LIFE round's, and none of it changes this screen —
 * it changes the offers, which are content.
 *
 * WHAT IT REFUSES, IT REFUSES QUIETLY AND VISIBLY. A price you cannot
 * afford is a greyed button rather than an error after the fact, and a
 * thing you have none of cannot be sold. Every refusal is ALSO enforced
 * by the world, so a screen that got its arithmetic wrong still cannot
 * spend money that is not there.
 */
export function ItemShopScreen({ lumi, inventory, onBuy, onSell, onLeave }: Props) {
  const [tab, setTab] = useState<Tab>('BUY');
  /** One transaction at a time: the world is being written to. */
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<string | null>(null);

  const held = (itemId: string) =>
    inventory.find((row) => row.itemId === itemId)?.quantity ?? 0;

  const buy = async (offer: ShopOffer) => {
    if (busy) return;
    setBusy(true);
    const def = itemDef(offer.itemId);
    const ok = await onBuy(offer, 1).catch(() => false);
    setSaid(ok ? `${def?.name ?? offer.itemId} を買った。` : '買えなかった。');
    setBusy(false);
  };

  const sell = async (itemId: string) => {
    if (busy) return;
    setBusy(true);
    const def = itemDef(itemId);
    const paid = await onSell(itemId, 1).catch(() => 0);
    setSaid(paid > 0 ? `${def?.name ?? itemId} を ${paid} LUMI で売った。` : '売れなかった。');
    setBusy(false);
  };

  /** What the player is holding that this shop would actually take. */
  const sellable = inventory
    .map((row) => ({ row, def: itemDef(row.itemId) }))
    .filter(
      (entry): entry is { row: (typeof inventory)[number]; def: NonNullable<typeof entry.def> } =>
        entry.def !== null && !entry.def.isKeyItem && sellPriceOf(entry.def) > 0,
    );

  return (
    <div className="screen shop-screen" data-testid="item-shop">
      <header className="shop-head">
        <h1 className="shop-name">{ALDEN_SHOP_NAME}</h1>
        <p className="shop-purse">
          {/* LUMI, and never Gold, G or Coin. */}
          所持 <b data-testid="shop-lumi">{lumi}</b> LUMI
        </p>
      </header>

      <div className="shop-tabs" role="tablist">
        {(['BUY', 'SELL'] as Tab[]).map((which) => (
          <button
            key={which}
            role="tab"
            aria-selected={tab === which}
            className={tab === which ? 'shop-tab on' : 'shop-tab'}
            data-testid={`shop-tab-${which.toLowerCase()}`}
            onClick={() => {
              setTab(which);
              setSaid(null);
            }}
          >
            {which === 'BUY' ? '買う' : '売る'}
          </button>
        ))}
      </div>

      <div className="shop-list" data-testid={`shop-list-${tab.toLowerCase()}`}>
        {tab === 'BUY' &&
          ALDEN_SHOP_OFFERS.map((offer) => {
            const def = itemDef(offer.itemId);
            if (!def) return null;
            const afford = lumi >= offer.buyPrice;
            return (
              <div className="shop-row" key={offer.itemId} data-testid={`shop-buy-${offer.itemId}`}>
                <div className="shop-row-words">
                  <span className="shop-row-name">{def.name}</span>
                  <span className="shop-row-note">{def.description}</span>
                </div>
                <span className="shop-row-price">{offer.buyPrice} LUMI</span>
                <span className="shop-row-held">所持 {held(offer.itemId)}</span>
                <button
                  className="shop-act"
                  data-testid={`shop-buy-button-${offer.itemId}`}
                  disabled={!afford || busy}
                  onClick={() => void buy(offer)}
                >
                  購入
                </button>
              </div>
            );
          })}

        {tab === 'SELL' && sellable.length === 0 && (
          <p className="shop-empty" data-testid="shop-nothing-to-sell">
            売れるものを持っていない。
          </p>
        )}
        {tab === 'SELL' &&
          sellable.map(({ row, def }) => (
            <div className="shop-row" key={row.itemId} data-testid={`shop-sell-${row.itemId}`}>
              <div className="shop-row-words">
                <span className="shop-row-name">{def.name}</span>
                <span className="shop-row-note">{def.description}</span>
              </div>
              <span className="shop-row-price">{sellPriceOf(def)} LUMI</span>
              <span className="shop-row-held">所持 {row.quantity}</span>
              <button
                className="shop-act"
                data-testid={`shop-sell-button-${row.itemId}`}
                disabled={busy}
                onClick={() => void sell(row.itemId)}
              >
                売却
              </button>
            </div>
          ))}
      </div>

      <p className="shop-said" data-testid="shop-said" aria-live="polite">
        {said ?? ''}
      </p>
      <button className="shop-leave" data-testid="shop-leave" onClick={onLeave}>
        店を出る
      </button>
    </div>
  );
}
