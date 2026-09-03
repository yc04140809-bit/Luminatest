import { useState } from 'react';
import { ScreenBackdrop } from '../common/ScreenBackdrop';
import { Ornament } from '../common/Ornament';
import { TITLE_KEY_VISUAL } from '../../assets/manifest';

interface Props {
  /** True when a saved world exists in WORLD MEMORY. */
  hasSave: boolean;
  onStart: () => void;
  onContinue: () => void;
  /** Deletes the saved world. The parent reloads afterwards. */
  onReset: () => Promise<void>;
}

export function TitleScreen({ hasSave, onStart, onContinue, onReset }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const doReset = async () => {
    setResetting(true);
    setResetError(null);
    try {
      await onReset();
    } catch {
      setResetError('リセットに失敗しました。もう一度お試しください。');
      setResetting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="screen title-screen has-backdrop">
      {/* The key visual sits behind everything; the logo rides above it
          and the buttons below it, so Kaos is never covered up. */}
      <ScreenBackdrop src={TITLE_KEY_VISUAL} variant="title" testId="title-backdrop" />
      <div className="title-mark">
        <h1 className="title-logo">MUGEN ZERO</h1>
        <p className="title-sub">v0.1</p>
      </div>
      <div className="title-actions">
        {/* Her wings, drawn once, between the picture and the way in.
            One side feathered, one side webbed — never mirrored. They are
            not repeated anywhere else: she is the only thing they mean. */}
        <Ornament kind="wings" size={14} className="title-wings" />
        {hasSave ? (
          <>
            <button className="btn primary" data-testid="continue-button" onClick={onContinue}>
              つづきから
            </button>
            {!confirming ? (
              <button
                className="btn"
                data-testid="reset-button"
                style={{ fontSize: 13 }}
                onClick={() => setConfirming(true)}
              >
                NEW GAME / RESET WORLD
              </button>
            ) : (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}
              >
                <p style={{ fontSize: 13, color: 'var(--text-dim)', margin: 0, textAlign: 'center' }}>
                  この世界の記憶をすべて削除します。
                  <br />
                  本当によろしいですか？
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn"
                    data-testid="confirm-reset-button"
                    disabled={resetting}
                    onClick={doReset}
                  >
                    {resetting ? '削除中……' : '削除する'}
                  </button>
                  <button
                    className="btn"
                    data-testid="cancel-reset-button"
                    disabled={resetting}
                    onClick={() => setConfirming(false)}
                  >
                    やめる
                  </button>
                </div>
              </div>
            )}
            {resetError && (
              <p style={{ color: 'var(--danger)', fontSize: 13, margin: 0 }}>{resetError}</p>
            )}
          </>
        ) : (
          <button className="btn primary" data-testid="start-button" onClick={onStart}>
            はじめる
          </button>
        )}
      </div>
    </div>
  );
}
