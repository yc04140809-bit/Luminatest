import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
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

export function AldenScreen({
  world,
  onExplore,
  onRest,
}: {
  world: World;
  onExplore: () => void;
  onRest: () => void;
}) {
  const clock = world.getClock();
  const party = world.getPartyCondition();
  return (
    <Place area="ALDEN" title="アルデン村">
      <p className="clock" data-testid="world-clock">
        {clock.worldYear}年目 {clock.worldDay}日目
      </p>
      <p className="party" data-testid="party-condition">
        {Object.entries(party).map(([id, row]) => (
          <span key={id} data-testid={`party-${id}`}>
            {id} HP {row.currentHp}/{row.maxHp} MP {row.currentMp}/{row.maxMp}
          </span>
        ))}
      </p>
      <p className="purse" data-testid="lumi">
        LUMI {world.getLumi()}
      </p>
      <div className="actions">
        <button className="btn primary" data-testid="explore-button" onClick={onExplore}>
          グリーンウッドの森へ
        </button>
        <button className="btn" data-testid="rest-button" onClick={onRest}>
          休息する
        </button>
      </div>
    </Place>
  );
}

export function GreenwoodScreen({
  onFight,
  onLeave,
}: {
  onFight: () => void;
  onLeave: () => void;
}) {
  return (
    <Place area="GREENWOOD" title="グリーンウッドの森">
      <p className="line">下草が揺れている。何かがいる。</p>
      <div className="actions">
        <button className="btn primary" data-testid="encounter-button" onClick={onFight}>
          近づく
        </button>
        <button className="btn" data-testid="leave-forest" onClick={onLeave}>
          村へもどる
        </button>
      </div>
    </Place>
  );
}
