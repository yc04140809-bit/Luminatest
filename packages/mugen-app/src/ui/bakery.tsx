import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { BAKERY_SHOP_DESCRIPTION } from '@mugen/content/dialogue/bakeryShop';
import {
  BAKERY_HERO,
  BAKERY_LINA_AGAIN,
  BAKERY_LINA_FIRST,
  BAKERY_LINA_FIRST_MARK,
  BAKERY_LINA_FULL,
  BAKERY_LINA_SHORT,
  BAKERY_LINA_SOLD,
  BAKERY_OWNER_DESCRIPTION,
  BAKERY_OWNER_HINTS,
  BAKERY_PEOPLE,
  type BakeryPerson,
} from '@mugen/content/dialogue/bakeryTalk';
import { BAKERY_OFFERS } from '@mugen/content/economy/breads';
import { LINA } from '@mugen/content/characters/lina';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { buyPriceOf } from '@mugen/core/economy/shop';
import { breadBuffLabel } from '@mugen/core/economy/bread';
import { bakeryArt, type BakeryArt } from '../assets/bakery';

/**
 * アルデン村のパン屋 — THE APP'S BAKERY.
 *
 * The tavern's arrangement (`tavern.tsx`), with two people instead of
 * one: the empty shop, the owner and Lina standing in it, and the words
 * over all three — separate layers, never one picture.
 *
 * WHO YOU TALK TO (パン屋 MVP, 2026-10-09): a switch, [リナ][主人], on Lina
 * every time the door opens — nobody is asked to choose on the way in.
 * Each has their own talk and the two are never mixed (content/dialogue/
 * bakeryTalk.ts):
 *
 *   リナ  sells the bread (買う) and chats: her first talk once in a world
 *         (`talk:BAKERY_LINA_FIRST`, marked when read to its end), then one
 *         short line, in turn.
 *   主人  a hint about where makings are found, in turn — and, once the
 *         first boss route has begun, his one rumour after it
 *         (content/story/sekiryugaArc), heard through `onRumor`.
 *
 * Buying is the tool shop's own `world.buyItem` — the loaf, the LUMI and
 * the loaf's nights in one commit. Nothing about Gald, the four answers or
 * Lina's future is said here.
 */

/** Whose short line, or which hint, comes next — in turn, for as long as the game is open. */
const turns: Record<BakeryPerson, number> = { LINA: 0, OWNER: 0 };

/** What a loaf does, as a row says it: 「HP+20／防御 +5%」. */
export function breadEffectText(itemId: string): string {
  const def = itemDef(itemId);
  if (!def?.bread || !def.use) return '';
  return `HP+${def.use.amount}／${breadBuffLabel(def.bread.buffType, def.bread.buffValue)}`;
}

export function BakeryScreen({
  world,
  onLeave,
  rumor = null,
  onRumor,
}: {
  world: World;
  onLeave: () => void;
  /** The owner's rumour, said after his hint — while the route wants it said. */
  rumor?: DialogueLine | null;
  /** Told when a talk with the rumour in it has been read to its end. */
  onRumor?: () => void;
}) {
  const [art, setArt] = useState<BakeryArt>({ room: null, owner: null, lina: null });
  const [who, setWho] = useState<BakeryPerson>('LINA');
  const [talking, setTalking] = useState<{ lines: readonly DialogueLine[]; onEnd?: () => void } | null>(null);
  const [at, setAt] = useState(0);
  const [buying, setBuying] = useState(false);
  const [linaSays, setLinaSays] = useState<string>(BAKERY_LINA_AGAIN[0].text);
  const [busy, setBusy] = useState(false);
  // Pictures that fail to load are dropped; the words never wait for art.
  const [failed, setFailed] = useState<{ room?: boolean; owner?: boolean; lina?: boolean }>({});

  useEffect(() => {
    let gone = false;
    void bakeryArt().then((a) => {
      if (!gone) setArt(a);
    });
    return () => {
      gone = true;
    };
  }, []);

  const hero = world.getHeroName();
  const named = (s: string) => s.split(BAKERY_HERO).join(hero);
  const raw = talking?.lines[at];
  // Written breaks run together, as the box always has.
  const line = raw ? { speaker: named(raw.speaker ?? ''), text: named(raw.text).replace(/\n/g, '') } : undefined;
  const last = !!talking && at >= talking.lines.length - 1;

  const talk = () => {
    setAt(0);
    if (who === 'LINA') {
      if (!world.isRead(BAKERY_LINA_FIRST_MARK)) {
        setTalking({
          lines: BAKERY_LINA_FIRST,
          onEnd: () => void world.markRead([BAKERY_LINA_FIRST_MARK]).catch(() => {}),
        });
        return;
      }
      const again = BAKERY_LINA_AGAIN[turns.LINA++ % BAKERY_LINA_AGAIN.length];
      setTalking({ lines: [again] });
      return;
    }
    const hint = BAKERY_OWNER_HINTS[turns.OWNER++ % BAKERY_OWNER_HINTS.length];
    setTalking(rumor ? { lines: [hint, rumor], onEnd: onRumor } : { lines: [hint] });
  };
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    talking?.onEnd?.();
    setTalking(null);
  };

  const switchTo = (p: BakeryPerson) => {
    setWho(p);
    setBuying(false);
  };

  const lumi = world.getLumi();
  const buy = (itemId: string) => {
    if (busy) return;
    const offer = BAKERY_OFFERS.find((o) => o.itemId === itemId);
    const def = itemDef(itemId);
    const price = offer ? buyPriceOf(offer) : null;
    if (!offer || !def || price === null) return;
    // Her answer, before asking: the purse first, then the basket.
    if (world.getItemCount(itemId) >= def.maxStack) return setLinaSays(BAKERY_LINA_FULL);
    if (!world.canAfford(price)) return setLinaSays(BAKERY_LINA_SHORT);
    setBusy(true);
    void world
      .buyItem(offer, 1)
      .then((bought) => setLinaSays(bought ? BAKERY_LINA_SOLD : BAKERY_LINA_SHORT))
      .catch(() => setLinaSays(BAKERY_LINA_SHORT))
      .finally(() => setBusy(false));
  };

  return (
    <div className="screen bakery" data-testid="bakery-screen" data-who={who}>
      {art.room && !failed.room && (
        <img
          className="bakery-room"
          src={art.room}
          alt=""
          aria-hidden="true"
          data-testid="bakery-room"
          onError={() => setFailed((f) => ({ ...f, room: true }))}
        />
      )}
      {art.owner && !failed.owner && (
        <img
          className="bakery-owner"
          src={art.owner}
          alt="パン屋の主人"
          data-testid="bakery-owner"
          onError={() => setFailed((f) => ({ ...f, owner: true }))}
        />
      )}
      {art.lina && !failed.lina && (
        <img
          className="bakery-lina"
          src={art.lina}
          alt="リナ"
          data-testid="bakery-lina"
          onError={() => setFailed((f) => ({ ...f, lina: true }))}
        />
      )}
      <div className="bakery-words" data-testid="bakery-words">
        <h1 className="place">パン屋</h1>
        {line ? (
          <>
            {line.speaker && <p className="speaker">{line.speaker}</p>}
            <p className="line" data-testid="bakery-line">
              {line.speaker ? `「${line.text}」` : line.text}
            </p>
            <button className="btn primary" data-testid="bakery-next" onClick={next}>
              {last ? 'もどる' : 'つぎへ'}
            </button>
          </>
        ) : (
          <>
            <div className="shop-tabs bakery-who" role="tablist" aria-label="話す相手">
              {BAKERY_PEOPLE.map((p) => (
                <button
                  key={p.id}
                  className={`shop-tab${who === p.id ? ' on' : ''}`}
                  role="tab"
                  aria-selected={who === p.id}
                  data-testid={`bakery-who-${p.id.toLowerCase()}`}
                  onClick={() => switchTo(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
            {buying ? (
              <div className="bakery-shop" data-testid="bakery-shop">
                <p className="say bakery-say" data-testid="bakery-say">
                  {LINA.name}「{linaSays}」
                </p>
                <p className="purse" data-testid="bakery-lumi">
                  LUMI {lumi}
                </p>
                <ul className="shop-list bakery-list">
                  {BAKERY_OFFERS.map((offer) => {
                    const def = itemDef(offer.itemId);
                    const price = buyPriceOf(offer);
                    if (!def?.bread || price === null) return null;
                    const held = world.getItemCount(offer.itemId);
                    const full = held >= def.maxStack;
                    const short = lumi < price;
                    return (
                      <li className="shop-row bakery-row" key={offer.itemId} data-testid={`bakery-row-${offer.itemId}`}>
                        <span className="shop-info">
                          <span className="shop-name">{def.name}</span>
                          <span className="shop-price" data-testid={`bakery-price-${offer.itemId}`}>
                            {price} LUMI
                          </span>
                          <span className="shop-held" data-testid={`bakery-held-${offer.itemId}`}>
                            所持 {held}
                          </span>
                          <span className="bakery-line2">
                            <span className="bakery-effect" data-testid={`bakery-effect-${offer.itemId}`}>
                              {breadEffectText(offer.itemId)}
                            </span>
                            <span className="bakery-keeps" data-testid={`bakery-keeps-${offer.itemId}`}>
                              休息{def.bread.freshness}回もつ
                            </span>
                            {(full || short) && (
                              <span className="shop-why" data-testid={`bakery-why-${offer.itemId}`}>
                                {full ? 'これ以上持てない' : 'LUMIが足りない'}
                              </span>
                            )}
                          </span>
                        </span>
                        <button
                          className="btn"
                          data-testid={`bakery-buy-${offer.itemId}`}
                          disabled={busy}
                          onClick={() => buy(offer.itemId)}
                        >
                          買う
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <button className="btn" data-testid="bakery-buy-close" onClick={() => setBuying(false)}>
                  もどる
                </button>
              </div>
            ) : (
              <>
                <p className="line" data-testid="bakery-description">
                  {who === 'OWNER' ? BAKERY_OWNER_DESCRIPTION : BAKERY_SHOP_DESCRIPTION}
                </p>
                <div className="actions">
                  <button className="btn primary" data-testid="bakery-talk" onClick={talk}>
                    話す
                  </button>
                  {who === 'LINA' && (
                    <button
                      className="btn"
                      data-testid="bakery-buy"
                      onClick={() => {
                        setLinaSays(BAKERY_LINA_AGAIN[0].text);
                        setBuying(true);
                      }}
                    >
                      買う
                    </button>
                  )}
                  <button className="btn" data-testid="bakery-leave" onClick={onLeave}>
                    店を出る
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
