import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import type { MemoryEvent } from '@mugen/core/memory/types';
import { memoryEventLabel } from '@mugen/content/events/creatureLifeChoice';
import { UNKNOWN_CONTINUATION_TEXT } from '@mugen/content/archive/galdChapters';
import { Place } from './screens';

/**
 * WHAT THE PLAYER KNOWS — read, and nothing else.
 *
 * Both screens here are pure projections. WORLD MEMORY is
 * `world.getKnownEvents()` and LIFE ARCHIVE is `world.getLifeArchive()`,
 * which is itself a projection over the same knowledge. Neither writes
 * a row, neither adds a saved key, and neither can: there is no state
 * in this file at all beyond which entry is open on screen.
 *
 * THE FILTER IS THE FEATURE, and it is the core's, not this screen's.
 * `getKnownEvents` hides events the player has not witnessed — the
 * whole off-screen half of Gald's life is tagged with him and not with
 * them — so what is listed here is what a person could actually say
 * they know. Showing `getEvents()` instead would be one line shorter
 * and would leak the ending. This screen must never do that, which is
 * why it reads the filtered list and has no access to the other one.
 */

/** One fact, with the fields a record needs to be checkable. */
function EventRow({ event }: { event: MemoryEvent }) {
  return (
    <li className="memory-row" data-testid={`memory-${event.type}`}>
      <span className="memory-when" data-testid={`memory-when-${event.type}`}>
        {event.worldYear}年目 {event.worldDay}日目
      </span>
      <span className="memory-label" data-testid={`memory-label-${event.type}`}>
        {/* The sentence content writes for this fact. A creature's is
            built from the individual it happened to, which is why this
            is a function and not a lookup. */}
        {memoryEventLabel(event)}
      </span>
      <span className="memory-meta">
        <span data-testid={`memory-type-${event.type}`}>{event.type}</span>
        {' ・ '}
        <span data-testid={`memory-where-${event.type}`}>{event.location}</span>
        {' ・ '}
        <span data-testid={`memory-who-${event.type}`}>{event.actors.join(', ')}</span>
        {' ・ '}
        <span data-testid={`memory-weight-${event.type}`}>{event.importance}</span>
      </span>
    </li>
  );
}

export function WorldMemoryScreen({ world, onBack }: { world: World; onBack: () => void }) {
  const events = world.getKnownEvents();
  return (
    <Place area="ALDEN" title="世界の記憶">
      <div data-testid="world-memory-screen">
        <p className="memory-count" data-testid="memory-count">
          {events.length} 件
        </p>
        {events.length === 0 ? (
          <p className="line" data-testid="memory-empty">
            まだ、覚えていることがない。
          </p>
        ) : (
          <ul className="memory-list">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </ul>
        )}
        <button className="btn primary" data-testid="memory-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </Place>
  );
}

/**
 * ONE LIFE, IN THE CHAPTERS THE PLAYER HAS EARNED.
 *
 * The 「？？？」 card at the end is `hasUnknownContinuation`, and the
 * core is emphatic that it depends only on whether the player has been
 * to the place their choice led to — never on world truth. So it reads
 * the same on all four routes and cannot leak that something has
 * already happened off screen. It is passed straight through.
 */
export function ArchiveScreen({ world, onBack }: { world: World; onBack: () => void }) {
  const entries = world.getLifeArchive();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = entries.find((e) => e.characterId === openId) ?? null;

  if (open) {
    return (
      <Place area="ALDEN" title={open.displayName}>
        <div data-testid="archive-detail" data-character={open.characterId}>
          <ul className="memory-list">
            {open.chapters.map((chapter) => (
              <li className="memory-row" key={chapter.id} data-testid={`chapter-${chapter.id}`}>
                <span className="memory-when">
                  {chapter.worldYear}年目 {chapter.worldDay}日目
                </span>
                <span className="memory-label">{chapter.title}</span>
                <span className="memory-meta">{chapter.summary}</span>
              </li>
            ))}
          </ul>
          {open.hasUnknownContinuation && (
            <p className="line" data-testid="archive-unknown">
              {UNKNOWN_CONTINUATION_TEXT}
            </p>
          )}
          <button className="btn primary" data-testid="archive-detail-back" onClick={() => setOpenId(null)}>
            もどる
          </button>
        </div>
      </Place>
    );
  }

  return (
    <Place area="ALDEN" title="人生の記録">
      <div data-testid="archive-screen">
        {entries.length === 0 ? (
          <p className="line" data-testid="archive-empty">
            まだ、誰の人生も知らない。
          </p>
        ) : (
          <ul className="memory-list">
            {entries.map((entry) => (
              <li className="memory-row" key={entry.characterId}>
                <button
                  className="btn"
                  data-testid={`archive-entry-${entry.characterId}`}
                  onClick={() => setOpenId(entry.characterId)}
                >
                  {entry.displayName}（{entry.chapters.length}章）
                </button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn primary" data-testid="archive-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </Place>
  );
}
