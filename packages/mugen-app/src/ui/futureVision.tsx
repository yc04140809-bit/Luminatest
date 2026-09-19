import { useState } from 'react';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import type { MemoryEvent } from '@mugen/core/memory/types';
import { memoryEventLabel } from '@mugen/content/events/creatureLifeChoice';
import { GALD_FUTURE_VISION_YEARS } from '@mugen/content/events/galdLifeChoice';
import { Place } from './screens';

/**
 * THREE YEARS LOOKED AT, NOT LIVED THROUGH.
 *
 * Kaos shows the player where the decision they have just made ends
 * up, once, and then brings them back to the moment they made it. The
 * world's clock does not move. No NPC ages, no quest advances, no
 * event enters WORLD MEMORY — what is on this screen is a picture of
 * a future, and the game is careful never to confuse it with one that
 * happened.
 *
 * The events come from `world.previewLifeEvents`, which runs the same
 * chain resolver the clock runs but against a date this world has not
 * reached, and commits nothing. The words are `memoryEventLabel`, the
 * same sentences WORLD MEMORY would use if these ever did happen —
 * existing content, not new writing for this screen.
 */
export function FutureVisionScreen({
  choice,
  future,
  onDone,
}: {
  /** Which life they chose — read only to decide whether one line may be said. */
  choice: LifeChoiceId | null;
  /** What would become of him, previewed. Never written anywhere. */
  future: readonly MemoryEvent[];
  /** Marks the vision seen, then returns to the present. */
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Place area="ALDEN" title="">
      <div data-testid="future-vision">
        <p className="seasons">春 — 夏 — 秋 — 冬</p>
        <p className="line" data-testid="future-vision-years">
          ――{GALD_FUTURE_VISION_YEARS}年後。
        </p>
        <ul className="memory-list" data-testid="future-vision-list">
          {future.map((event) => (
            <li className="memory-row" key={event.id} data-testid={`vision-${event.type}`}>
              <span className="memory-label">{memoryEventLabel(event)}</span>
            </li>
          ))}
        </ul>
        <p className="line">
          あなたの知らないところでも、
          <br />
          人々は生きていた。
        </p>
        {/*
          THE LINE THAT CANNOT BE SAID OVER A GRAVE.
          「あの日出会った人の“続き”も、どこかで動いてるみたい。」 reads
          as "he is out there somewhere" — true on the three routes
          where he lives, a lie on the one where the player killed him.
          Withheld rather than reworded: rewriting it would be writing
          new dialogue for a scene that already has some.
        */}
        {choice !== 'KILL' && (
          <div data-testid="future-vision-guidance">
            <p className="speaker">ケイオス</p>
            <p className="line">
              「あの日出会った人の“続き”も、
              <br />
              どこかで動いてるみたい。」
            </p>
          </div>
        )}
        <button
          className="btn primary"
          data-testid="future-vision-done"
          disabled={busy}
          onClick={() => {
            // ONLY WHEN THEY HAVE FINISHED LOOKING. Showing the screen
            // is not seeing it: if the app closes while this is up, the
            // vision is still owed and will be offered again.
            setBusy(true);
            onDone();
          }}
        >
          現在へもどる
        </button>
      </div>
    </Place>
  );
}
