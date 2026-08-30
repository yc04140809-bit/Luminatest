import { useState } from 'react';
import type { LifeChoiceId } from '../../core/flow/types';
import {
  LIFE_CHOICE_PROMPT,
  LIFE_CHOICE_OPTIONS,
  GALD_LIFE_CHOICE_LINE,
} from '../../content/dialogue/galdEncounter';
import { GALD } from '../../content/characters/gald';
import { galdPortrait } from '../../assets/manifest';
import { vibrate } from '../../platform/haptics';

interface Props {
  /**
   * Persists the choice into WORLD MEMORY. Must resolve only after the
   * save is durably committed; the screen does not advance on failure.
   */
  onChoose: (choice: LifeChoiceId) => Promise<void>;
}

/**
 * The core moment of MUGEN ZERO: no result screen, no EXP — the man is
 * kneeling in front of the player, and the question is what becomes of
 * his life. All four answers are equally canon, so none of them is
 * styled as the right one.
 */
export function LifeChoiceScreen({ onChoose }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const portrait = galdPortrait('defeated');

  const choose = async (choice: LifeChoiceId) => {
    if (saving) return;
    setSaving(true);
    setError(null);
    vibrate(24); // a decision you feel
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
    <div
      className="screen life-choice-screen"
      data-testid="life-choice-screen"
      role="dialog"
      aria-modal="true"
      aria-label={LIFE_CHOICE_PROMPT}
    >
      <div className="life-choice-figure">
        {portrait && (
          <img
            className="life-choice-portrait"
            data-testid="life-choice-portrait"
            src={portrait}
            alt="膝をついた盗賊"
          />
        )}
        <div className="life-choice-speech">
          <div className="dialogue-speaker">盗賊 {GALD.name}</div>
          <div className="dialogue-text">{GALD_LIFE_CHOICE_LINE}</div>
        </div>
      </div>

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
