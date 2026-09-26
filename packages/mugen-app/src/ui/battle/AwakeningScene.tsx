import { useEffect, useState } from 'react';

interface Props {
  lines: readonly { speaker: string | null; text: string }[];
  onDone: () => void;
  /**
   * How long to hold each line before moving on by itself.
   *
   * Set only while the fight is being watched rather than played. It
   * advances at a reading pace instead of skipping: a player who turned
   * AUTO on asked not to press things, not to be told less. Left out —
   * which is every hand-played fight — this is a scene that waits for a
   * tap, exactly as it always has.
   */
  advanceMs?: number;
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
export function AwakeningScene({ lines, onDone, advanceMs }: Props) {
  const [index, setIndex] = useState(0);
  const line = lines[Math.min(index, lines.length - 1)];
  const last = index + 1 >= lines.length;

  useEffect(() => {
    if (advanceMs === undefined || advanceMs <= 0) return;
    const t = setTimeout(() => (last ? onDone() : setIndex((at) => at + 1)), advanceMs);
    return () => clearTimeout(t);
  }, [advanceMs, index, last, onDone]);

  return (
    <button
      className="awakening-scene"
      data-testid="magic-awakening"
      onClick={() => (last ? onDone() : setIndex(index + 1))}
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
