import { useEffect } from 'react';
import type { ArcanaGain } from '../../core/arcana/arcana';
import { Ornament } from '../common/Ornament';

/**
 * What the player is told when a memory fills in a little.
 *
 * Deliberately small. "ARCANA +25%" in large type every few minutes
 * turns the world into a slot machine, so this is a sentence about the
 * creature with the numbers underneath it, laid over a corner of
 * whatever screen the player is already on. It never blocks anything,
 * it never covers the world, there is no white flash, and it goes away
 * on its own.
 *
 * The completion moment is the same card with a brief glow and one
 * different line — special enough to be noticed, small enough that it
 * does not interrupt the walk back down the path.
 */

const SHOW_MS = 2600;
const COMPLETE_MS = 3400;

interface Props {
  gain: ArcanaGain;
  name: string;
  /** The line for a memory that just became complete. */
  completeLine: string;
  onDone: () => void;
}

export function ArcanaToast({ gain, name, completeLine, onDone }: Props) {
  const complete = gain.completedNow;

  useEffect(() => {
    const t = setTimeout(onDone, complete ? COMPLETE_MS : SHOW_MS);
    return () => clearTimeout(t);
  }, [complete, onDone, gain]);

  return (
    <button
      className={complete ? 'arcana-toast complete' : 'arcana-toast'}
      data-testid="arcana-toast"
      data-complete={complete ? 'yes' : 'no'}
      onClick={onDone}
      aria-live="polite"
    >
      <span className="arcana-toast-mark" aria-hidden="true">
        <Ornament kind="ring" size={15} />
      </span>
      <span className="arcana-toast-body">
        {complete ? (
          <>
            <span className="arcana-toast-head">ARCANA COMPLETE</span>
            <span className="arcana-toast-line">{completeLine}</span>
          </>
        ) : (
          <>
            <span className="arcana-toast-line">
              {gain.discoveredNow
                ? `${name}のことを、覚えた。`
                : `${name}の記憶が、少し鮮明になった。`}
            </span>
            <span className="arcana-toast-num">
              構築度 {gain.from}% <i>→</i> {gain.to}%
            </span>
          </>
        )}
      </span>
    </button>
  );
}
