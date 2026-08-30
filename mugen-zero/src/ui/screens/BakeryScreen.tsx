import { useState } from 'react';
import { DialogueSequence } from '../common/DialogueSequence';
import type { DialogueLine } from '../../content/dialogue/prologue';
import {
  BAKERY_FIRST_VISIT_LINES,
  BAKERY_REVISIT_LINES,
  KAOS_AFTER_REUNION_LINE,
} from '../../content/dialogue/bakery';

interface Props {
  /** Whether the reunion has NOT yet happened in world truth. */
  firstVisit: boolean;
  /** Persists PLAYER_REUNITED_WITH_GALD; resolves after the DB commit. */
  onReunion: () => Promise<void>;
  onLeave: () => void;
}

/**
 * The bakery in Alden. On the first visit the player discovers, unspoiled,
 * who the baker is; the reunion is recorded as world truth only here —
 * never by a TIME SHIFT.
 */
export function BakeryScreen({ firstVisit, onReunion, onLeave }: Props) {
  // Lock the mode at mount: recording the reunion mid-scene must not
  // swap the screen into revisit mode.
  const [isFirst] = useState(firstVisit);
  const [phase, setPhase] = useState<'SCENE' | 'RECORDING' | 'AFTER'>('SCENE');
  const [error, setError] = useState(false);

  const completeFirstVisit = async () => {
    setPhase('RECORDING');
    setError(false);
    try {
      await onReunion();
      setPhase('AFTER');
    } catch (e) {
      console.error('Failed to record the reunion', e);
      setError(true);
      setPhase('RECORDING');
    }
  };

  if (isFirst && phase === 'SCENE') {
    return (
      <DialogueSequence
        lines={BAKERY_FIRST_VISIT_LINES}
        onComplete={completeFirstVisit}
        testId="bakery-first-visit"
      />
    );
  }

  if (isFirst && phase === 'RECORDING') {
    return (
      <div className="screen life-choice-screen" data-testid="bakery-recording">
        {!error ? (
          <p className="life-choice-prompt" style={{ fontSize: 14, color: 'var(--text-dim)' }}>
            …………
          </p>
        ) : (
          <>
            <p style={{ color: 'var(--danger)', fontSize: 13 }} data-testid="reunion-save-error">
              再会を世界に記録できませんでした。
            </p>
            <button className="btn primary" onClick={completeFirstVisit}>
              もう一度
            </button>
          </>
        )}
      </div>
    );
  }

  if (isFirst && phase === 'AFTER') {
    return (
      <div className="screen life-choice-screen" data-testid="bakery-reunion-done">
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 10 }}>ケイオス</p>
          <p className="life-choice-prompt" style={{ fontSize: 16 }}>
            {KAOS_AFTER_REUNION_LINE}
          </p>
        </div>
        <button className="btn primary" data-testid="bakery-leave" onClick={onLeave}>
          店を出る
        </button>
      </div>
    );
  }

  // Revisit: an ordinary bakery now.
  return <RevisitScene onLeave={onLeave} />;
}

function RevisitScene({ onLeave }: { onLeave: () => void }) {
  const [done, setDone] = useState(false);
  if (!done) {
    return (
      <DialogueSequence
        lines={BAKERY_REVISIT_LINES as DialogueLine[]}
        onComplete={() => setDone(true)}
        testId="bakery-revisit"
      />
    );
  }
  return (
    <div className="screen life-choice-screen" data-testid="bakery-revisit-done">
      <p className="life-choice-prompt" style={{ fontSize: 15, color: 'var(--text-dim)' }}>
        棚には、焼きたてのパンが並んでいる。
      </p>
      <button className="btn primary" data-testid="bakery-leave" onClick={onLeave}>
        店を出る
      </button>
    </div>
  );
}
