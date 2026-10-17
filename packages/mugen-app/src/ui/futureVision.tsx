import { useState } from 'react';
import type { MemoryEvent } from '@mugen/core/memory/types';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { memoryEventLabel } from '@mugen/content/events/creatureLifeChoice';
import {
  FUTURE_VISION_INTRO_LINES,
  FUTURE_VISION_RETURN_LINES,
  FUTURE_VISION_SEEN_LINE,
} from '@mugen/content/dialogue/galdEncounter';
import { GALD_FUTURE_VISION_YEARS } from '@mugen/content/events/galdLifeChoice';
import { FUTURE_SITE_DEFS } from '@mugen/content/world/futureSites';
import type { EventCgKey } from '@mugen/assets/keys';
import { Stage, kaosFigureFor, usePicture } from './scene';
import { eventCg } from '../assets/eventCg';

/**
 * She is the one talking through all three beats — asking, showing,
 * bringing them back — so she stands there for all of it, drawn by
 * the same rule as every other line of hers.
 */
const HER = kaosFigureFor({ speaker: 'ケイオス', text: '' });

/**
 * THREE YEARS LOOKED AT, NOT LIVED THROUGH.
 *
 * Kaos shows the player where the answer they have just given ends up,
 * once, and then puts them back in the moment they gave it. The
 * world's clock does not move, nobody ages, no quest advances and
 * nothing she shows enters WORLD MEMORY — what is on this screen is a
 * picture of one future, and the game is careful never to confuse it
 * with one that happened.
 *
 * The events come from `world.previewLifeEvents`, which runs the same
 * chain resolver the clock runs but against a date this world has not
 * reached, and commits nothing. Their sentences are `memoryEventLabel`
 * — the words WORLD MEMORY would use if these ever did happen. Her
 * lines are content, written for this beat.
 *
 * Three beats, in the order the scene is specified: she asks, she
 * shows, she brings them back.
 */
/**
 * THE ONE PICTURE OF THE FUTURE SHE SHOWS — the player's own, and no other.
 *
 * Read off what is already defined, never chosen here: `future` is the
 * chain previewed from the answer the player gave (`lifeEvents.ts`),
 * and each future site names the life event it belongs to
 * (`requiredMemory`) and its picture (`eventCg`). The site whose event
 * is in this preview is the future being shown. Exactly one, or no
 * picture at all: this never guesses, never offers the others, and
 * never lets the player pick.
 */
export function visionCgOf(future: readonly MemoryEvent[]): { key: EventCgKey; alt: string } | null {
  const types = new Set(future.map((e) => e.type));
  const sites = FUTURE_SITE_DEFS.filter((d) => d.eventCg && types.has(d.requiredMemory));
  if (sites.length !== 1 || !sites[0].eventCg) return null;
  return { key: sites[0].eventCg, alt: sites[0].eventCgAlt };
}

function Lines({ lines }: { lines: readonly DialogueLine[] }) {
  return (
    <>
      {lines.map((line, i) => (
        <p className="line" key={i}>
          {line.speaker ? `${line.speaker}「${line.text}」` : line.text}
        </p>
      ))}
    </>
  );
}

export function FutureVisionScreen({
  future,
  onDone,
}: {
  /** What would become of him, previewed. Never written anywhere. */
  future: readonly MemoryEvent[];
  /** Marks the vision seen, then returns to the present. */
  onDone: () => void;
}) {
  const [beat, setBeat] = useState<'ASK' | 'SEE' | 'BACK'>('ASK');
  const [leaving, setLeaving] = useState(false);
  const vision = visionCgOf(future);
  const cg = usePicture(vision ? () => eventCg(vision.key) : null, `event-cg:${vision?.key ?? 'none'}`);

  if (beat === 'ASK') {
    return (
      <Stage backdrop="ALDEN" figure={HER} side="left">
        <div data-testid="future-vision" data-beat="ASK">
          <Lines lines={FUTURE_VISION_INTRO_LINES} />
          <button className="btn primary" data-testid="future-vision-next" onClick={() => setBeat('SEE')}>
            見る
          </button>
        </div>
      </Stage>
    );
  }

  if (beat === 'SEE') {
    // What she shows stands where she stood, for this one beat.
    return (
      <Stage
        backdrop="ALDEN"
        figure={vision ? null : HER}
        picture={vision && cg ? { src: cg, alt: vision.alt, testId: 'future-vision-cg' } : null}
        side="left"
        // A LOW SCREEN NEVER HIDES THE WAY ON. The words scroll inside
        // their own column if they must; つづける stays on screen.
        className="vision-see"
      >
        <div data-testid="future-vision" data-beat="SEE" className="vision-see-words">
          <div className="vision-see-body" data-testid="future-vision-body">
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
            {/* ONE future, not the future — she says so herself. */}
            <p className="speaker">ケイオス</p>
            <p className="line" data-testid="future-vision-one">
              「{FUTURE_VISION_SEEN_LINE}」
            </p>
          </div>
          <button className="btn primary" data-testid="future-vision-next" onClick={() => setBeat('BACK')}>
            つづける
          </button>
        </div>
      </Stage>
    );
  }

  return (
    <Stage backdrop="ALDEN" figure={HER} side="left">
      <div data-testid="future-vision" data-beat="BACK">
        <div data-testid="future-vision-return">
          <Lines lines={FUTURE_VISION_RETURN_LINES} />
        </div>
        <button
          className="btn primary"
          data-testid="future-vision-done"
          disabled={leaving}
          onClick={() => {
            // ONLY WHEN THEY HAVE FINISHED LOOKING. Reaching the screen
            // is not seeing it: if the app closes before this, the
            // vision is still owed and is shown again.
            setLeaving(true);
            onDone();
          }}
        >
          現在へもどる
        </button>
      </div>
    </Stage>
  );
}
