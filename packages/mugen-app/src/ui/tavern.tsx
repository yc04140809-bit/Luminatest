import { useEffect, useState } from 'react';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { ALDEN_EXPERIENCE_EVENTS } from '@mugen/content/experience/aldenExperience';
import { LOCATIONS, locationNameOf } from '@mugen/content/locations/alden';
import { tavernArt, type TavernArt } from '../assets/tavern';

/**
 * 月灯りの酒場 — THE APP'S TAVERN.
 *
 * THREE LAYERS, NEVER ONE PICTURE: the empty room, the master standing
 * in it, and the words over both. The master is not painted into the
 * room, so either can be replaced without touching the other.
 *
 * WHAT HE SAYS IS THE CONTENT'S, WORD FOR WORD. The first talk of a
 * visit to the App is the Artifact's own first meeting with Grave;
 * every talk after it is his ordinary greeting. Which of the two is
 * decided by `metBefore`, which the caller holds for the session —
 * NOT the world: this screen records nothing, so a save, WORLD MEMORY
 * and the story are exactly as they were before the door was opened.
 */

const lineOf = (eventId: string): readonly DialogueLine[] =>
  ALDEN_EXPERIENCE_EVENTS.find((e) => e.eventId === eventId)?.content.lines ?? [];

/**
 * THE ONE LINE THAT DESCRIBES HIM, AS THE APP DRAWS HIM.
 *
 * The content's first meeting was written for the Artifact's tavern,
 * where he is painted behind the bar with his arms folded. The App's
 * master stands with a hand on his hip, laughing — so here, and only
 * here, that one line of narration says what the player can see. The
 * event, every other line and the Artifact's text are untouched.
 */
const ARMS_FOLDED = 'カウンターの奥に、腕を組んだ大男が立っている。';
const AS_DRAWN: readonly DialogueLine[] = [
  { speaker: null, text: 'カウンターの奥に、大柄な男が立っている。' },
  { speaker: null, text: '片手を腰に当て、豪快な笑みを浮かべていた。' },
];

/** Meeting him: the Artifact's first visit, with him described as drawn here. */
export const TAVERN_MEETING_LINES: readonly DialogueLine[] = lineOf('MOONLIGHT_TAVERN_FIRST_VISIT').flatMap(
  (l) => (l.speaker === null && l.text === ARMS_FOLDED ? AS_DRAWN : [l]),
);
/** Every talk after that: his ordinary greeting, as written. */
export const TAVERN_GREETING_LINES = lineOf('TAVERN_MASTER_IDLE');

const TAVERN_ID = 'MOONLIGHT_TAVERN';

export function TavernScreen({
  metBefore,
  onMet,
  onLeave,
}: {
  /** Whether he has already been talked to this session. */
  metBefore: boolean;
  /** Told when the first talk has been read to its end. */
  onMet: () => void;
  onLeave: () => void;
}) {
  const [art, setArt] = useState<TavernArt>({ room: null, master: null });
  const [talking, setTalking] = useState<readonly DialogueLine[] | null>(null);
  const [at, setAt] = useState(0);
  // Pictures that fail to load are dropped; the words never wait for art.
  const [failed, setFailed] = useState<{ room?: boolean; master?: boolean }>({});

  useEffect(() => {
    let gone = false;
    void tavernArt().then((a) => {
      if (!gone) setArt(a);
    });
    return () => {
      gone = true;
    };
  }, []);

  const line = talking?.[at];
  const last = !!talking && at >= talking.length - 1;
  const description = LOCATIONS.find((l) => l.id === TAVERN_ID)?.description ?? '';

  const talk = () => {
    setAt(0);
    setTalking(metBefore ? TAVERN_GREETING_LINES : TAVERN_MEETING_LINES);
  };
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    if (!metBefore) onMet();
    setTalking(null);
  };

  return (
    <div className="screen tavern" data-testid="tavern-screen">
      {art.room && !failed.room && (
        <img
          className="tavern-room"
          src={art.room}
          alt=""
          aria-hidden="true"
          data-testid="tavern-room"
          onError={() => setFailed((f) => ({ ...f, room: true }))}
        />
      )}
      {art.master && !failed.master && (
        <img
          className="tavern-master"
          src={art.master}
          alt="酒場のマスター"
          data-testid="tavern-master"
          onError={() => setFailed((f) => ({ ...f, master: true }))}
        />
      )}
      <div className="tavern-words" data-testid="tavern-words">
        <h1 className="place">{locationNameOf(TAVERN_ID)}</h1>
        {line ? (
          <>
            {line.speaker && <p className="speaker">{line.speaker}</p>}
            <p className="line" data-testid="tavern-line">
              {line.speaker ? `「${line.text}」` : line.text}
            </p>
            <button className="btn primary" data-testid="tavern-next" onClick={next}>
              {last ? 'もどる' : 'つぎへ'}
            </button>
          </>
        ) : (
          <>
            <p className="line" data-testid="tavern-description">
              {description}
            </p>
            <div className="actions">
              <button className="btn primary" data-testid="tavern-talk" onClick={talk}>
                話す
              </button>
              <button className="btn" data-testid="tavern-leave" onClick={onLeave}>
                店を出る
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
