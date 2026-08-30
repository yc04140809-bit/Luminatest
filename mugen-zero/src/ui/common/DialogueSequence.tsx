import { useState } from 'react';
import type { DialogueLine } from '../../content/dialogue/prologue';
import { kaosPortrait } from '../../assets/manifest';

interface Props {
  lines: DialogueLine[];
  onComplete: () => void;
  /** Center the text on a black stage (used by the prologue monologue). */
  centered?: boolean;
  testId?: string;
}

const KAOS_SPEAKER = 'ケイオス';

/** Tap-to-advance dialogue. Calls onComplete after the last line. */
export function DialogueSequence({ lines, onComplete, centered = false, testId }: Props) {
  const [index, setIndex] = useState(0);
  const line = lines[index];
  const isKaos = line.speaker === KAOS_SPEAKER;
  // Portrait slot: empty when no art exists for the speaker, and the
  // layout holds either way.
  const portrait = isKaos ? kaosPortrait('normal') : null;

  const advance = () => {
    if (index + 1 < lines.length) {
      setIndex(index + 1);
    } else {
      onComplete();
    }
  };

  return (
    <div
      className="screen dialogue-screen"
      onClick={advance}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          advance();
        }
      }}
      role="button"
      tabIndex={0}
      aria-label="次へ進む"
      data-testid={testId}
    >
      <div className="dialogue-stage">
        {centered && <p className="dialogue-centered">{line.text}</p>}
      </div>
      {!centered && (
        <>
          {portrait && (
            <div className="dialogue-portrait" data-testid="dialogue-portrait">
              <img src={portrait} alt="" aria-hidden="true" />
            </div>
          )}
          <div className={isKaos ? 'dialogue-box kaos' : 'dialogue-box'}>
            {line.speaker && <div className="dialogue-speaker">{line.speaker}</div>}
            <div className="dialogue-text">{line.text}</div>
            <div className="dialogue-next">▼ タップ</div>
          </div>
        </>
      )}
      {centered && <div className="dialogue-next" style={{ padding: '0 16px 20px' }}>▼ タップ</div>}
    </div>
  );
}
