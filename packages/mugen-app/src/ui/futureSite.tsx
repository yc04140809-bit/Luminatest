import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { futureSiteDef, type FutureSiteDef } from '@mugen/content/world/futureSites';
import { Place } from './screens';
import { Stage, usePicture } from './scene';
import { eventCg } from '../assets/eventCg';

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
 * dialogue and art; this one states the fact, beside the same picture.
 * Nothing about WHICH facts, or when, differs between them.
 *
 * THE PICTURE IS THE SITE'S OWN `eventCg`, and only once the player is
 * inside — never on the list, where the place is still 「？？？」. It is
 * presentational: a picture that fails to load leaves the words exactly
 * as they were.
 */
/**
 * WHAT THE APP SAYS OF A PLACE NOT YET VISITED — where it differs.
 *
 * ALDEN_BAKERY is the bakery Lina's father runs today, and the App has
 * that shop in the village. The shared content's card was written for
 * the Artifact, where it calls the place a new shop in an empty unit;
 * here, and only here, it says what is true of the App's Alden. Matched
 * on the exact shared sentence, as the tavern's narration is, so a
 * change to the content shows through rather than being papered over.
 * The Artifact, the content and every other place are untouched, and
 * the line appears only on this list of places to look into — never in
 * the bakery the player walks into from the village.
 */
const APP_UNKNOWN_DESCRIPTION: Partial<Record<string, { shared: string; app: string }>> = {
  ALDEN_BAKERY: {
    shared: '以前は空き店舗だった場所に、新しい店ができている。',
    app: 'リナの父が営むパン屋。近ごろ、店の奥が少し賑やかになったらしい。',
  },
};

/** The not-yet-visited description, as the App shows it. */
export function appUnknownDescription(def: FutureSiteDef): string {
  const own = APP_UNKNOWN_DESCRIPTION[def.id];
  return own && def.unknownDescription === own.shared ? own.app : def.unknownDescription;
}

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
  const cgKey = seen?.eventCg ?? null;
  const cg = usePicture(cgKey ? () => eventCg(cgKey) : null, `event-cg:${cgKey}`);
  if (seen) {
    return (
      <Stage
        backdrop="ALDEN"
        picture={cg ? { src: cg, alt: seen.eventCgAlt, testId: 'future-site-cg' } : null}
        side="left"
      >
        <h1 className="place">{seen.knownName}</h1>
        <div data-testid="future-site-seen" data-site={seen.id}>
          <p className="line" data-testid="future-site-description">
            {seen.knownDescription}
          </p>
          <button className="btn primary" data-testid="future-site-done" onClick={onLeave}>
            もどる
          </button>
        </div>
      </Stage>
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
                <span className="memory-meta" data-testid={`future-site-about-${def.id}`}>
                  {discovered ? def.knownDescription : appUnknownDescription(def)}
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
