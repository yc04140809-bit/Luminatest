import { useState } from 'react';

interface Props {
  lines: readonly { speaker: string | null; text: string }[];
  onDone: () => void;
}

/**
 * The short scene where she steps forward.
 *
 * Read over the fight rather than instead of it: the battlefield, both
 * health bars and everything else stay exactly where they were behind
 * this, because nothing about the fight has changed — she has simply
 * offered to do something she was not doing.
 *
 * Tapping advances, and the last tap puts the player back on the same
 * board with one more thing they can press. Nobody has taken a turn.
 */
export function AwakeningScene({ lines, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const line = lines[Math.min(index, lines.length - 1)];
  return (
    <button
      className="awakening-scene"
      data-testid="magic-awakening"
      onClick={() => (index + 1 < lines.length ? setIndex(index + 1) : onDone())}
      aria-label="つづける"
    >
      <span className="awakening-body">
        {line.speaker && <span className="awakening-speaker">{line.speaker}</span>}
        <span className="awakening-text" data-testid="awakening-line">
          {line.text}
        </span>
      </span>
      <span className="awakening-next" aria-hidden="true">
        ▼ タップ
      </span>
    </button>
  );
}
