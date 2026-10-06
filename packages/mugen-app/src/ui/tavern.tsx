import { useEffect, useState } from 'react';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { ALDEN_EXPERIENCE_EVENTS } from '@mugen/content/experience/aldenExperience';
import { LOCATIONS, locationNameOf } from '@mugen/content/locations/alden';
import {
  HERO_SPEAKER,
  SEKIRYUGA_RUMORS,
  SEKIRYUGA_TAVERN_EVENT,
  TAVERN_AFTER_TOLD_LINE,
} from '@mugen/content/story/sekiryugaArc';
import type { SekiryugaStage } from '@mugen/core/world/storyArc';
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
 * NOT the world.
 *
 * THE FIRST BOSS ROUTE (content/story/sekiryugaArc) adds words and their
 * order, and nothing to the room, the master or the box (docs/APP_TAVERN.md
 * stays as it was): once the route has begun, his ordinary talk ends on
 * his rumour; walking in after any rumour — or reading his to its end —
 * starts his story, which opens the ruins. The ONLY things this screen
 * records are those two steps of the route, through `arc` — never WORLD
 * MEMORY, never anything else in the save.
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

/** His greeting's last line — "nothing worth hearing tonight" — which the route's lines replace. */
const NOTHING_TONIGHT = '今夜は、めぼしい話は入ってきてねぇ。';

/**
 * What a talk is, with the route's words where they belong:
 *
 *   route not begun, or past the master's part   → as written
 *   begun, nothing heard yet (NONE)              → ending on his rumour
 *   his story told, the seal not yet looked at   → ending 「遺跡のこと、無理はするなよ。」
 */
export function tavernTalkLines(
  base: readonly DialogueLine[],
  arc: { open: boolean; stage: SekiryugaStage } | undefined,
): { lines: readonly DialogueLine[]; rumor: boolean } {
  if (!arc?.open) return { lines: base, rumor: false };
  const ending = (line: DialogueLine) => {
    const at = base.findIndex((l) => l.text === NOTHING_TONIGHT);
    return at >= 0 ? [...base.slice(0, at), line, ...base.slice(at + 1)] : [...base, line];
  };
  if (arc.stage === 'NONE') return { lines: ending(SEKIRYUGA_RUMORS.TAVERN), rumor: true };
  if (arc.stage === 'TOLD') return { lines: ending(TAVERN_AFTER_TOLD_LINE), rumor: false };
  return { lines: base, rumor: false };
}

/** A line as the box shows it: the hero under their name, and written breaks run together. */
function shown(line: DialogueLine, heroName: string): DialogueLine {
  return {
    speaker: line.speaker === HERO_SPEAKER ? heroName : line.speaker,
    text: line.text.replace(/\n/g, ''),
  };
}

const TAVERN_ID = 'MOONLIGHT_TAVERN';

export function TavernScreen({
  metBefore,
  onMet,
  onLeave,
  arc,
  heroName = '',
}: {
  /** Whether he has already been talked to this session. */
  metBefore: boolean;
  /** Told when the first talk has been read to its end. */
  onMet: () => void;
  onLeave: () => void;
  /**
   * The first boss route, where it has got to, and its two steps here:
   * his rumour heard, his story told. Absent: the tavern as it always was.
   */
  arc?: { open: boolean; stage: SekiryugaStage; onRumor: () => void; onTold: () => void };
  /** What the hero is called, for the lines they speak in his story. */
  heroName?: string;
}) {
  const [art, setArt] = useState<TavernArt>({ room: null, master: null });
  // HIS STORY IS DUE on walking in, once any rumour has been heard.
  const due = !!arc?.open && arc.stage === 'RUMOR';
  const [talking, setTalking] = useState<readonly DialogueLine[] | null>(due ? SEKIRYUGA_TAVERN_EVENT : null);
  // What the talk on screen is: an ordinary one (ending on his rumour or not), or his story.
  const [kind, setKind] = useState<'TALK' | 'RUMOR' | 'STORY'>(due ? 'STORY' : 'TALK');
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

  const raw = talking?.[at];
  const line = raw ? shown(raw, heroName) : undefined;
  const last = !!talking && at >= talking.length - 1;
  const description = LOCATIONS.find((l) => l.id === TAVERN_ID)?.description ?? '';

  const talk = () => {
    const { lines, rumor } = tavernTalkLines(metBefore ? TAVERN_GREETING_LINES : TAVERN_MEETING_LINES, arc);
    setAt(0);
    setKind(rumor ? 'RUMOR' : 'TALK');
    setTalking(lines);
  };
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    if (kind === 'STORY') {
      // Told: the ruins open. (And he has been talked to, whichever way in.)
      arc?.onTold();
      if (!metBefore) onMet();
      setKind('TALK');
      setTalking(null);
      return;
    }
    if (!metBefore) onMet();
    if (kind === 'RUMOR') {
      // His own rumour was the first: no need to walk out and in again —
      // his story follows straight on.
      arc?.onRumor();
      setAt(0);
      setKind('STORY');
      setTalking(SEKIRYUGA_TAVERN_EVENT);
      return;
    }
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
              {last && kind !== 'RUMOR' ? 'もどる' : 'つぎへ'}
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
