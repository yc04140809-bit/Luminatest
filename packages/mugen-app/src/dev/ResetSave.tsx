import { useState } from 'react';
import { APP_DB_NAME } from '../platform/save';
import { resetPlayClock } from '../platform/playClock';

/**
 * THIS DEVICE'S SAVE, THROWN AWAY — DEBUG BUILDS ONLY (`?tool=reset`, the
 * title's DEBUG door).
 *
 * With a save, the title offers only つづきから; to play from the start again
 * on a phone (another of Gald's answers, a fresh stopwatch) the save has to
 * go. This page is the only thing that does it, and only on a second press.
 * It runs on its own page, where no world has the database open, so the
 * delete is never left waiting on the game. The player's own settings
 * (vibration, ambience) are kept; the play's stopwatch goes with the save.
 */
type State = 'IDLE' | 'ARMED' | 'DELETING' | 'DONE' | 'FAILED';

function deleteSave(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(APP_DB_NAME);
      request.onsuccess = () => resolve(true);
      request.onerror = () => resolve(false);
      // Something still holds it open (another tab of the game): not deleted.
      request.onblocked = () => resolve(false);
    } catch {
      resolve(false);
    }
  });
}

export function ResetSave() {
  const [state, setState] = useState<State>('IDLE');
  const title = () => window.location.assign(window.location.pathname);

  return (
    <div data-testid="reset-save" style={PAGE}>
      <h1 style={{ fontSize: 16, margin: '0 0 8px' }}>DEBUG セーブを消す</h1>
      <p>この端末のセーブ（村・戦闘・ガルドの答え・世界の記憶すべて）を消して、タイトルの「はじめる」から遊べるようにします。</p>
      <p style={DIM}>振動・環境演出の設定は残ります。試遊の経過時間は消えます。</p>

      {state === 'DONE' ? (
        <>
          <p data-testid="reset-save-done">消しました。</p>
          <button style={BUTTON} data-testid="reset-save-title" onClick={title}>
            タイトルへ
          </button>
        </>
      ) : (
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            style={{ ...BUTTON, ...(state === 'ARMED' ? DANGER : null) }}
            data-testid="reset-save-confirm"
            disabled={state === 'DELETING'}
            onClick={async () => {
              if (state !== 'ARMED') return setState('ARMED');
              setState('DELETING');
              const ok = await deleteSave();
              if (ok) resetPlayClock();
              setState(ok ? 'DONE' : 'FAILED');
            }}
          >
            {state === 'ARMED' ? '本当に消す（もう一度押す）' : 'セーブを消す'}
          </button>
          <button style={BUTTON} data-testid="reset-save-cancel" onClick={title}>
            やめる
          </button>
        </div>
      )}
      {state === 'FAILED' && (
        <p data-testid="reset-save-failed" style={{ color: '#ffb38a' }}>
          消せませんでした。ゲームを開いているほかの画面を閉じてから、もう一度試してください。
        </p>
      )}
    </div>
  );
}

const PAGE = {
  minHeight: '100vh',
  boxSizing: 'border-box',
  padding: '12px 16px 48px',
  background: '#120d08',
  color: '#f2e6cc',
  font: '13px/1.6 system-ui, sans-serif',
} as const;
const DIM = { color: '#b9a98a' } as const;
const BUTTON = {
  minHeight: 40,
  padding: '6px 16px',
  border: '1px solid #e0b84a',
  borderRadius: 20,
  background: 'rgba(60, 20, 0, 0.85)',
  color: '#ffd76a',
  font: '13px system-ui, sans-serif',
} as const;
const DANGER = { borderColor: '#ff7a5a', color: '#ffb38a', background: 'rgba(90, 10, 0, 0.9)' } as const;
