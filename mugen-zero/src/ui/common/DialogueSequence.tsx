import { useState } from 'react';
import type { DialogueLine } from '../../content/dialogue/prologue';

interface Props {
  lines: DialogueLine[];
  onComplete: () => void;
  /** Center the text on a black stage (used by the prologue monologue). */
  centered?: boolean;
  testId?: string;
}

/** Tap-to-advance dialogue. Calls onComplete after the last line. */
export function DialogueSequence({ lines, onComplete, centered = false, testId }: Props) {
  const [index, setIndex] = useState(0);
  const line = lines[index];

  const advance = () => {
    if (index + 1 < lines.length) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div className="screen dialogue-screen" onClick={advance} data-testid={testId}>
      <div className="dialogue-stage">
        {centered && <p className="dialogue-centered">{line.text}</p>}
      </div>
      {!centered && (
        <div className="dialogue-box">
          {line.speaker && <div className="dialogue-speaker">{line.speaker}</div>}
          <div className="dialogue-text">{line.text}</div>
          <div className="dialogue-next">▼ タップ</div>
        </div>
      )}
      {centered && <div className="dialogue-next" style={{ padding: '0 16px 20px' }}>▼ タップ</div>}
    </div>
  );
}
