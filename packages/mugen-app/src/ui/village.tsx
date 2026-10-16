import { useState, type ReactNode } from 'react';
import type { World } from '@mugen/core/world/world';
import {
  VILLAGE_NAMES_SHOWN,
  VILLAGE_SPOTS,
  type VillagePerson,
  type VillageSpot,
  type VillageSpotId,
} from '@mugen/content/locations/aldenVillageMap';
import { ALDEN_DIORAMA, type DioramaBox, type VillageDiorama } from '../assets/villageDiorama';
import { NewBadge } from './common/NewBadge';
import { usePicture } from './scene';
import './village.css';

/**
 * アルデン村 — THE VILLAGE SEEN WHOLE (作者「アルデン村メニュー画面 改修指示書」
 * 2026-10-16). Replaces the list of place names with the village from above:
 *
 *   left, a third   who is there and what can be done — the happening as
 *                   they come back in, then the place chosen on the right
 *   right, the rest the village (one picture, assets/villageDiorama.ts), its
 *                   places as labels, who is in each beneath it
 *   below the right the five: ステータス・噂話・持ち物・世界の記憶・人生の記録
 *
 * Not a map to walk. A place tapped is shown on the left with its people and
 * its doors (the tavern: 酒場に入る / 休息する); the roads out open the region
 * map (アルデン地方) as 「アルデン地方を探索する」 did. No クエスト, no セーブ, no
 * rest or setting out among the five (作者判断 2026-10-16).
 *
 * Every door the old menu had is still here, by the same test ids, so what
 * lies behind each is untouched.
 */

export interface VillageNews {
  /** Somewhere new to go (the ruins opened): on the road out. */
  explore?: boolean;
  rumors?: boolean;
  memory?: boolean;
  status?: boolean;
  /** A talk that is not the everyday one waits inside (ui/talkNews). */
  tavern?: boolean;
  bakery?: boolean;
  shop?: boolean;
}

export function VillageScreen({
  world,
  objective,
  presence,
  ruinsOpen,
  news = {},
  happening,
  notice,
  resting,
  onRest,
  onRoad,
  onTavern,
  onBakery,
  onShop,
  onRumors,
  onBag,
  onMemory,
  onArchive,
  onStatus,
  diorama = ALDEN_DIORAMA,
}: {
  world: World;
  /** 次の目的 (content `nextObjective`). */
  objective: string;
  /** Who is where now (content `villagePresence`) — worked out by the caller, never kept. */
  presence: Partial<Record<VillageSpotId, readonly VillagePerson[]>>;
  /** 遺跡への道 open (the master has told what was sealed there). */
  ruinsOpen: boolean;
  news?: VillageNews;
  /** A small thing happening as they come back in (ui/daily and the like) — first on the left. */
  happening?: ReactNode;
  /** A notice over the village (「AUTO戦闘が使用可能になりました。」). */
  notice?: ReactNode;
  resting: boolean;
  onRest: () => void;
  /** Out of the village: the region map (アルデン地方). */
  onRoad: () => void;
  onTavern: () => void;
  onBakery: () => void;
  onShop: () => void;
  onRumors: () => void;
  onBag: () => void;
  onMemory: () => void;
  onArchive: () => void;
  onStatus: () => void;
  /** Which picture (the village before the raid; later half-broken, rebuilt). */
  diorama?: VillageDiorama;
}) {
  const [chosen, setChosen] = useState<VillageSpotId | null>(null);
  const clock = world.getClock();
  const party = world.getPartyCondition();
  const src = usePicture(diorama.load, `diorama:${diorama.crop.x},${diorama.crop.y}:${diorama.fileW}`);
  const spot = chosen ? VILLAGE_SPOTS.find((s) => s.id === chosen)! : null;

  const tap = (s: VillageSpot) => {
    if (s.id === 'road_forest' || (s.id === 'road_ruins' && ruinsOpen)) return onRoad();
    setChosen((now) => (now === s.id ? null : s.id));
  };
  const mark = (s: VillageSpot): { sign: string; testId?: string } | null => {
    if (s.id === 'tavern' && news.tavern) return { sign: '…', testId: 'tavern-new' };
    if (s.id === 'bakery' && news.bakery) return { sign: '…', testId: 'bakery-new' };
    if (s.id === 'shop' && news.shop) return { sign: '…', testId: 'shop-new' };
    if (s.id === 'road_ruins' && ruinsOpen && news.explore) return { sign: '！', testId: 'explore-new' };
    return null;
  };

  return (
    <div className="screen village" data-testid="village-screen">
      {/* ---- left: who is there, and what can be done ---- */}
      <aside className="vg-side" aria-label="会話">
        <header className="vg-head">
          <p className="vg-clock" data-testid="world-clock">
            {clock.worldYear}年目 {clock.worldDay}日目
          </p>
          <p className="vg-purse" data-testid="lumi">
            LUMI {world.getLumi()}
          </p>
        </header>
        {/* The two of them: who, their level, how they are. */}
        <div className="vg-party" data-testid="status-panel">
          {(
            [
              ['hero', world.getHeroName()],
              ['kaos', 'ケイオス'],
            ] as const
          ).map(([id, name]) => {
            const progress = world.getProgress(id);
            const them = party[id];
            return (
              <p className="vg-member" key={id} data-testid={`status-${id}`}>
                <b className="vg-name">{name}</b>
                <span className="vg-level" data-testid={`status-${id}-level`}>
                  Lv.{progress.level}
                </span>
                {them && (
                  <span className="vg-bars" data-testid={`party-${id}`}>
                    HP {them.currentHp}/{them.maxHp}　MP {them.currentMp}/{them.maxMp}
                  </span>
                )}
              </p>
            );
          })}
        </div>
        {happening}
        {spot ? (
          <PlaceCard
            spot={spot}
            people={presence[spot.id] ?? []}
            ruinsOpen={ruinsOpen}
            resting={resting}
            onRest={onRest}
            onTavern={onTavern}
            onBakery={onBakery}
            onShop={onShop}
            onClose={() => setChosen(null)}
          />
        ) : (
          <p className="vg-hint" data-testid="village-hint">
            村の場所をタップすると、そこにいる人と、できることが表示されます。
          </p>
        )}
        {notice}
      </aside>

      {/* ---- right: the village from above ---- */}
      <section className="vg-map" aria-label="アルデン村" data-testid="village-area">
        <div
          className="vg-stage"
          style={{ ['--vg-ratio' as string]: String(diorama.crop.w / diorama.crop.h) }}
          data-testid="village-map"
        >
          {src && (
            <img
              className="vg-picture"
              src={src}
              alt=""
              draggable={false}
              data-testid="village-picture"
              style={{
                width: `${(diorama.fileW / diorama.crop.w) * 100}%`,
                left: `${(-diorama.crop.x / diorama.crop.w) * 100}%`,
                top: `${(-diorama.crop.y / diorama.crop.h) * 100}%`,
              }}
            />
          )}
          <div className="vg-crystal vg-title" style={cover(diorama.title)}>
            <b>アルデン村</b>
            <small>ALDEN VILLAGE</small>
          </div>
          <div className="vg-crystal vg-objective" style={{ ...cover(diorama.objective), left: 'auto', right: pct(100 - diorama.objective.x - diorama.objective.w) }} data-testid="next-objective">
            <small>次の目的</small>
            <span data-testid="next-objective-text">{objective}</span>
          </div>
          {VILLAGE_SPOTS.map((s) => {
            const box = diorama.spots[s.id];
            const shut = s.id === 'road_ruins' && !ruinsOpen;
            const m = mark(s);
            const people = presence[s.id] ?? [];
            return (
              <div key={s.id} className={`vg-spot-wrap${chosen === s.id ? ' is-chosen' : ''}`} style={{ left: pct(box.x), top: pct(box.y), width: pct(box.w) }}>
                <button
                  className={`vg-crystal vg-spot vg-k-${s.kind.toLowerCase()}${chosen === s.id ? ' is-chosen' : ''}${shut ? ' is-shut' : ''}`}
                  style={{ minHeight: `${box.h}cqh` }}
                  data-testid={s.id === 'road_forest' ? 'explore-button' : `spot-${s.id}`}
                  data-spot={s.id}
                  aria-pressed={chosen === s.id}
                  data-shut={shut ? 'yes' : undefined}
                  onClick={() => tap(s)}
                >
                  <SpotIcon id={s.id} />
                  <span className="vg-spot-label">{s.label}</span>
                  {s.kind === 'ROAD' && <span className="vg-arrow" aria-hidden="true">→</span>}
                  {m && (
                    <i className="vg-mark" data-testid={m.testId} aria-label="新着">
                      {m.sign}
                    </i>
                  )}
                </button>
                {people.length > 0 && (
                  <p className="vg-names" data-testid={`spot-${s.id}-people`}>
                    {people.slice(0, VILLAGE_NAMES_SHOWN).map((p) => (
                      <span key={p.name} className="vg-person">
                        {p.name}
                      </span>
                    ))}
                    {people.length > VILLAGE_NAMES_SHOWN && (
                      <span className="vg-person vg-more">+{people.length - VILLAGE_NAMES_SHOWN}</span>
                    )}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ---- below: the five ---- */}
      <nav className="vg-menu" aria-label="メニュー">
        <MenuButton testId="status-button" icon="status" label="ステータス" en="STATUS" onClick={onStatus}>
          <NewBadge show={news.status} testId="status-new" />
        </MenuButton>
        <MenuButton testId="rumor-button" icon="rumor" label="噂話" en="RUMOR" onClick={onRumors}>
          <NewBadge show={news.rumors} testId="rumor-new" />
        </MenuButton>
        <MenuButton testId="bag-button" icon="bag" label="持ち物" en="ITEM" onClick={onBag} />
        <MenuButton testId="memory-button" icon="world" label="世界の記憶" en="WORLD" onClick={onMemory}>
          <NewBadge show={news.memory} testId="memory-new" />
        </MenuButton>
        <MenuButton testId="archive-button" icon="archive" label="人生の記録" en="ARCHIVE" onClick={onArchive} />
      </nav>
    </div>
  );
}

/** A place chosen on the village: who is there, and its doors. */
function PlaceCard({
  spot,
  people,
  ruinsOpen,
  resting,
  onRest,
  onTavern,
  onBakery,
  onShop,
  onClose,
}: {
  spot: VillageSpot;
  people: readonly VillagePerson[];
  ruinsOpen: boolean;
  resting: boolean;
  onRest: () => void;
  onTavern: () => void;
  onBakery: () => void;
  onShop: () => void;
  onClose: () => void;
}) {
  const doors: ReactNode =
    spot.id === 'tavern' ? (
      <>
        <PlaceDoor testId="tavern-button" onClick={onTavern}>
          酒場に入る
        </PlaceDoor>
        <PlaceDoor testId="rest-button" disabled={resting} onClick={onRest}>
          休息する
        </PlaceDoor>
      </>
    ) : spot.id === 'bakery' ? (
      <PlaceDoor testId="bakery-button" onClick={onBakery}>
        パン屋に入る
      </PlaceDoor>
    ) : spot.id === 'shop' ? (
      <PlaceDoor testId="shop-button" onClick={onShop}>
        道具屋に入る
      </PlaceDoor>
    ) : null;
  return (
    <section className="vg-crystal vg-card" data-testid="place-card" data-spot={spot.id}>
      <header className="vg-card-head">
        <SpotIcon id={spot.id} />
        <h2 className="vg-card-title">{spot.label}</h2>
        <button className="vg-card-close" data-testid="place-close" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
      </header>
      {people.length > 0 ? (
        <ul className="vg-card-people" data-testid="place-people">
          {people.map((p) => (
            <li key={p.name}>{p.name}</li>
          ))}
        </ul>
      ) : (
        <p className="vg-card-empty" data-testid="place-nobody">
          {spot.id === 'road_ruins' && !ruinsOpen ? 'いまは、まだ行く用がない。' : 'いまは、訪ねる用はない。'}
        </p>
      )}
      {doors && <div className="vg-card-doors">{doors}</div>}
    </section>
  );
}

function PlaceDoor({
  testId,
  disabled,
  onClick,
  children,
}: {
  testId: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button className="vg-door" data-testid={testId} disabled={disabled} onClick={onClick}>
      <span className="vg-door-gem" aria-hidden="true">
        ◆
      </span>
      {children}
    </button>
  );
}

function MenuButton({
  testId,
  icon,
  label,
  en,
  onClick,
  children,
}: {
  testId: string;
  icon: MenuIconId;
  label: string;
  en: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button className="vg-crystal vg-menu-button" data-testid={testId} onClick={onClick}>
      <MenuIcon id={icon} />
      <span className="vg-menu-label">{label}</span>
      <small className="vg-menu-en">{en}</small>
      {children}
    </button>
  );
}

const pct = (v: number) => `${v}%`;
/** At least over the box (what is painted there is covered), wider if its words need it. */
const cover = (b: DioramaBox) => ({ left: pct(b.x), top: pct(b.y), minWidth: pct(b.w), minHeight: pct(b.h) });

// ---- small line icons (inline, no library) ----

const svg = (children: ReactNode) => (
  <svg className="vg-icon" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

function SpotIcon({ id }: { id: VillageSpotId }) {
  switch (id) {
    case 'church':
      return svg(
        <>
          <path d="M12 2v4M10 4h4" />
          <path d="M7 21V11l5-4 5 4v10" />
          <path d="M4 21v-6l3-2M20 21v-6l-3-2M3 21h18" />
          <path d="M11 21v-4h2v4" />
        </>,
      );
    case 'shop':
      return svg(
        <>
          <path d="M5 8h14l-1 13H6L5 8z" />
          <path d="M9 10V6a3 3 0 0 1 6 0v4" />
        </>,
      );
    case 'bakery':
      return svg(
        <>
          <path d="M4 14c0-4 4-7 8-7s8 3 8 7c0 2-1 3-3 3H7c-2 0-3-1-3-3z" />
          <path d="M9 9l1 5M12 8v6M15 9l-1 5" />
        </>,
      );
    case 'tavern':
      return svg(
        <>
          <path d="M6 7h10v12a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z" />
          <path d="M16 10h2a2 2 0 0 1 0 4h-2" />
          <path d="M6 5c1-1 2-1 3 0s2 1 3 0 2-1 3 0" />
        </>,
      );
    case 'plaza':
      return svg(
        <>
          <path d="M12 2l2 8 8 2-8 2-2 8-2-8-8-2 8-2z" />
          <circle cx="12" cy="12" r="2" />
        </>,
      );
    case 'road_forest':
      return svg(
        <>
          <path d="M8 3l-4 7h2l-3 5h10l-3-5h2z" />
          <path d="M8 15v6" />
          <path d="M17 6l-3 5h2l-2 4h6l-2-4h2z" />
          <path d="M17 15v6" />
        </>,
      );
    case 'road_ruins':
      return svg(
        <>
          <path d="M12 3l6 9-6 9-6-9z" />
          <path d="M12 8l3 4-3 4-3-4z" />
        </>,
      );
    default:
      return svg(
        <>
          <path d="M3 11l9-7 9 7" />
          <path d="M5 10v10h14V10" />
          <path d="M10 20v-6h4v6" />
        </>,
      );
  }
}

type MenuIconId = 'status' | 'rumor' | 'bag' | 'world' | 'archive';

function MenuIcon({ id }: { id: MenuIconId }) {
  switch (id) {
    case 'status':
      return svg(
        <>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21c1-5 4-7 8-7s7 2 8 7" />
        </>,
      );
    case 'rumor':
      return svg(
        <>
          <path d="M4 5h16v10H9l-5 4V5z" />
          <path d="M8 10h.01M12 10h.01M16 10h.01" />
        </>,
      );
    case 'bag':
      return svg(
        <>
          <path d="M5 9h14l-1 12H6L5 9z" />
          <path d="M9 9V6a3 3 0 0 1 6 0v3" />
        </>,
      );
    case 'world':
      return svg(
        <>
          <path d="M12 2l5 6-5 14-5-14z" />
          <path d="M7 8h10M12 2v20" />
        </>,
      );
    case 'archive':
      return svg(
        <>
          <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z" />
          <path d="M5 17a3 3 0 0 1 3-3h11M9 8h6" />
        </>,
      );
  }
}
