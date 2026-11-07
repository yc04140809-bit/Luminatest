import { useState } from 'react';
import { isDevLockCode, markDevUnlocked } from './devMode';

interface Props {
  onUnlock: () => void;
  onBack: () => void;
}

/**
 * The lock on the admin page.
 *
 * A speed bump, and it is important to say so plainly: this is a PIN
 * compared in the browser, and anybody who can read the bundle can
 * read it. It is not authentication and must never be described as
 * any. What it is for is stopping an ordinary player from wandering
 * into developer tools by accident — and for that, a four-digit code
 * in front of a deliberately drab entry is exactly enough.
 *
 * The real exclusion for a public build is DEV_ADMIN_ENABLED, which
 * removes the entry and the screens from the build entirely.
 */
export function DevLockScreen({ onUnlock, onBack }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);

  const submit = () => {
    // Compared as typed. "0909" is a string of four characters, and a
    // leading zero that got lost to a number conversion would quietly
    // turn this into a three-digit lock.
    if (isDevLockCode(code)) {
      markDevUnlocked();
      onUnlock();
    } else {
      setError(true);
      setCode('');
    }
  };

  return (
    <div className="screen life-choice-screen" data-testid="dev-lock-screen">
      <p className="life-choice-prompt" style={{ fontSize: 16 }}>
        ADMIN
        <br />
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>管理者ページ</span>
        <br />
        <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>ロックNo.を入力</span>
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
            border: '1px solid var(--mugen-border-strong)',
            borderRadius: 10,
            color: 'var(--text)',
          }}
        />
        <button className="btn primary" data-testid="dev-lock-submit" onClick={submit}>
          入る
        </button>
        <button className="btn" data-testid="dev-lock-back" onClick={onBack}>
          もどる
        </button>
      </div>
      {error && (
        <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }} data-testid="dev-lock-error">
          ロックNo.が違います。
        </p>
      )}
    </div>
  );
}
