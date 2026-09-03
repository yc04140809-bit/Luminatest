import { useState } from 'react';
import type { LifeChoiceId } from '../../core/flow/types';
import type { EnemySpeciesDef } from '../../content/enemies/species';
import { DialogueSequence } from '../common/DialogueSequence';
import { vibrate } from '../../platform/haptics';

interface Props {
  species: EnemySpeciesDef;
  /** The name this one will be remembered by, if it is remembered at all. */
  individualId: string;
  /**
   * Persists the choice into WORLD MEMORY. Must resolve only after the
   * save is durably committed; the screen does not advance on failure.
   */
  onChoose: (choice: LifeChoiceId) => Promise<void>;
  /** Back to the forest, once the player has read what happened. */
  onDone: () => void;
}

/**
 * The moment an animal turns out to be somebody.
 *
 * Almost every moss rabbit in Greenwood is a moss rabbit. This one has
 * a reason to be where it is, and the same four answers the game asks
 * about a man are asked about it. None of them is styled as the right
 * one, nothing here says that killing it is wrong, and nothing here
 * says it is fine — the player decides, and the world writes down what
 * they decided.
 */
export function CreatureLifeChoiceScreen({ species, individualId, onChoose, onDone }: Props) {
  const [phase, setPhase] = useState<'SCENE' | 'CHOICE' | 'AFTER'>('SCENE');
  const [chosen, setChosen] = useState<LifeChoiceId | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (choice: LifeChoiceId) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    vibrate(24); // a decision you feel
    try {
      await onChoose(choice);
      setChosen(choice);
      setPhase('AFTER');
    } catch (e) {
      console.error('Failed to save the creature life choice', e);
      setError('選択を世界に記録できませんでした。もう一度お試しください。');
    } finally {
      setSaving(false);
    }
  };

  if (phase === 'SCENE') {
    return (
      <DialogueSequence
        lines={species.individual.scene}
        onComplete={() => setPhase('CHOICE')}
        testId={`creature-scene-${species.speciesId}`}
        portraitSrc={species.portrait}
        portraitAlt={species.name}
        backdropLocationId="GREENWOOD_FOREST"
      />
    );
  }

  if (phase === 'AFTER' && chosen) {
    return (
      <div className="screen life-choice-screen" data-testid="creature-choice-result">
        <p className="life-choice-prompt" style={{ fontSize: 15 }}>
          {species.individual.aftermath[chosen]}
        </p>
        <button className="btn primary" data-testid="creature-choice-continue" onClick={onDone}>
          森へ戻る
        </button>
      </div>
    );
  }

  return (
    <div
      className="screen life-choice-screen creature-choice"
      data-testid="creature-life-choice-screen"
      data-individual={individualId}
      role="dialog"
      aria-modal="true"
      aria-label={species.individual.prompt}
    >
      <div className="life-choice-figure">
        {species.portrait && (
          <img
            className="life-choice-portrait creature"
            data-testid="creature-life-choice-portrait"
            src={species.portrait}
            alt={species.name}
          />
        )}
      </div>

      <p className="life-choice-prompt">{species.individual.prompt}</p>

      <div className="life-choice-options">
        {species.individual.options.map((opt) => (
          <button
            key={opt.id}
            className="life-choice-btn"
            data-testid={`creature-choice-${opt.id}`}
            disabled={saving}
            onClick={() => choose(opt.id)}
          >
            {opt.label}
            <span className="sub">{opt.sub}</span>
          </button>
        ))}
      </div>
      {saving && (
        <p style={{ color: 'var(--text-dim)', fontSize: 13, margin: 0 }}>記録しています……</p>
      )}
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }} data-testid="save-error">
          {error}
        </p>
      )}
    </div>
  );
}
