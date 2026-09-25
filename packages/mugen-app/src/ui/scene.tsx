import { useEffect, useState, type ReactNode } from 'react';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import type { PartyArtState } from '@mugen/core/art/artStates';
import { kaosPortraitState, kaosTalkMode } from '@mugen/content/characters/kaosPortraits';
import { areaArt, type AreaId } from '../assets/areas';
import { sceneArt, titleKeyVisual, type SceneCharacter } from '../assets/sceneArt';

/**
 * A SCENE WITH PEOPLE IN IT — the App's first step past plain text.
 *
 * A stage is a backdrop, one standing figure on one side, and the
 * words and the one button on the other. Landscape is the only shape
 * the App is played in, so the figure takes the full height of the
 * screen beside the words instead of shrinking into a corner above
 * them, and nothing ever sits on top of a face.
 *
 * Every picture is fetched when the scene plays and is optional: a
 * picture that has not arrived, or never will, leaves the words
 * exactly where they were. Nothing on a stage waits for art.
 */

/** Where a stage is: a place the player walked to, or the title's picture. */
export type Backdrop = AreaId | 'KEY_VISUAL' | null;

/** Somebody to draw, and which of their states the moment wants. */
export interface FigureCue {
  who: SceneCharacter;
  state: PartyArtState;
  alt: string;
}

const KAOS_SPEAKER = 'ケイオス';

/**
 * HER, WHENEVER SHE IS THE ONE TALKING — calm or 臨戦, by the line.
 *
 * The line says how it feels; `kaosTalkMode` and `kaosPortraitState`
 * in core say which drawing that is. The same two calls the Artifact's
 * dialogue makes, so the two cannot show her differently.
 */
export function kaosFigureFor(line: DialogueLine | undefined): FigureCue | null {
  if (line?.speaker !== KAOS_SPEAKER) return null;
  return {
    who: 'kaos',
    state: kaosPortraitState(kaosTalkMode(line.tense ?? false)),
    alt: 'ケイオス',
  };
}

export function usePicture(load: (() => Promise<string | null>) | null, key: string): string | null {
  const [src, setSrc] = useState<{ key: string; src: string | null } | null>(null);
  useEffect(() => {
    if (!load) return;
    let gone = false;
    void load().then((s) => {
      if (!gone) setSrc({ key, src: s });
    });
    return () => {
      gone = true;
    };
    // `key` names what `load` fetches; the function itself is new on
    // every render and must not refetch.
  }, [key]);
  return src && src.key === key ? src.src : null;
}

export function Stage({
  backdrop,
  figure,
  side = 'left',
  className = '',
  testId,
  children,
}: {
  backdrop: Backdrop;
  figure?: FigureCue | null;
  /** Which side the figure stands on; the words take the other. */
  side?: 'left' | 'right';
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  const back = usePicture(
    backdrop === null
      ? null
      : backdrop === 'KEY_VISUAL'
        ? titleKeyVisual
        : () => areaArt(backdrop).then((a) => a.background),
    `backdrop:${backdrop}`,
  );
  const [failed, setFailed] = useState<string | null>(null);
  const figureKey = figure ? `${figure.who}:${figure.state}` : 'none';
  const person = usePicture(
    figure ? () => sceneArt(figure.who, figure.state) : null,
    figureKey,
  );
  const showPerson = figure && person && failed !== person;
  return (
    <div
      className={`screen stage stage-${side} ${showPerson ? 'has-figure' : ''} ${className}`}
      data-testid={testId}
    >
      {back && (
        <img
          className={`stage-backdrop ${backdrop === 'KEY_VISUAL' ? 'key-visual' : ''}`}
          src={back}
          alt=""
          aria-hidden="true"
          data-testid="stage-backdrop"
        />
      )}
      {showPerson && (
        <img
          className="stage-figure"
          src={person}
          alt={figure.alt}
          data-testid="stage-figure"
          data-who={figure.who}
          data-state={figure.state}
          onError={() => setFailed(person)}
        />
      )}
      <div className="stage-words">{children}</div>
    </div>
  );
}

/**
 * Lines read one at a time on a stage. The figure can change with the
 * line — Kaos arriving mid-scene, say — and the words never move.
 */
export function StagedLines({
  lines,
  backdrop,
  figureFor,
  side,
  title,
  testId,
  lineTestId,
  nextTestId,
  doneLabel,
  onLine,
  onDone,
}: {
  lines: readonly DialogueLine[];
  backdrop: Backdrop;
  figureFor: (line: DialogueLine) => FigureCue | null;
  side?: 'left' | 'right';
  title?: string;
  testId?: string;
  lineTestId: string;
  nextTestId: string;
  doneLabel: string;
  /** Told which line is up, including the first. */
  onLine?: (line: DialogueLine) => void;
  onDone: () => void;
}) {
  const [at, setAt] = useState(0);
  const line = lines[at];
  const last = at >= lines.length - 1;
  useEffect(() => {
    if (line) onLine?.(line);
    // Only when the line changes.
  }, [at]);
  return (
    <Stage backdrop={backdrop} figure={figureFor(line)} side={side} testId={testId}>
      {title && <h1 className="place">{title}</h1>}
      {line.speaker && <p className="speaker stage-speaker">{line.speaker}</p>}
      <p className="line stage-line" data-testid={lineTestId}>
        {line.speaker ? `「${line.text}」` : line.text}
      </p>
      <button
        className="btn primary"
        data-testid={nextTestId}
        onClick={() => (last ? onDone() : setAt((n) => n + 1))}
      >
        {last ? doneLabel : 'つぎへ'}
      </button>
    </Stage>
  );
}
