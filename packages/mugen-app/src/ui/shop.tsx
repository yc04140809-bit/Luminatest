import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { World } from '@mugen/core/world/world';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { ALDEN_SHOP_NAME, ALDEN_SHOPKEEPER, ALDEN_TOOL_SHOP_OFFERS } from '@mugen/content/economy/aldenShop';
import { buyPriceOf, inStock, sellPriceOf } from '@mugen/core/economy/shop';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { SHOP_MIREI, TOUCH_TIMING } from '@mugen/content/npc/shopMirei';
import { pickTouchReaction, type NpcExpression, type TouchReaction } from '@mugen/core/npc/touchReaction';
import { SEKIRYUGA_STAGES } from '@mugen/core/world/storyArc';
import { COUNTER, mireiFace, shopArt, shopStage, type ShopArt } from '../assets/shop';

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
 * LAID OUT FOR A COUNTER (NPCタッチ反応, 2026-10-07): three layers, as the
 * tavern's — the empty shop over the whole screen, ミレイ standing in it,
 * and the counter in front of her on the bottom edge at the left, her hand
 * resting on it (`shopStage`). On the right, over the room, what she says,
 * the purse and the two tabs, the goods below. One at a time for now; `buy(itemId, quantity)` takes the
 * count a 5 / MAX picker would.
 *
 * TOUCHING HER: a tap draws one short line and a face (core/npc/
 * touchReaction, content/npc/shopMirei) — held a moment, then back to her
 * ordinary face and greeting. Taps in quick succession are taken one per
 * `cooldownMs`. Nothing about touching her is saved.
 */
/**
 * THE COUNTER IN PIECES, each a rectangle of its file drawn into a rectangle
 * on screen: the counter as painted (to row 874), then its posts and its
 * plinth's face drawn `extension` taller, then its foot as painted.
 */
function counterPieces(src: string, s: number, extension: number): CSSProperties[] {
  const piece = (sx0: number, sx1: number, sy0: number, sy1: number, top: number, height: number): CSSProperties => {
    const kx = s;
    const ky = height / (sy1 - sy0);
    return {
      left: sx0 * kx,
      top,
      width: (sx1 - sx0) * kx,
      // A hair longer, so no seam shows between one piece and the next.
      height: height + 1,
      backgroundImage: `url(${src})`,
      backgroundSize: `${COUNTER.width * kx}px ${COUNTER.height * ky}px`,
      backgroundPosition: `${-sx0 * kx}px ${-sy0 * ky}px`,
    };
  };
  const body = COUNTER.bodyTo * s;
  const [p0, p1] = COUNTER.posts;
  const [f0, f1] = COUNTER.plinth;
  const pieces = [piece(0, COUNTER.width, 0, COUNTER.bodyTo, 0, body)];
  if (extension > 0) {
    pieces.push(
      piece(0, COUNTER.postLeftTo, p0, p1, body, extension),
      piece(COUNTER.postLeftTo, COUNTER.postRightFrom, f0, f1, body, extension),
      piece(COUNTER.postRightFrom, COUNTER.width, p0, p1, body, extension),
    );
  }
  pieces.push(piece(0, COUNTER.width, COUNTER.footFrom, COUNTER.height, body + extension, (COUNTER.height - COUNTER.footFrom) * s));
  return pieces;
}

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

  // ---- the room, ミレイ and the counter ----
  const [art, setArt] = useState<ShopArt>({ room: null, counter: null, mirei: {} });
  // Pictures that fail to load are dropped; the shop never waits for art.
  const [failed, setFailed] = useState<{ room?: boolean; counter?: boolean }>({});
  useEffect(() => {
    let gone = false;
    void shopArt().then((a) => {
      if (gone) return;
      setArt(a);
      // Her other faces fetched now, so a tap never waits on one; and the counter, to know it loads.
      for (const src of Object.values(a.mirei)) new Image().src = src;
      if (a.counter) {
        const probe = new Image();
        probe.onerror = () => setFailed((f) => ({ ...f, counter: true }));
        probe.src = a.counter;
      }
    });
    return () => {
      gone = true;
    };
  }, []);
  const faceImg = useRef<HTMLImageElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth || window.innerWidth, h: el.clientHeight || window.innerHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const stage = shopStage(size.w, size.h);
  const [touch, setTouch] = useState<(TouchReaction & { n: number }) | null>(null);
  const [face, setFace] = useState<NpcExpression>(SHOP_MIREI.baseExpression);
  const taps = useRef(0);
  const lastTapAt = useRef(-Infinity);
  // The greeting is already on screen: the first tap says something else.
  const lastLine = useRef<string | null>(ALDEN_SHOPKEEPER.greeting);
  const touchHer = () => {
    const now = performance.now();
    if (now - lastTapAt.current < TOUCH_TIMING.cooldownMs) return;
    lastTapAt.current = now;
    taps.current += 1;
    const facts = {
      galdDecided: world.getGaldLifeChoice() !== null,
      arcStage: SEKIRYUGA_STAGES.indexOf(world.getSekiryugaStage()),
    };
    const said = pickTouchReaction(SHOP_MIREI, taps.current, facts, lastLine.current);
    lastLine.current = said.text;
    setFace(said.expression);
    setTouch({ ...said, n: taps.current });
    // The smallest lift, and back (none when less motion is asked for).
    if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      faceImg.current?.animate?.(
        [{ transform: 'scale(1)' }, { transform: 'scale(1.015)', offset: 0.45 }, { transform: 'scale(1)' }],
        { duration: 240, easing: 'ease-out' },
      );
    }
  };
  // A face held a moment, the line a little longer, then back to the ordinary.
  useEffect(() => {
    if (!touch) return;
    const back = window.setTimeout(() => setFace(SHOP_MIREI.baseExpression), TOUCH_TIMING.faceMs);
    const quiet = window.setTimeout(() => setTouch(null), TOUCH_TIMING.lineMs);
    return () => {
      window.clearTimeout(back);
      window.clearTimeout(quiet);
    };
  }, [touch]);
  const drawn = mireiFace(art.mirei, face);
  const px = (r: { left: number; bottom: number; width: number; height: number }) => ({
    left: r.left,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  });

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
    <div ref={host} className="screen shop" data-testid="shop-screen" data-tab={tab}>
      {art.room && !failed.room && (
        <img
          className="shop-room"
          src={art.room}
          alt=""
          aria-hidden="true"
          data-testid="shop-room"
          onError={() => setFailed((f) => ({ ...f, room: true }))}
        />
      )}
      {/* ミレイ behind the counter — each picture the file as delivered, at its own shape. */}
      <div className="shop-stage" data-testid="shop-stage" style={{ width: stage.width }}>
        <button
          style={px(stage.mirei)}
          className="shop-keeper-figure"
          data-testid="shop-keeper-touch"
          data-expression={face}
          data-taps={touch?.n ?? taps.current}
          aria-label={`${SHOP_MIREI.name}に話しかける`}
          onClick={touchHer}
        >
          {drawn.src && (
            <img
              ref={faceImg}
              className="shop-keeper-img"
              src={drawn.src}
              alt={SHOP_MIREI.name}
              data-testid="shop-keeper-image"
              data-face={drawn.drawn}
            />
          )}
        </button>
        {/* The counter as painted, carried down to the floor below the screen (assets/shop.ts COUNTER). */}
        {art.counter && !failed.counter && (
          <div
            className="shop-counter-art"
            data-testid="shop-counter-art"
            data-scale={stage.scale.toFixed(5)}
            data-extension={Math.round(stage.extension)}
            aria-hidden="true"
            style={px(stage.counter)}
          >
            {counterPieces(art.counter, stage.scale, stage.extension).map((piece, i) => (
              <i key={i} className="shop-counter-piece" style={piece} />
            ))}
          </div>
        )}
      </div>
      <div className="shop-side" style={{ marginLeft: stage.width + 12 }}>
        <div className="shop-keeper-area" data-testid="shop-keeper-area" data-keeper={ALDEN_SHOPKEEPER.id}>
          <h1 className="place">{ALDEN_SHOP_NAME}</h1>
          {touch ? (
            <p
              className="shop-greeting shop-touch-line"
              data-testid="shop-touch-line"
              data-kind={touch.kind}
              data-expression={touch.expression}
              aria-live="polite"
            >
              {SHOP_MIREI.name}「{touch.text}」
            </p>
          ) : rumor ? (
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
    </div>
  );
}
