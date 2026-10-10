import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { World } from '@mugen/core/world/world';
import { areaArt, type AreaId } from '../assets/areas';
import { titleKeyVisual } from '../assets/sceneArt';
import { usePicture } from './scene';
import { RoamScene, type PickupKeeper, type RoamMemory } from './explore/RoamScene';
import { GREENWOOD_WALK } from '@mugen/content/exploration/greenwoodWalk';
import { WALK_PLACES } from '@mugen/content/exploration/walkPlaces';
import { NewBadge } from './common/NewBadge';

/**
 * THE APP ALPHA'S SCREENS — every one of them deliberately plain.
 *
 * None of the Artifact's presentation is copied here. That is not an
 * oversight and it is not duplication avoided by accident: the point
 * of this first app is to prove that the SHARED CORE can drive a
 * second front end, and a front end that borrowed the Artifact's
 * screens would prove only that the screens still work. What is
 * shared is the world, the fight, the levels, the bag and the save —
 * all of it, with no copy.
 *
 * The look is temporary and is meant to be replaced. What is not
 * temporary is the shape: each screen is handed what it needs and
 * reports what happened, exactly as the Artifact's are.
 */

/** A place with its picture behind it, fetched the first time it is entered. */
export function Place({
  area,
  title,
  children,
}: {
  area: AreaId;
  title: string;
  children: React.ReactNode;
}) {
  const [art, setArt] = useState<string | null>(null);
  useEffect(() => {
    let gone = false;
    void areaArt(area).then((a) => {
      if (!gone) setArt(a.background);
    });
    return () => {
      gone = true;
    };
  }, [area]);
  return (
    <div className="screen paper" data-area={area}>
      {art && <img className="backdrop" src={art} alt="" aria-hidden="true" />}
      {/* The place's words and doors on a sheet of the paper theme, the place around it. */}
      <div className="paper-sheet" data-testid="paper-sheet">
        <h1 className="place">{title}</h1>
        {children}
      </div>
    </div>
  );
}

/**
 * A PLACE AS A PICTURE AND A PAGE (2026-10-07): the place's painting on the
 * left, clear, and a page of the paper theme on the right — the shape of
 * ステータス and the shop, so the village reads as the same book. `aside`
 * sits beside the title (the date, the purse).
 */
export function PanelPlace({
  area,
  title,
  aside,
  children,
}: {
  area: AreaId;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [art, setArt] = useState<string | null>(null);
  useEffect(() => {
    let gone = false;
    void areaArt(area).then((a) => {
      if (!gone) setArt(a.background);
    });
    return () => {
      gone = true;
    };
  }, [area]);
  return (
    <div className="screen place-panel" data-area={area}>
      {art && <img className="place-art" src={art} alt="" aria-hidden="true" />}
      <div className="place-page paper-panel" data-testid="place-page">
        <header className="pp-head">
          <h1 className="place">{title}</h1>
          {aside && <div className="pp-aside">{aside}</div>}
        </header>
        {children}
      </div>
    </div>
  );
}

/**
 * ONE LINE OF A PAGE'S MENU — a word with a small gold mark, not a box: the
 * way ステータス's menu reads. `primary` is the way onward, set in dark gold.
 */
function MenuItem({
  testId,
  onClick,
  primary = false,
  disabled = false,
  className = '',
  children,
  ...rest
}: {
  testId: string;
  onClick?: () => void;
  primary?: boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  'data-new'?: string;
}) {
  return (
    <button
      className={`pp-item${primary ? ' primary' : ''}${className ? ` ${className}` : ''}`}
      data-testid={testId}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      <span className="pp-item-label">{children}</span>
    </button>
  );
}

export function TitleScreen({
  hasSave,
  saving,
  onStart,
  onContinue,
}: {
  hasSave: boolean;
  saving: boolean;
  onStart: () => void;
  onContinue: () => void;
}) {
  // THE KEY VISUAL — Kaos in silhouette against the moon, the picture
  // the Artifact's title is built on. Beside the name rather than under
  // it: it is a white picture and the App is dark, so words laid over
  // it would have to fight it, and a title that has to be squinted at
  // is a worse title than one with no picture.
  const keyVisual = usePicture(titleKeyVisual, 'title-key-visual');
  return (
    <div className={`screen title${keyVisual ? ' has-key' : ''}`}>
      {keyVisual && (
        <img
          className="title-key"
          src={keyVisual}
          alt=""
          aria-hidden="true"
          data-testid="title-key-visual"
        />
      )}
      <h1 className="logo">MUGEN ZERO</h1>
      <p className="sub">App Alpha</p>
      {hasSave ? (
        <button className="btn primary" data-testid="continue-button" onClick={onContinue}>
          つづきから
        </button>
      ) : (
        <button className="btn primary" data-testid="start-button" onClick={onStart}>
          はじめる
        </button>
      )}
      {!saving && (
        <p className="warn" data-testid="no-save-warning">
          このブラウザでは保存できません。
        </p>
      )}
    </div>
  );
}

/** アルデン村 — the hub. What they are carrying, and how they are. */
export function AldenScreen({
  world,
  onExplore,
  onBag,
  onMemory,
  onArchive,
  onStatus,
  onTavern,
  onBakery,
  onShop,
  resting,
  onRest,
  onRumors,
  news = {},
  notice,
}: {
  world: World;
  /** 噂話 — what the village is talking about (ui/rumors). Absent: no button. */
  onRumors?: () => void;
  /**
   * Which menus hold something not yet looked at (NEW). Worked out by the
   * caller from the world; a menu opened is not a thing looked at, so these
   * clear only as the things inside are.
   */
  news?: { explore?: boolean; rumors?: boolean; memory?: boolean; status?: boolean };
  /** A notice over the village (「AUTO戦闘が使用可能になりました。」). */
  notice?: ReactNode;
  onExplore: () => void;
  /** 月灯りの酒場 — a door off the village, held by the App (see App.tsx). */
  onTavern: () => void;
  /** パン屋 — Lina's father's shop, a door off the village like the tavern. */
  onBakery: () => void;
  /**
   * アルデン道具屋 — ミレイ's shop, a door off the village like the other two
   * (2026-10-10: the region map is for going out, not for shops).
   */
  onShop: () => void;
  onBag: () => void;
  onMemory: () => void;
  onArchive: () => void;
  onStatus: () => void;
  /** True while a night is already passing — see App's note. */
  resting: boolean;
  onRest: () => void;
}) {
  const clock = world.getClock();
  const party = world.getPartyCondition();
  return (
    <PanelPlace
      area="ALDEN"
      title="アルデン村"
      aside={
        <>
          <p className="clock" data-testid="world-clock">
            {clock.worldYear}年目 {clock.worldDay}日目
          </p>
          <p className="purse" data-testid="lumi">
            LUMI {world.getLumi()}
          </p>
        </>
      }
    >
      {/* The two of them: who, their level, how they are — ready or not. EXP is
          ステータス's and the fight's to show (2026-10-10), not the square's. */}
      <div className="pp-party" data-testid="status-panel">
        {(
          [
            ['hero', world.getHeroName()],
            ['kaos', 'ケイオス'],
          ] as const
        ).map(([id, name]) => {
          const progress = world.getProgress(id);
          const them = party[id];
          return (
            <p className="pp-member" key={id} data-testid={`status-${id}`}>
              <b className="pp-name">{name}</b>
              <span className="pp-level" data-testid={`status-${id}-level`}>
                Lv.{progress.level}
              </span>
              {them && (
                <span className="pp-bars" data-testid={`party-${id}`}>
                  HP {them.currentHp}/{them.maxHp}　MP {them.currentMp}/{them.maxMp}
                </span>
              )}
            </p>
          );
        })}
      </div>
      <nav className="pp-menu" aria-label="アルデン村">
        <MenuItem testId="explore-button" primary onClick={onExplore}>
          アルデン地方を探索する
          <NewBadge show={news.explore} testId="explore-new" />
        </MenuItem>
        {/* 2026-10-10: the village's doors together — the three shops first,
            then the village's own, what is kept, and the two of them. */}
        <div className="pp-columns">
          <div className="pp-group">
            <p className="pp-caption">店舗</p>
            <MenuItem testId="tavern-button" onClick={onTavern}>
              月灯りの酒場
            </MenuItem>
            <MenuItem testId="bakery-button" onClick={onBakery}>
              パン屋
            </MenuItem>
            {/* 「道具屋」 on the square, so the three shops keep one line and one
                rhythm on a phone (the author, 2026-10-10); inside, the shop is
                still アルデン道具屋 (ALDEN_SHOP_NAME). */}
            <MenuItem testId="shop-button" onClick={onShop}>
              道具屋
            </MenuItem>
          </div>
          <div className="pp-group">
            <p className="pp-caption">村のこと</p>
            {onRumors && (
              <MenuItem testId="rumor-button" onClick={onRumors}>
                噂話
                <NewBadge show={news.rumors} testId="rumor-new" />
              </MenuItem>
            )}
            <MenuItem testId="rest-button" disabled={resting} onClick={onRest}>
              休息する
            </MenuItem>
          </div>
          <div className="pp-group">
            <p className="pp-caption">記録</p>
            <MenuItem testId="memory-button" onClick={onMemory}>
              世界の記憶
              <NewBadge show={news.memory} testId="memory-new" />
            </MenuItem>
            <MenuItem testId="archive-button" onClick={onArchive}>
              人生の記録
            </MenuItem>
          </div>
          <div className="pp-group">
            {/* パーティ, not ふたりのこと: there will be more of them (the author, 2026-10-10). */}
            <p className="pp-caption">パーティ</p>
            <MenuItem testId="status-button" onClick={onStatus}>
              ステータス
              <NewBadge show={news.status} testId="status-new" />
            </MenuItem>
            <MenuItem testId="bag-button" onClick={onBag}>
              持ち物
            </MenuItem>
          </div>
        </div>
      </nav>
      {notice}
    </PanelPlace>
  );
}

/**
 * THE MAP — アルデン地方.
 *
 * This is what the shared flow table has always meant by EXPLORE: the
 * outdoors — the forest and what lies beyond the village. (Since
 * 2026-10-10 the shop is a door off the village like the tavern and the
 * bakery, so this screen is only for going out.) Phase 1 pointed EXPLORE straight at
 * the forest, which worked while there was nothing else out here and
 * stopped working the moment there was a shop — the table says
 * ITEM_SHOP is reached from EXPLORE, and it was right.
 */
export function MapScreen({
  places,
  onForest,
  onPlaces,
  onHome,
  ruins = false,
  onRuins,
  ruinsNew = false,
  notice,
  aside,
}: {
  /**
   * How many places the world has opened because of what the player
   * decided. Asked of `getOpenFutureSites()` by the caller; this screen
   * only needs to know whether the door is worth drawing.
   */
  places: number;
  onForest: () => void;
  onPlaces: () => void;
  onHome: () => void;
  /**
   * WHETHER 古代遺跡 IS ON THE MAP — opened by the tavern's master telling
   * what was sealed there (the first boss route), never before.
   */
  ruins?: boolean;
  onRuins?: () => void;
  /** 古代遺跡 is a destination not yet touched: NEW, and a few slow glows. */
  ruinsNew?: boolean;
  /** A notice over the map (「新しい目的地が追加されました」). */
  notice?: ReactNode;
  /** A word at the foot of the page as they set out (ALDEN INCIDENT: Kaos senses something). */
  aside?: ReactNode;
}) {
  return (
    <PanelPlace area="ALDEN" title="アルデン地方">
      <nav className="pp-menu" aria-label="アルデン地方">
        <p className="pp-caption">行き先</p>
        <MenuItem testId="forest-button" primary onClick={onForest}>
          グリーンウッドの森
        </MenuItem>
        {ruins && (
          <MenuItem
            testId="ruins-button"
            primary
            className={ruinsNew ? 'pulse-new' : ''}
            data-new={ruinsNew ? 'yes' : 'no'}
            onClick={onRuins}
          >
            {WALK_PLACES.ANCIENT_RUINS.title}
            <NewBadge show={ruinsNew} testId="ruins-new" />
          </MenuItem>
        )}
        {places > 0 && (
          <MenuItem testId="places-button" onClick={onPlaces}>
            気になる場所（{places}）
          </MenuItem>
        )}
        <p className="pp-caption">村</p>
        <MenuItem testId="back-to-village" onClick={onHome}>
          村へもどる
        </MenuItem>
      </nav>
      {aside}
      {notice}
    </PanelPlace>
  );
}

export function GreenwoodScreen({
  galdWaiting,
  fuumimiWaiting = false,
  onFuumimi,
  known,
  day,
  onGald,
  onFight,
  onLeave,
  memory,
  resume = false,
  pickupKeeper,
}: {
  /**
   * WHETHER HE IS STILL OUT THERE.
   *
   * Not a flag this screen keeps. The caller asks the world
   * `getGaldLifeChoice() === null`, which is the same question the
   * Artifact asks for the same purpose: once one of the four answers
   * is on disk, that encounter is over for this world and cannot be
   * offered again. Nothing here counts, remembers or decides — which
   * is what makes "re-offering is impossible" true rather than
   * guarded.
   */
  galdWaiting: boolean;
  /**
   * フウミミ at the forest's edge (content/enemies/fuumimi.ts fuumimiWaiting):
   * asked of the world by the caller, like him — once it has been answered,
   * it is not offered again.
   */
  fuumimiWaiting?: boolean;
  onFuumimi?: () => void;
  /** What the player knows happened (`getKnownEvents`), for what the forest notices. */
  known: readonly string[];
  /** Which day of the world it is. */
  day: number;
  onGald: () => void;
  onFight: () => void;
  onLeave: () => void;
  /** Where the walk had got to, kept by the App across a fight. */
  memory?: { current: RoamMemory | null };
  /** Pick the walk up where it was (a fight fled from), not walk in afresh. */
  resume?: boolean;
  /** The save's side of the forest's pickups (ui/explore/pickupKeeper). */
  pickupKeeper?: PickupKeeper;
}) {
  // THE FOREST, WALKED ABOUT IN (ui/explore/RoamScene, as the ruins are). Its two doors are the
  // ones it always had — the man in the road, and whatever is moving in
  // the undergrowth — offered as quiet choices over the walk.
  const view = useMemo(() => ({ known: new Set(known), day }), [known.join(','), day]);
  return (
    <RoamScene
      scene={GREENWOOD_WALK}
      roam={GREENWOOD_WALK.roam!}
      place="GREENWOOD_FOREST"
      view={view}
      onLeave={onLeave}
      leaveLabel="地方図へもどる"
      leaveTestId="leave-forest"
      memory={memory}
      resume={resume}
      pickupKeeper={pickupKeeper}
      events={
        <>
          {galdWaiting && (
            <button className="btn walk-event primary" data-testid="gald-button" onClick={onGald}>
              人影がこちらを見ている
            </button>
          )}
          {fuumimiWaiting && onFuumimi && (
            <button className="btn walk-event primary" data-testid="fuumimi-button" onClick={onFuumimi}>
              翅の音が、近くで止まった
            </button>
          )}
          <button className="btn walk-event" data-testid="encounter-button" onClick={onFight}>
            揺れる下草へ近づく
          </button>
        </>
      }
    />
  );
}
