import { useState } from 'react';
import type { LifeChoiceId } from '../../core/flow/types';
import {
  LIFE_CHOICE_PROMPT,
  LIFE_CHOICE_OPTIONS,
} from '../../content/dialogue/galdEncounter';

interface Props {
  /**
   * Persists the choice into WORLD MEMORY. Must resolve only after the
   * save is durably committed; the screen does not advance on failure.
   */
  onChoose: (choice: LifeChoiceId) => Promise<void>;
}

/**
 * The core moment of MUGEN ZERO: no result screen, no EXP —
 * the screen darkens and asks what to do with his life.
 */
export function LifeChoiceScreen({ onChoose }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const choose = async (choice: LifeChoiceId) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      await onChoose(choice);
      // On success the parent advances the screen; this component unmounts.
    } catch (e) {
      console.error('Failed to save life choice', e);
      setError('選択を世界に記録できませんでした。もう一度お試しください。');
      setSaving(false);
    }
  };

  return (
    <div className="screen life-choice-screen" data-testid="life-choice-screen">
      <p className="life-choice-prompt">{LIFE_CHOICE_PROMPT}</p>
      <div className="life-choice-options">
        {LIFE_CHOICE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className="life-choice-btn"
            data-testid={`choice-${opt.id}`}
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
