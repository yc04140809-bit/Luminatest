import { useState } from 'react';
import { DEV_LOCK_CODE } from './devMode';

interface Props {
  onUnlock: () => void;
  onBack: () => void;
}

/** MVP dev lock — a speed bump, not security. */
export function DevLockScreen({ onUnlock, onBack }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    if (code === DEV_LOCK_CODE) {
      onUnlock();
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="screen life-choice-screen" data-testid="dev-lock-screen">
      <p className="life-choice-prompt" style={{ fontSize: 16 }}>
        DEV ADMIN
        <br />
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>LOCK NO を入力してください</span>
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 220 }}>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          value={code}
          data-testid="dev-lock-input"
          onChange={(e) => {
            setCode(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          style={{
            padding: '12px 14px',
            fontSize: 18,
            letterSpacing: '0.4em',
            textAlign: 'center',
            background: 'var(--panel-2)',
            border: '1px solid #44445c',
            borderRadius: 10,
            color: 'var(--text)',
          }}
        />
        <button className="btn primary" data-testid="dev-lock-submit" onClick={submit}>
          UNLOCK
        </button>
        <button className="btn" data-testid="dev-lock-back" onClick={onBack}>
          もどる
        </button>
      </div>
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }} data-testid="dev-lock-error">
          LOCK NO が違います。
        </p>
      )}
    </div>
  );
}
