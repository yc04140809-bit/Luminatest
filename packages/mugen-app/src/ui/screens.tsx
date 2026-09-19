import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { expToNextLevel } from '@mugen/core/progression/levelCurve';
import { areaArt, type AreaId } from '../assets/areas';

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
    <div className="screen">
      {art && <img className="backdrop" src={art} alt="" aria-hidden="true" />}
      <h1 className="place">{title}</h1>
      {children}
    </div>
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
  return (
    <div className="screen title">
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

const OPENING = [
  'その剣は、ひとつの人生を終わらせることも、始めることもできる。',
  'アルデン地方、グリーンウッドの森。',
  '——旅は、ここから。',
];

export function OpeningScreen({ onDone }: { onDone: () => void }) {
  const [at, setAt] = useState(0);
  const last = at >= OPENING.length - 1;
  return (
    <div className="screen opening">
      <p className="line" data-testid="opening-line">
        {OPENING[at]}
      </p>
      <button
        className="btn"
        data-testid="opening-next"
        onClick={() => (last ? onDone() : setAt((n) => n + 1))}
      >
        {last ? 'はじめる' : 'つぎへ'}
      </button>
    </div>
  );
}

/**
 * WHAT THE PARTY IS, IN NUMBERS THE CORE ALREADY KNOWS.
 *
 * Not one value here is worked out on this screen. The level and the
 * experience are `world.getProgress`, the distance to the next level
 * is `expToNextLevel`, the ceilings and the swing are
 * `world.getPartyStats` — which is `statsForLevels`, the same function
 * the battle builds its fighters from. If this panel and the fight
 * ever disagreed about a maximum, the fight would be right and this
 * would be a second calculation that should not exist.
 *
 * 防御力 and 魔力 are not shown because the core has no such stats
 * yet: `PartyStats` is maxHp, maxMp and an attack range. Inventing
 * numbers to fill a heading would be the one thing this screen must
 * never do.
 */
export function StatusPanel({ world }: { world: World }) {
  const stats = world.getPartyStats();
  const party = world.getPartyCondition();
  return (
    <div className="status" data-testid="status-panel">
      {(['hero', 'kaos'] as const).map((id) => {
        const progress = world.getProgress(id);
        const toNext = expToNextLevel(progress);
        const them = party[id];
        return (
          <p className="status-row" key={id} data-testid={`status-${id}`}>
            <span data-testid={`status-${id}-level`}>Lv.{progress.level}</span>{' '}
            <span data-testid={`status-${id}-exp`}>EXP {progress.totalExp}</span>{' '}
            <span data-testid={`status-${id}-next`}>
              {toNext === null ? '（最大）' : `つぎまで ${toNext}`}
            </span>
            {them && (
              <span data-testid={`party-${id}`}>
                {' '}
                HP {them.currentHp}/{them.maxHp} MP {them.currentMp}/{them.maxMp}
              </span>
            )}
          </p>
        );
      })}
      <p className="status-row" data-testid="status-stats">
        <span data-testid="status-maxhp">最大HP {stats.maxHp}</span>{' '}
        <span data-testid="status-maxmp">最大MP {stats.maxMp}</span>{' '}
        <span data-testid="status-attack">
          攻撃 {stats.attackMin}〜{stats.attackMax}
        </span>
      </p>
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
  resting,
  onRest,
}: {
  world: World;
  onExplore: () => void;
  onBag: () => void;
  onMemory: () => void;
  onArchive: () => void;
  /** True while a night is already passing — see App's note. */
  resting: boolean;
  onRest: () => void;
}) {
  const clock = world.getClock();
  return (
    <Place area="ALDEN" title="アルデン村">
      <p className="clock" data-testid="world-clock">
        {clock.worldYear}年目 {clock.worldDay}日目
      </p>
      <StatusPanel world={world} />
      <p className="purse" data-testid="lumi">
        LUMI {world.getLumi()}
      </p>
      <div className="actions">
        <button className="btn primary" data-testid="explore-button" onClick={onExplore}>
          アルデン地方を探索する
        </button>
        <button className="btn" data-testid="bag-button" onClick={onBag}>
          持ち物
        </button>
        <button className="btn" data-testid="memory-button" onClick={onMemory}>
          世界の記憶
        </button>
        <button className="btn" data-testid="archive-button" onClick={onArchive}>
          人生の記録
        </button>
        <button className="btn" data-testid="rest-button" disabled={resting} onClick={onRest}>
          休息する
        </button>
      </div>
    </Place>
  );
}

/**
 * THE MAP — アルデン地方.
 *
 * This is what the shared flow table has always meant by EXPLORE: the
 * outdoors, with the shop as "a door off the village square" and the
 * forest as somewhere to walk to. Phase 1 pointed EXPLORE straight at
 * the forest, which worked while there was nothing else out here and
 * stopped working the moment there was a shop — the table says
 * ITEM_SHOP is reached from EXPLORE, and it was right.
 */
export function MapScreen({
  places,
  onShop,
  onForest,
  onPlaces,
  onHome,
}: {
  /**
   * How many places the world has opened because of what the player
   * decided. Asked of `getOpenFutureSites()` by the caller; this screen
   * only needs to know whether the door is worth drawing.
   */
  places: number;
  onShop: () => void;
  onForest: () => void;
  onPlaces: () => void;
  onHome: () => void;
}) {
  return (
    <Place area="ALDEN" title="アルデン地方">
      <div className="actions">
        <button className="btn" data-testid="shop-button" onClick={onShop}>
          アルデン道具屋
        </button>
        <button className="btn primary" data-testid="forest-button" onClick={onForest}>
          グリーンウッドの森
        </button>
        {places > 0 && (
          <button className="btn" data-testid="places-button" onClick={onPlaces}>
            気になる場所（{places}）
          </button>
        )}
        <button className="btn" data-testid="back-to-village" onClick={onHome}>
          村へもどる
        </button>
      </div>
    </Place>
  );
}

export function GreenwoodScreen({
  galdWaiting,
  onGald,
  onFight,
  onLeave,
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
  onGald: () => void;
  onFight: () => void;
  onLeave: () => void;
}) {
  return (
    <Place area="GREENWOOD" title="グリーンウッドの森">
      <p className="line">下草が揺れている。何かがいる。</p>
      <div className="actions">
        {galdWaiting && (
          <button className="btn primary" data-testid="gald-button" onClick={onGald}>
            人影がこちらを見ている
          </button>
        )}
        <button className="btn" data-testid="encounter-button" onClick={onFight}>
          近づく
        </button>
        <button className="btn" data-testid="leave-forest" onClick={onLeave}>
          地方図へもどる
        </button>
      </div>
    </Place>
  );
}
