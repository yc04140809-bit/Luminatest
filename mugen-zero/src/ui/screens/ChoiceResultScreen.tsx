import { useState } from 'react';
import type { LifeChoiceId } from '../../core/flow/types';
import { CHOICE_RESULT_LINES } from '../../content/dialogue/galdEncounter';
import { DialogueSequence } from '../common/DialogueSequence';

interface Props {
  choice: LifeChoiceId;
  onReturnHome: () => void;
}

/** Immediate aftermath of the life choice, then return to Alden. */
export function ChoiceResultScreen({ choice, onReturnHome }: Props) {
  const [done, setDone] = useState(false);

  if (!done) {
    return (
      <DialogueSequence
        lines={CHOICE_RESULT_LINES[choice]}
        onComplete={() => setDone(true)}
        testId="choice-result-dialogue"
      />
    );
  }

  return (
    <div className="screen life-choice-screen" data-testid="choice-recorded-screen">
      <p className="life-choice-prompt">
        あなたの選択を、世界が記憶した。
        <br />
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          （WORLD MEMORYへの保存は PHASE B で実装されます）
        </span>
      </p>
      <button className="btn primary" data-testid="return-home-button" onClick={onReturnHome}>
        アルデン村へ戻る
      </button>
    </div>
  );
}
