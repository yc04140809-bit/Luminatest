import type { LifeChoiceId } from '../../core/flow/types';
import {
  LIFE_CHOICE_PROMPT,
  LIFE_CHOICE_OPTIONS,
} from '../../content/dialogue/galdEncounter';

interface Props {
  onChoose: (choice: LifeChoiceId) => void;
}

/**
 * The core moment of MUGEN ZERO: no result screen, no EXP —
 * the screen darkens and asks what to do with his life.
 */
export function LifeChoiceScreen({ onChoose }: Props) {
  return (
    <div className="screen life-choice-screen" data-testid="life-choice-screen">
      <p className="life-choice-prompt">{LIFE_CHOICE_PROMPT}</p>
      <div className="life-choice-options">
        {LIFE_CHOICE_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            className="life-choice-btn"
            data-testid={`choice-${opt.id}`}
            onClick={() => onChoose(opt.id)}
          >
            {opt.label}
            <span className="sub">{opt.sub}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
