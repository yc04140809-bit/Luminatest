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
import { KitButton, KitPanel } from './kit/Kit';
import { villagePortrait } from '../assets/villagePortraits';
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
  graveMet = false,
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
  /** The master met (named グレイヴ in the panel). */
  graveMet?: boolean;
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
  const who = villagePortrait(chosen, graveMet);
  const whoSrc = usePicture(who.load, `who:${who.key}`);

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
      {/* ---- left: who is there, and what can be done (左会話パネル) ---- */}
      <aside className="vg-side" aria-label="会話" data-talk-layout="panel">
        {/* The person (half the panel, the face kept in view), the name in the band. */}
        <KitPanel
          part="talkPanelHead"
          as="div"
          className="vg-who"
          testId="village-who"
          data={{ who: who.key }}
          portrait={whoSrc && <img src={whoSrc} alt="" draggable={false} style={{ objectPosition: who.focus, transform: `scale(${who.zoom})`, transformOrigin: who.focus }} data-testid="village-portrait" />}
          band={
            <span className="vg-who-name">
              <b>{who.name}</b>
              {who.role && <small>{who.role}</small>}
            </span>
          }
        />
        <KitPanel part="talkPanel" as="div" className="vg-body">
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
        {notice}
        </KitPanel>
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
          <KitPanel part="panel" as="div" className="vg-title" style={cover(diorama.title)} heading="アルデン村">
            <small>ALDEN VILLAGE</small>
            {/* The day and the purse, with the village's name. */}
            <span className="vg-head">
              <span className="vg-clock" data-testid="world-clock">
                {clock.worldYear}年目 {clock.worldDay}日目
              </span>
              <span className="vg-purse" data-testid="lumi">
                LUMI {world.getLumi()}
              </span>
            </span>
          </KitPanel>
          {/* 次の目的: held to its box's right edge, growing leftward with its words. */}
          <KitPanel
            part="objective"
            as="div"
            className="vg-objective"
            style={{ ...cover(diorama.objective), left: 'auto', right: pct(100 - diorama.objective.x - diorama.objective.w) }}
            testId="next-objective"
            heading="次の目的"
          >
            <span data-testid="next-objective-text" data-kit-text="">
              {objective}
            </span>
          </KitPanel>
          {VILLAGE_SPOTS.map((s) => {
            const box = diorama.spots[s.id];
            const shut = s.id === 'road_ruins' && !ruinsOpen;
            const m = mark(s);
            const people = presence[s.id] ?? [];
            return (
              <div key={s.id} className="vg-spot-wrap" style={{ left: pct(box.x), top: pct(box.y), minWidth: pct(box.w) }}>
                <KitButton
                  part="placeLabel"
                  className={`vg-spot vg-k-${s.kind.toLowerCase()}`}
                  style={{ minHeight: `${box.h}cqh` }}
                  testId={s.id === 'road_forest' ? 'explore-button' : `spot-${s.id}`}
                  data={{ spot: s.id, shut: shut ? 'yes' : undefined }}
                  selected={chosen === s.id}
                  dim={shut}
                  label={
                    s.kind === 'ROAD' ? (
                      // A road breaks, if it must, only after 「への」: 森への｜道 →
                      <>
                        {s.label.replace(/道$/, '')}
                        <wbr />
                        道{'\u00a0'}→
                      </>
                    ) : (
                      s.label
                    )
                  }
                  badge={
                    m && (
                      <i className="vg-mark" data-testid={m.testId} aria-label="新着">
                        {m.sign}
                      </i>
                    )
                  }
                  onClick={() => tap(s)}
                />
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

      {/* ---- below: the five (下部5ボタン) ---- */}
      <nav className="vg-menu" aria-label="メニュー">
        <KitButton part="menuButton" testId="status-button" label={<>ステー<wbr />タス</>} sub="STATUS" onClick={onStatus} badge={<NewBadge show={news.status} testId="status-new" />} />
        <KitButton part="menuButton" testId="rumor-button" label="噂話" sub="RUMOR" onClick={onRumors} badge={<NewBadge show={news.rumors} testId="rumor-new" />} />
        <KitButton part="menuButton" testId="bag-button" label="持ち物" sub="ITEM" onClick={onBag} />
        <KitButton part="menuButton" testId="memory-button" label={<>世界の<wbr />記憶</>} sub="WORLD" onClick={onMemory} badge={<NewBadge show={news.memory} testId="memory-new" />} />
        <KitButton part="menuButton" testId="archive-button" label={<>人生の<wbr />記録</>} sub="ARCHIVE" onClick={onArchive} />
      </nav>
    </div>
  );
}

/** A place chosen on the village: who is there, and its doors (一覧行, as the base image's choices). */
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
        <KitButton part="listRow" className="vg-door" testId="tavern-button" label="酒場に入る" onClick={onTavern} />
        <KitButton part="listRow" className="vg-door" testId="rest-button" label="休息する" disabled={resting} onClick={onRest} />
      </>
    ) : spot.id === 'bakery' ? (
      <KitButton part="listRow" className="vg-door" testId="bakery-button" label="パン屋に入る" onClick={onBakery} />
    ) : spot.id === 'shop' ? (
      <KitButton part="listRow" className="vg-door" testId="shop-button" label="道具屋に入る" onClick={onShop} />
    ) : null;
  return (
    <section className="vg-card" data-testid="place-card" data-spot={spot.id}>
      <header className="vg-card-head">
        <h2 className="vg-card-title" data-kit-text="">
          {spot.label}
        </h2>
        <KitButton part="backButton" className="vg-card-close" testId="place-close" ariaLabel="閉じる" label="とじる" onClick={onClose} />
      </header>
      {/* The doors first, so they are in view; then who is there. */}
      {doors && <div className="vg-card-doors">{doors}</div>}
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
    </section>
  );
}

const pct = (v: number) => `${v}%`;
/** At least over the box (what is painted there is covered), wider if its words need it. */
const cover = (b: DioramaBox) => ({ left: pct(b.x), top: pct(b.y), minWidth: pct(b.w), minHeight: pct(b.h) });
