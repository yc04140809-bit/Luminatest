import { useState } from 'react';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import {
  CHOICE_RESULT_LINES,
  GALD_ENCOUNTER_LINES,
  GALD_LIFE_CHOICE_LINE,
  LIFE_CHOICE_OPTIONS,
  LIFE_CHOICE_PROMPT,
} from '@mugen/content/dialogue/galdEncounter';
import { Place } from './screens';
import { Stage, StagedLines, kaosFigureFor } from './scene';

/**
 * THE ONE FIGHT THE SLICE IS BUILT TO ARRIVE AT.
 *
 * Not a word on these three screens was written here. The bandit's
 * lines, the question, the four answers and what each one leaves
 * behind are all `content/dialogue/galdEncounter` — the same strings,
 * from the same file, that the Artifact reads. If the App phrased the
 * question its own way there would be two versions of the moment the
 * whole game turns on, and only one of them would get edited.
 */

/** Lines read one at a time, which is all a scene needs to be here. */
function Scene({
  lines,
  testId,
  nextTestId,
  doneLabel,
  onDone,
}: {
  lines: readonly DialogueLine[];
  testId: string;
  nextTestId: string;
  doneLabel: string;
  onDone: () => void;
}) {
  const [at, setAt] = useState(0);
  const last = at >= lines.length - 1;
  const line = lines[at];
  return (
    <>
      <p className="line" data-testid={testId}>
        {line.speaker ? `${line.speaker}「${line.text}」` : line.text}
      </p>
      <button
        className="btn primary"
        data-testid={nextTestId}
        onClick={() => (last ? onDone() : setAt((n) => n + 1))}
      >
        {last ? doneLabel : 'つぎへ'}
      </button>
    </>
  );
}

/** He stops you on the path — standing in it, knives out. */
export function GaldEncounterScreen({ onBattle }: { onBattle: () => void }) {
  return (
    <StagedLines
      lines={GALD_ENCOUNTER_LINES}
      backdrop="GREENWOOD"
      // His TALKING picture, asked for by state. He has none, and the
      // core's talk chain answers with his full standing figure — the
      // same drawing the Artifact shows here, by the same rule.
      figureFor={(line) =>
        kaosFigureFor(line) ?? { who: 'gald', state: 'talk', alt: '森で行く手をふさぐ盗賊' }
      }
      side="right"
      title="グリーンウッドの森"
      testId="gald-encounter"
      lineTestId="encounter-line"
      nextTestId="encounter-next"
      doneLabel="戦う"
      onDone={onBattle}
    />
  );
}

/**
 * THE FOUR ANSWERS.
 *
 * `onChoose` must not resolve until WORLD MEMORY has the write, and
 * the screen must not advance before it does — a choice that is on
 * screen but not on disk is a choice the game can lose. So the buttons
 * are disabled while it is in flight, and a failure says so and leaves
 * the four answers up rather than pretending.
 */
export function LifeChoiceScreen({
  onChoose,
}: {
  onChoose: (choice: LifeChoiceId) => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const choose = (choice: LifeChoiceId) => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    void onChoose(choice)
      .catch((e) => {
        console.error('Failed to save the life choice', e);
        setFailed(true);
      })
      .finally(() => setSaving(false));
  };

  return (
    <Stage
      backdrop="GREENWOOD"
      // Beaten, on one knee: a person being decided, not a menu.
      figure={{ who: 'gald', state: 'portrait', alt: '膝をついた盗賊' }}
      side="left"
      className="life-choice"
      testId="life-choice-screen"
    >
      <h1 className="place">グリーンウッドの森</h1>
      <p className="speaker stage-speaker">盗賊 ガルド</p>
      <p className="line stage-line" data-testid="life-choice-line">
        「{GALD_LIFE_CHOICE_LINE}」
      </p>
      <p className="line stage-line" data-testid="life-choice-prompt">
        {LIFE_CHOICE_PROMPT}
      </p>
      <div className="actions choice-grid">
        {LIFE_CHOICE_OPTIONS.map((opt) => (
          <button
            className="btn"
            key={opt.id}
            data-testid={`choice-${opt.id}`}
            disabled={saving}
            onClick={() => choose(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {saving && <p className="say">記録しています……</p>}
      {failed && (
        <p className="warn" data-testid="save-error">
          記録できませんでした。もう一度選んでください。
        </p>
      )}
    </Stage>
  );
}

/** What the answer left behind, in the words the answer has. */
export function ChoiceResultScreen({
  choice,
  onHome,
}: {
  choice: LifeChoiceId;
  onHome: () => void;
}) {
  return (
    <Place area="GREENWOOD" title="グリーンウッドの森">
      <div data-testid="choice-result" data-choice={choice}>
        <Scene
          lines={CHOICE_RESULT_LINES[choice]}
          testId="choice-result-line"
          nextTestId="choice-result-next"
          doneLabel="村へもどる"
          onDone={onHome}
        />
      </div>
    </Place>
  );
}
