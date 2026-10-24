import { useState } from 'react';
import { KAOS_INTRO_LINES, PROLOGUE_LINES } from '@mugen/content/dialogue/prologue';
import { Stage, StagedLines, kaosFigureFor } from './scene';

/**
 * THE OPENING — the game's own prologue, the same words the Artifact
 * opens with, read from the same content file.
 *
 * Two scenes wearing one screen, as in the Artifact: the world first,
 * on a black stage and alone — 「あなたが忘れても、世界は覚えている。」 —
 * and then her, standing in front of the title's picture so that
 * meeting her is stepping into the image the player just looked at.
 * The hero is introduced straight after, by being asked their name.
 *
 * Nothing here is written for the App. The App's old three lines were
 * its own and are gone; the prologue is content, and content has one
 * home.
 */
export function PrologueScreen({
  onKaosArrives,
  onDone,
}: {
  /**
   * She has arrived. The music turns to hers on this, as it does in
   * the Artifact — nothing outside can tell which scene is showing.
   */
  onKaosArrives: () => void;
  onDone: () => void;
}) {
  const [part, setPart] = useState<'WORLD' | 'KAOS'>('WORLD');
  const [at, setAt] = useState(0);

  if (part === 'WORLD') {
    const last = at >= PROLOGUE_LINES.length - 1;
    return (
      <Stage backdrop={null} className="stage-monologue" testId="prologue">
        <p className="line monologue" data-testid="opening-line" data-part="WORLD">
          {PROLOGUE_LINES[at].text}
        </p>
        <button
          className="btn"
          data-testid="opening-next"
          onClick={() => {
            if (!last) return setAt((n) => n + 1);
            setPart('KAOS');
            onKaosArrives();
          }}
        >
          つぎへ
        </button>
      </Stage>
    );
  }
  return (
    <StagedLines
      lines={KAOS_INTRO_LINES}
      backdrop="KEY_VISUAL"
      figureFor={kaosFigureFor}
      side="left"
      testId="prologue"
      lineTestId="opening-line"
      nextTestId="opening-next"
      doneLabel="つぎへ"
      onDone={onDone}
    />
  );
}
