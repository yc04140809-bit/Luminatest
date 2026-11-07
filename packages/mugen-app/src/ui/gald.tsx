import { useEffect, useState, type ReactNode } from 'react';
import { sayKaosLine } from './audio/kaosLineVoice';
import { audioManager, playVoice } from '../platform/audio';
import { lineVoice } from '../platform/voice';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import {
  GALD_ENCOUNTER_LINES,
  GALD_LIFE_CHOICE_LINE,
  LIFE_CHOICE_OPTIONS,
  LIFE_CHOICE_PROMPT,
  MEDICINE_DISCOVERY_LINES,
  MEDICINE_MEMO,
  choiceResultLinesAfterDiscovery,
} from '@mugen/content/dialogue/galdEncounter';
import { Place } from './screens';
import { Stage, StagedLines, kaosFigureFor } from './scene';
import { Typed } from './common/Typed';
import { GALD } from '@mugen/content/characters/gald';
import { withHeroName } from './common/heroName';

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
  atEnd,
  heroName,
}: {
  lines: readonly DialogueLine[];
  /** His name, put in where the narration speaks of him (`{HERO}`). */
  heroName: string;
  testId: string;
  nextTestId: string;
  doneLabel: string;
  onDone: () => void;
  /** Shown with the last line, and only then. */
  atEnd?: ReactNode;
}) {
  const [at, setAt] = useState(0);
  const last = at >= lines.length - 1;
  const line = lines[at];
  // His words in it, heard as they come up (ボイスパック18) — the answer given, his question is cut off by them.
  useEffect(() => {
    sayKaosLine(`${testId}:${at}`, line);
  }, [at]);
  return (
    <>
      {last && atEnd}
      <p className="line" data-testid={testId}>
        <Typed text={withHeroName(line.speaker ? `${line.speaker}「${line.text}」` : line.text, heroName)} />
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

/**
 * 「盗賊」 UNTIL HE GIVES HIS NAME (作者 2026-11-05): the hero has not been told it, so the game does not show it —
 * in the forest, in the fight, beside the four answers. The lines as content has them (the Artifact's own stay as
 * they are); here only who says them is shown as the hero knows him.
 */
export const GALD_UNNAMED = GALD.unknownName;
const unnamed = (lines: readonly DialogueLine[]): DialogueLine[] =>
  lines.map((l) => (l.speaker && l.speaker.startsWith(GALD_UNNAMED) ? { ...l, speaker: GALD_UNNAMED } : l));
const ENCOUNTER_LINES = unnamed(GALD_ENCOUNTER_LINES);

/** He stops you on the path — standing in it, knives out. */
export function GaldEncounterScreen({ onBattle }: { onBattle: () => void }) {
  return (
    <StagedLines
      lines={ENCOUNTER_LINES}
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
 * 発見 (作者 2026-11-03): before the four answers, on the same stage — what fell from his pack, the note, the hero
 * picking it up, her 「……薬？」 and his 「妹だ。病気なんだ」. Tapped through, ten seconds or so.
 *
 * Her word in her mouth, his in his: after his last word (still being said as this comes up), never over it.
 */
function MedicineDiscovery({ onDone, heroName }: { onDone: () => void; heroName: string }) {
  const [at, setAt] = useState(0);
  const line = MEDICINE_DISCOVERY_LINES[at];
  const last = at >= MEDICINE_DISCOVERY_LINES.length - 1;
  useEffect(() => {
    if (line.speaker === 'ケイオス') sayKaosLine(`medicine-discovery:${at}`, line, { wait: true });
    else if (line.speaker) {
      const id = lineVoice(line.speaker, line.text);
      if (id) playVoice(id, { mouth: 'foe', wait: true });
    }
  }, [at]);
  return (
    <>
      {line.showsMemo && (
        <p className="medicine-memo" data-testid="medicine-memo" aria-label="メモ">
          {MEDICINE_MEMO}
        </p>
      )}
      {line.speaker && <p className="speaker stage-speaker">{line.speaker}</p>}
      <p className="line stage-line" data-testid="discovery-line" key={at}>
        <Typed text={withHeroName(line.speaker ? `「${line.text}」` : line.text, heroName)} />
      </p>
      <button className="btn primary" data-testid="discovery-next" onClick={() => (last ? onDone() : setAt((n) => n + 1))}>
        つぎへ
      </button>
    </>
  );
}

/**
 * THE FOUR ANSWERS — after the medicine is found (MedicineDiscovery), on the same stage.
 *
 * `onChoose` must not resolve until WORLD MEMORY has the write, and
 * the screen must not advance before it does — a choice that is on
 * screen but not on disk is a choice the game can lose. So the buttons
 * are disabled while it is in flight, and a failure says so and leaves
 * the four answers up rather than pretending.
 */
export function LifeChoiceScreen({
  onChoose,
  heroName,
}: {
  onChoose: (choice: LifeChoiceId) => Promise<void>;
  /** His name, for the narration that speaks of him. */
  heroName: string;
}) {
  const [found, setFound] = useState(false);
  return (
    <Stage
      backdrop="GREENWOOD"
      // Beaten, on one knee: a person being decided, not a menu.
      figure={{ who: 'gald', state: 'portrait', alt: '膝をついた盗賊' }}
      side="left"
      className={found ? 'life-choice' : 'life-choice medicine-discovery'}
      testId={found ? 'life-choice-screen' : 'medicine-discovery'}
    >
      <h1 className="place">グリーンウッドの森</h1>
      {found ? <FourAnswers onChoose={onChoose} /> : <MedicineDiscovery onDone={() => setFound(true)} heroName={heroName} />}
    </Stage>
  );
}

function FourAnswers({ onChoose }: { onChoose: (choice: LifeChoiceId) => Promise<void> }) {
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  // His 「……どうするつもりだ……。」 beside the four answers (ボイスパック18) — in his own mouth, after his fall,
  // his last word and his 「妹だ。病気なんだ」 (still being said as this comes up), never over them.
  useEffect(() => {
    const id = lineVoice(GALD_UNNAMED, GALD_LIFE_CHOICE_LINE);
    if (id) playVoice(id, { mouth: 'foe', wait: true });
  }, []);

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
    <>
      <p className="speaker stage-speaker">{GALD_UNNAMED}</p>
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
    </>
  );
}

/** What the answer left behind, in the words the answer has. */
export function ChoiceResultScreen({
  choice,
  onHome,
  atEnd,
  heroName,
}: {
  choice: LifeChoiceId;
  /** His name, for the narration that speaks of him. */
  heroName: string;
  onHome: () => void;
  /**
   * Shown with its last line — the end of Gald's part of the story, the
   * moment AUTO is said to be open (「AUTO戦闘が使用可能になりました。」).
   */
  atEnd?: ReactNode;
}) {
  // The answer given: his question, if still being said, is cut off.
  useEffect(() => {
    audioManager.stopVoice('foe');
  }, []);
  return (
    <Place area="GREENWOOD" title="グリーンウッドの森">
      <div data-testid="choice-result" data-choice={choice}>
        <Scene
          lines={choiceResultLinesAfterDiscovery(choice)}
          testId="choice-result-line"
          nextTestId="choice-result-next"
          doneLabel="村へもどる"
          onDone={onHome}
          atEnd={atEnd}
          heroName={heroName}
        />
      </div>
    </Place>
  );
}
