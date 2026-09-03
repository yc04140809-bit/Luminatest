import { useState } from 'react';
import type { WorldClock } from '../../core/events/types';
import { DEV_ADMIN_ENABLED } from '../../dev/devMode';
import { ScreenBackdrop } from '../common/ScreenBackdrop';
import { Ornament } from '../common/Ornament';
import {
  locationBackground,
  locationBackgroundFit,
  locationBackgroundFocus,
  type LocationId,
} from '../../content/locations/locationVisuals';
import { LOCATIONS } from '../../content/locations/alden';
import { KAOS_HOME_ASIDES } from '../../content/dialogue/bakery';
import type { HomeMemorySummary } from '../home/homeSummary';

interface Props {
  /**
   * Where the player is resting. HOME is a place, not a menu, so the
   * backdrop and the name both come from here — a future forest camp or
   * capital lodging needs no change to this screen.
   */
  locationId: LocationId;
  clock: WorldClock;
  /** What the world has recorded so far. Display only — see homeSummary. */
  memory: HomeMemorySummary;
  onExplore: () => void;
  onWorldMemory: () => void;
  /** REST: advances the world by one day. */
  onRest: () => Promise<void>;
  /** Opens the TIME SHIFT confirmation screen. */
  onTimeShift: () => void;
  /** Opens the LIFE ARCHIVE. */
  onArchive: () => void;
  /** Opens player settings. */
  onSettings: () => void;
  /** Opens the DEV ADMIN lock screen (dev builds only). */
  onDevAdmin: () => void;
}

/**
 * HOME — the face of MUGEN ZERO.
 *
 * Not a menu with a picture behind it. The screen is built as one plate:
 * a hairline gold frame holds the title, what the world remembers, the
 * place itself held inside a ring, and the one action that matters, in
 * that order down the page.
 *
 * The ring is the centre of the design and the centre of the game. Today
 * it holds the village; later it holds whoever is standing in it — Kaos,
 * the player, an NPC, a Live2D figure. Nothing here assumes it stays
 * empty, and nothing here draws a character: an empty ring reads as a
 * place waiting for someone, which is exactly what it is.
 */
export function HomeScreen({
  locationId,
  clock,
  memory,
  onExplore,
  onWorldMemory,
  onRest,
  onTimeShift,
  onArchive,
  onSettings,
  onDevAdmin,
}: Props) {
  const [resting, setResting] = useState(false);
  const place = LOCATIONS.find((l) => l.id === locationId);

  // Kaos is around without being an event: one line, on about one day in
  // seven, chosen from the clock so it never flickers between renders.
  const aside =
    clock.worldDay % 7 === 3 ? KAOS_HOME_ASIDES[clock.worldDay % KAOS_HOME_ASIDES.length] : null;

  const rest = async () => {
    if (resting) return;
    setResting(true);
    try {
      await onRest();
    } finally {
      setResting(false);
    }
  };

  return (
    <div className="screen home-plate">
      <div className="home-frame" aria-hidden="true">
        <span className="home-corner tl" />
        <span className="home-corner tr" />
        <span className="home-corner bl" />
        <span className="home-corner br" />
      </div>

      <div className="home-scroll">
        {/* ---- LEVEL 1: whose world this is ---- */}
        <header className="home-crest">
          <Ornament kind="wings" size={30} className="home-crest-wings" />
          <h1 className="home-crest-name">MUGEN ZERO</h1>
          <p className="home-crest-sub">WORLD MEMORY RPG</p>
        </header>

        {/* ---- LEVEL 2: what the world is holding ---- */}
        <section className="home-memory" data-testid="home-memory">
          <div className="home-memory-head">
            <span className="rule" />
            <span className="label">WORLD MEMORY</span>
            <span className="rule" />
          </div>
          <dl className="home-memory-counts">
            <div>
              <dt>記憶</dt>
              <dd data-testid="home-memory-count">{memory.memories}</dd>
            </div>
            <div>
              <dt>出会い</dt>
              <dd data-testid="home-encounter-count">{memory.encounters}</dd>
            </div>
            <div>
              <dt>再会</dt>
              <dd data-testid="home-reunion-count">{memory.reunions}</dd>
            </div>
            <div>
              <dt>問い</dt>
              <dd data-testid="home-thread-count">{memory.openThreads}</dd>
            </div>
          </dl>
          <p className="home-memory-latest" data-testid="home-latest-memory">
            {memory.latest ? (
              <>
                <span className="when">
                  {memory.latest.worldYear}年目 {memory.latest.worldDay}日目
                </span>
                {memory.latest.label}
              </>
            ) : (
              <span className="none">世界はまだ、何も覚えていない。</span>
            )}
          </p>
          <button className="home-memory-open" data-testid="world-memory-button" onClick={onWorldMemory}>
            世界の記憶
            <span className="chev" aria-hidden="true">
              ›
            </span>
          </button>
        </section>

        {/* ---- LEVEL 3: the place, held in a ring ----
            The art lives inside the circle and nowhere else. Outside it
            the page stays quiet, so the eye is pulled to the middle and
            the middle is left free for whoever will stand there later. */}
        <section className="home-hero">
          <div className="home-hero-ring">
            <div className="home-hero-art">
              <ScreenBackdrop
                src={locationBackground(locationId)}
                focus={locationBackgroundFocus(locationId)}
                fit={locationBackgroundFit(locationId)}
                variant="hero"
                testId="home-backdrop"
              />
            </div>
            <span className="home-hero-ring-line" aria-hidden="true" />
          </div>
          <div className="home-hero-caption">
            <p className="home-place" data-testid="home-place">
              {locationId.replace(/_/g, ' ')} — {place?.name ?? ''}
            </p>
            <p className="home-clock" data-testid="world-clock">
              {clock.worldYear}年目 {clock.worldDay}日目
            </p>
          </div>
          {aside && (
            <p className="home-kaos-aside" data-testid="kaos-aside">
              ケイオス {aside}
            </p>
          )}
        </section>

        {/* ---- LEVEL 4: the one thing to do ---- */}
        <div className="home-act">
          <span className="home-act-rule" aria-hidden="true" />
          <button className="home-explore" data-testid="explore-button" onClick={onExplore}>
            <Ornament kind="ring" size={17} className="home-explore-ring" />
            <span className="home-explore-jp">探索する</span>
            <span className="home-explore-en">EXPLORE</span>
          </button>
          <span className="home-act-rule" aria-hidden="true" />
        </div>

        {/* ---- LEVEL 5: everything else, quietly ---- */}
        <nav className="home-rail">
          <button className="home-rail-item" data-testid="archive-button" onClick={onArchive}>
            <span className="glyph">◇</span>
            人生の記録
          </button>
          <button className="home-rail-item" data-testid="time-shift-button" onClick={onTimeShift}>
            <span className="glyph">◷</span>
            旅立つ
            <span className="sub">+3年</span>
          </button>
          <button
            className="home-rail-item"
            data-testid="rest-button"
            disabled={resting}
            onClick={rest}
          >
            <span className="glyph">☾</span>
            {resting ? '休息中…' : '休息する'}
          </button>
          <button className="home-rail-item" data-testid="settings-button" onClick={onSettings}>
            <span className="glyph">✦</span>
            設定
          </button>
        </nav>

        {DEV_ADMIN_ENABLED && (
          <button className="home-dev" data-testid="dev-admin-entry" onClick={onDevAdmin}>
            DEV
          </button>
        )}
      </div>
    </div>
  );
}
