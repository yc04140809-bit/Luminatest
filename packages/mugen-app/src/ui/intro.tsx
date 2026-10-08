import { useEffect, useRef, useState } from 'react';
import {
  INTRO_ARRIVAL,
  INTRO_HERO,
  INTRO_NOTE_URL,
  INTRO_SKIP_NOTE,
  INTRO_SKIP_QUESTION,
  OPENING_INTRO,
  type IntroBeat,
} from '@mugen/content/story/openingIntro';
import { Stage, type FigureCue } from './scene';

/**
 * 第0話 — THE WAY INTO ALDEN (content/story/openingIntro), after the name.
 *
 * A moment of dark; the road, and a voice beside him; then her, the
 * village ahead, and his name in her mouth; one moment she is not
 * smiling, and then she is. The card they arrive under —
 * 「MUGEN ZERO / ALDEN VILLAGE」 — and the village is theirs.
 *
 * SKIP is on screen from the first moment to the card, and asks first.
 * Skipped or seen, `onDone` is the one way out — whoever shows this
 * keeps what it means in one place, so the two can never leave the world
 * different. Seen again from 回想 (`recall`), skipping goes straight back
 * and there is no card.
 */

/** How long the dark holds before the road. */
export const INTRO_DARK_MS = 900;
/** How long the arrival card stays, if it is not tapped away. */
export const INTRO_ARRIVAL_MS = 2600;

type Phase = 'dark' | 'beats' | 'arrival';

function figureOf(beat: IntroBeat): FigureCue | null {
  return beat.kaos === 'away' ? null : { who: 'kaos', state: 'talk', alt: 'ケイオス' };
}

export function IntroScreen({
  heroName,
  recall = false,
  onDone,
}: {
  heroName: string;
  /** Seen again from 回想: no card, and skipping simply goes back. */
  recall?: boolean;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('dark');
  const [at, setAt] = useState(0);
  const [asking, setAsking] = useState(false);
  const [held, setHeld] = useState(false);
  const beat = OPENING_INTRO[at];
  const last = at >= OPENING_INTRO.length - 1;
  // Out once, whether the card is tapped or runs out.
  const left = useRef(false);
  const leave = () => {
    if (left.current) return;
    left.current = true;
    onDone();
  };

  // The dark, then the road.
  useEffect(() => {
    if (phase !== 'dark') return;
    const t = window.setTimeout(() => setPhase('beats'), INTRO_DARK_MS);
    return () => window.clearTimeout(t);
  }, [phase]);
  // The card, then the village.
  useEffect(() => {
    if (phase !== 'arrival') return;
    const t = window.setTimeout(leave, INTRO_ARRIVAL_MS);
    return () => window.clearTimeout(t);
  }, [phase]);
  // A held moment: the way on comes after it.
  useEffect(() => {
    if (phase !== 'beats' || !beat.holdMs) return;
    setHeld(true);
    const t = window.setTimeout(() => setHeld(false), beat.holdMs);
    return () => window.clearTimeout(t);
  }, [phase, at]);

  const finish = () => (recall ? leave() : setPhase('arrival'));
  const named = (s: string) => s.split(INTRO_HERO).join(heroName);

  const skip = !asking && phase !== 'arrival' && (
    <button className="intro-skip" data-testid="intro-skip" onClick={() => setAsking(true)}>
      SKIP
    </button>
  );
  const question = asking && (
    <div className="intro-ask" role="dialog" aria-modal="true" data-testid="intro-skip-dialog">
      <div className="intro-ask-card paper-panel">
        <p className="intro-ask-q">{INTRO_SKIP_QUESTION}</p>
        <p className="intro-ask-note" data-testid="intro-skip-note">
          {INTRO_SKIP_NOTE}
        </p>
        <div className="intro-ask-actions">
          {INTRO_NOTE_URL && (
            <button
              className="btn"
              data-testid="intro-note-link"
              onClick={() => window.open(INTRO_NOTE_URL!, '_blank', 'noopener')}
            >
              noteで読む
            </button>
          )}
          <button
            className="btn primary"
            data-testid="intro-skip-yes"
            onClick={() => {
              setAsking(false);
              finish();
            }}
          >
            スキップする
          </button>
          <button className="btn" data-testid="intro-skip-no" onClick={() => setAsking(false)}>
            戻る
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === 'arrival') {
    return (
      <div className="screen intro-arrival" data-testid="intro-arrival" onClick={leave}>
        <p className="intro-arrival-title">{INTRO_ARRIVAL.title}</p>
        <p className="intro-arrival-place">{INTRO_ARRIVAL.place}</p>
      </div>
    );
  }
  if (phase === 'dark') {
    return (
      <div className="screen intro-dark" data-testid="intro" data-phase="dark">
        {skip}
        {question}
      </div>
    );
  }

  const speaker = beat.speaker ? named(beat.speaker) : null;
  const text = named(beat.text);
  return (
    <div className={`intro${beat.kaos === 'still' ? ' intro-still' : ''}`} data-testid="intro" data-phase="beats" data-at={at}>
      <Stage backdrop={beat.place === 'ROAD' ? 'GREENWOOD' : 'ALDEN'} figure={figureOf(beat)} side="left">
        {speaker && <p className="speaker stage-speaker">{speaker}</p>}
        <p className="line stage-line" data-testid="intro-line" data-thought={beat.thought ? 'yes' : 'no'}>
          {beat.thought ? `（${text}）` : speaker ? `「${text}」` : text}
        </p>
        <button
          className="btn primary"
          data-testid="intro-next"
          disabled={held}
          style={held ? { visibility: 'hidden' } : undefined}
          onClick={() => (last ? finish() : setAt((n) => n + 1))}
        >
          つぎへ
        </button>
      </Stage>
      {skip}
      {question}
    </div>
  );
}
