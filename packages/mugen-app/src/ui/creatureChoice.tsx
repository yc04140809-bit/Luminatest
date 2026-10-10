import { useState } from 'react';
import type { LifeChoiceId } from '@mugen/core/flow/types';
import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import type { EnemySpeciesDef } from '@mugen/content/enemies/species';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { Stage, StagedLines, kaosFigureFor, type StagePicture } from './scene';
import { battleEnemyArt } from './battle/battleArt';

/**
 * A CREATURE MET AS SOMEBODY — the App's side of the four answers asked of
 * an animal (作者判断 2026-10-10: the Artifact's CreatureLifeChoiceScreen,
 * brought over). The same question as Gald's, in the creature's own words
 * (`species.individual`); none of the answers styled as the right one.
 *
 * Its picture is the creature's portrait when one is drawn (ui/battle/
 * battleArt.ts); until then the words stand alone — a picture added later is
 * one line there and nothing here.
 */

const named = (lines: readonly DialogueLine[], hero: string): DialogueLine[] =>
  lines.map((l) => (l.speaker === HERO_SPEAKER ? { ...l, speaker: hero } : l));

function portraitOf(species: EnemySpeciesDef): StagePicture | null {
  const src = battleEnemyArt(species.speciesId, 'portrait').asset?.src ?? null;
  return src ? { src, alt: species.name, testId: 'creature-portrait' } : null;
}

/** Before the fight: a few lines in the forest, then 「戦う」. */
export function CreatureEncounterScreen({
  lines,
  heroName,
  onBattle,
}: {
  lines: readonly DialogueLine[];
  heroName: string;
  onBattle: () => void;
}) {
  return (
    <StagedLines
      lines={named(lines, heroName)}
      backdrop="GREENWOOD"
      figureFor={(line) => kaosFigureFor(line)}
      side="right"
      title="グリーンウッドの森"
      testId="creature-encounter"
      lineTestId="creature-encounter-line"
      nextTestId="creature-encounter-next"
      doneLabel="戦う"
      onDone={onBattle}
    />
  );
}

/**
 * After it: why this one was not just another of its kind; the four answers
 * (`onChoose` resolves only once WORLD MEMORY holds it — nothing moves on
 * before, and a failure leaves the answers up); then what the answer left.
 */
export function CreatureLifeChoiceScreen({
  species,
  individualId,
  heroName,
  onChoose,
  onDone,
}: {
  species: EnemySpeciesDef;
  individualId: string;
  heroName: string;
  onChoose: (choice: LifeChoiceId) => Promise<void>;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<'SCENE' | 'CHOICE' | 'AFTER'>('SCENE');
  const [chosen, setChosen] = useState<LifeChoiceId | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const picture = portraitOf(species);

  const choose = (choice: LifeChoiceId) => {
    if (saving) return;
    setSaving(true);
    setFailed(false);
    void onChoose(choice)
      .then(() => {
        setChosen(choice);
        setPhase('AFTER');
      })
      .catch((e) => {
        console.error('Failed to save the creature life choice', e);
        setFailed(true);
      })
      .finally(() => setSaving(false));
  };

  if (phase === 'SCENE') {
    return (
      <StagedLines
        lines={named(species.individual.scene, heroName)}
        backdrop="GREENWOOD"
        figureFor={(line) => kaosFigureFor(line)}
        side="right"
        title="グリーンウッドの森"
        testId="creature-scene"
        lineTestId="creature-scene-line"
        nextTestId="creature-scene-next"
        doneLabel="つぎへ"
        onDone={() => setPhase('CHOICE')}
      />
    );
  }

  if (phase === 'AFTER' && chosen) {
    return (
      <Stage backdrop="GREENWOOD" picture={picture} side="left" testId="creature-choice-result">
        <h1 className="place">グリーンウッドの森</h1>
        <p className="line stage-line" data-testid="creature-choice-after">
          {species.individual.aftermath[chosen]}
        </p>
        <div className="actions">
          <button className="btn primary" data-testid="creature-choice-continue" onClick={onDone}>
            森へ戻る
          </button>
        </div>
      </Stage>
    );
  }

  return (
    <Stage
      backdrop="GREENWOOD"
      picture={picture}
      side="left"
      className="life-choice"
      testId="creature-life-choice-screen"
    >
      <h1 className="place">グリーンウッドの森</h1>
      <p className="line stage-line" data-testid="creature-choice-prompt" data-individual={individualId}>
        {species.individual.prompt}
      </p>
      <div className="actions choice-grid">
        {species.individual.options.map((opt) => (
          <button
            className="btn"
            key={opt.id}
            data-testid={`creature-choice-${opt.id}`}
            disabled={saving}
            onClick={() => choose(opt.id)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {saving && <p className="say">記録しています……</p>}
      {failed && (
        <p className="warn" data-testid="creature-save-error">
          記録できませんでした。もう一度選んでください。
        </p>
      )}
    </Stage>
  );
}
