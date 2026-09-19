import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { futureSiteDef } from '@mugen/content/world/futureSites';
import { Place } from './screens';

/**
 * THE PLACE THE CHOICE LED TO.
 *
 * This is the one door in the game through which the off-screen half
 * of a life becomes something the player KNOWS. Until it is walked
 * through, `getKnownEvents` hides everything tagged with Gald and not
 * with them, so WORLD MEMORY holds one line — their own decision — and
 * the archive ends in 「まだ知らない人生がある。」. Afterwards both fill in.
 *
 * Deliberately the smallest version that is honest: which places are
 * open comes from `world.getOpenFutureSites()`, every word on screen
 * comes from the site's own definition, and going in is one call to
 * `world.recordFutureSiteDiscovery`, which refuses a place the world
 * has not opened and returns the existing event if it has already
 * happened. The Artifact's version of this screen plays the scene with
 * dialogue and art; this one states the fact. Nothing about WHICH
 * facts, or when, differs between them.
 */
export function FutureSiteScreen({
  world,
  onLeave,
}: {
  world: World;
  onLeave: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const sites = world.getOpenFutureSites();

  const enter = (siteId: string) => {
    if (busy) return;
    setBusy(true);
    void world
      .recordFutureSiteDiscovery(siteId)
      .then(() => setOpenId(siteId))
      .catch((e) => console.error('Could not enter the place', e))
      .finally(() => setBusy(false));
  };

  const seen = openId ? futureSiteDef(openId) : null;
  if (seen) {
    return (
      <Place area="ALDEN" title={seen.knownName}>
        <div data-testid="future-site-seen" data-site={seen.id}>
          <p className="line" data-testid="future-site-description">
            {seen.knownDescription}
          </p>
          <button className="btn primary" data-testid="future-site-done" onClick={onLeave}>
            もどる
          </button>
        </div>
      </Place>
    );
  }

  return (
    <Place area="ALDEN" title="行ってみる">
      <div data-testid="future-site-screen">
        {sites.length === 0 ? (
          <p className="line" data-testid="future-site-none">
            まだ、行くべき場所はない。
          </p>
        ) : (
          <ul className="memory-list">
            {sites.map(({ def, discovered }) => (
              <li className="memory-row" key={def.id}>
                <button
                  className="btn"
                  data-testid={`future-site-${def.id}`}
                  disabled={busy}
                  onClick={() => enter(def.id)}
                >
                  {discovered ? def.knownName : def.unknownName}
                </button>
                <span className="memory-meta">
                  {discovered ? def.knownDescription : def.unknownDescription}
                </span>
              </li>
            ))}
          </ul>
        )}
        <button className="btn primary" data-testid="future-site-back" onClick={onLeave}>
          もどる
        </button>
      </div>
    </Place>
  );
}
