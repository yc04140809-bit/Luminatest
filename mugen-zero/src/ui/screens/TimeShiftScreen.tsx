import { useState } from 'react';

interface Props {
  years: number;
  /** Executes the TIME SHIFT. Must resolve only after the save committed. */
  onConfirm: () => Promise<void>;
  /** "まだ残る": leaves the world completely untouched. */
  onStay: () => void;
  /** Leaves the aftermath screen. */
  onDone: () => void;
}

/**
 * TIME SHIFT never happens automatically — the player decides.
 * The full seasonal presentation arrives with Phase E/G; this stays quiet.
 */
export function TimeShiftScreen({ years, onConfirm, onStay, onDone }: Props) {
  const [phase, setPhase] = useState<'CONFIRM' | 'SHIFTING' | 'DONE'>('CONFIRM');
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (phase !== 'CONFIRM') return; // double-tap cannot shift twice
    setPhase('SHIFTING');
    setError(null);
    try {
      await onConfirm();
      setPhase('DONE');
    } catch (e) {
      console.error('TIME SHIFT failed', e);
      setError('時を進められませんでした。もう一度お試しください。');
      setPhase('CONFIRM');
    }
  };

  if (phase === 'DONE') {
    return (
      <div className="screen life-choice-screen" data-testid="time-shift-done">
        <p className="life-choice-prompt">――{years}年後。</p>
        <button className="btn primary" data-testid="time-shift-return" onClick={onDone}>
          アルデン地方へ
        </button>
      </div>
    );
  }

  return (
    <div className="screen life-choice-screen" data-testid="time-shift-confirm">
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--accent)', fontSize: 13, marginBottom: 10 }}>ケイオス</p>
        <p className="life-choice-prompt" style={{ fontSize: 16 }}>
          「次にここへ帰ってきた時、
          <br />
          同じ景色だとは限らないよ。」
        </p>
      </div>
      <div style={{ textAlign: 'center' }}>
        <p className="life-choice-prompt" style={{ fontSize: 17 }}>
          【{years}年の時を進めます】
        </p>
        <p style={{ color: 'var(--text-dim)', fontSize: 13, lineHeight: 1.9, margin: 0 }}>
          世界の人々も、それぞれの人生を歩みます。
        </p>
      </div>
      <div className="life-choice-options">
        <button
          className="life-choice-btn"
          data-testid="time-shift-go"
          disabled={phase === 'SHIFTING'}
          onClick={go}
        >
          {phase === 'SHIFTING' ? '時が流れている……' : '旅立つ'}
        </button>
        <button
          className="life-choice-btn"
          data-testid="time-shift-stay"
          disabled={phase === 'SHIFTING'}
          onClick={onStay}
        >
          まだ残る
        </button>
      </div>
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }} data-testid="time-shift-error">
          {error}
        </p>
      )}
    </div>
  );
}
