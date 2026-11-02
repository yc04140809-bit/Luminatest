import { useState, useSyncExternalStore } from 'react';
import { CrystalButton, CrystalPanel } from '../kit/Crystal';
import {
  applySoundSettings,
  BRIGHTNESS_RANGE,
  displaySettings,
  loadSoundSettings,
  saveSoundSettings,
  setDisplaySettings,
  watchDisplaySettings,
  type CutInMode,
  type SoundSettings,
  type TextSpeed,
} from '../../platform/settings';
import { Typed } from '../common/Typed';
import { adminUnlocks, requestSaveReset } from '../../platform/adminReset';
import './settings.css';

/**
 * 設定 (作者 2026-11-02 — 試遊版の次に): over whatever screen it was opened on, in the crystal UI.
 *
 *   音量         マスター／BGM／SE／ボイス, each a slider, heard as it moves; and 全ミュート
 *   画面         明るさ (a veil over the game), カットイン (毎回／1日1回／OFF), テキスト表示速度 (遅い〜一括)
 *   タイトルに戻る  only where it was opened in the village (`onTitle`), asked once
 *   管理者        the last row, small: the lock number opens データリセット, asked twice
 *
 * Every value is the device's (platform/settings.ts) and kept across a restart. The admin's row is opened
 * for this sitting only: closed, it is locked again.
 */
type Ask = null | 'TITLE' | 'RESET_1' | 'RESET_2';
type Admin = 'LOCKED' | 'ASKING' | 'OPEN';

const CUT_IN_CHOICES: readonly { id: CutInMode; label: string }[] = [
  { id: 'ALWAYS', label: '毎回' },
  { id: 'DAILY', label: '1日1回だけ' },
  { id: 'OFF', label: 'OFF' },
];
const SPEED_CHOICES: readonly { id: TextSpeed; label: string }[] = [
  { id: 'SLOW', label: '遅い' },
  { id: 'NORMAL', label: '普通' },
  { id: 'FAST', label: '速い' },
  { id: 'INSTANT', label: '一括' },
];
/** How the words will come, shown with the choice. */
const SAMPLE = 'ケイオス「ねえ、今日はどっち行く？」';

const BUSES: readonly { key: 'master' | 'bgm' | 'sfx' | 'voice'; label: string; sub: string }[] = [
  { key: 'master', label: 'マスター', sub: 'MASTER' },
  { key: 'bgm', label: 'BGM', sub: 'MUSIC' },
  { key: 'sfx', label: 'SE', sub: 'SOUND' },
  { key: 'voice', label: 'ボイス', sub: 'VOICE' },
];

export function SettingsPanel({ onClose, onTitle }: { onClose: () => void; onTitle?: () => void }) {
  const [sound, setSound] = useState<SoundSettings>(loadSoundSettings);
  const [ask, setAsk] = useState<Ask>(null);
  const [admin, setAdmin] = useState<Admin>('LOCKED');
  const [code, setCode] = useState('');
  const [wrong, setWrong] = useState(false);
  const screen = useSyncExternalStore(watchDisplaySettings, displaySettings);

  const change = (next: SoundSettings) => {
    setSound(next);
    applySoundSettings(next);
    saveSoundSettings(next);
  };

  return (
    <div className="settings-veil" role="dialog" aria-modal="true" aria-label="設定" data-testid="settings">
      <CrystalPanel className="settings-card" heading="設定">
        {ask === null ? (
          <>
            <section className="settings-group" aria-label="音量">
              <h2 className="settings-group-title">
                音量 <small>VOLUME</small>
              </h2>
              {BUSES.map((bus) => (
                <label className="settings-row" key={bus.key} data-muted={sound.muted ? 'yes' : undefined}>
                  <span className="settings-name">
                    {bus.label}
                    <small>{bus.sub}</small>
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(sound[bus.key] * 100)}
                    data-testid={`settings-${bus.key}`}
                    onChange={(e) => change({ ...sound, [bus.key]: Number(e.target.value) / 100 })}
                  />
                  <span className="settings-value" data-testid={`settings-${bus.key}-value`}>
                    {Math.round(sound[bus.key] * 100)}
                  </span>
                </label>
              ))}
              <div className="settings-row settings-mute">
                <span className="settings-name">
                  全ミュート
                  <small>MUTE</small>
                </span>
                <button
                  type="button"
                  className="settings-switch"
                  role="switch"
                  aria-checked={sound.muted}
                  data-testid="settings-mute"
                  onClick={() => change({ ...sound, muted: !sound.muted })}
                >
                  {sound.muted ? 'ON' : 'OFF'}
                </button>
              </div>
            </section>

            <section className="settings-group" aria-label="画面">
              <h2 className="settings-group-title">
                画面 <small>SCREEN</small>
              </h2>
              <label className="settings-row">
                <span className="settings-name">
                  明るさ
                  <small>BRIGHTNESS</small>
                </span>
                <input
                  type="range"
                  min={Math.round(BRIGHTNESS_RANGE.min * 100)}
                  max={Math.round(BRIGHTNESS_RANGE.max * 100)}
                  step={5}
                  value={Math.round(screen.brightness * 100)}
                  data-testid="settings-brightness"
                  onChange={(e) => setDisplaySettings({ ...screen, brightness: Number(e.target.value) / 100 })}
                />
                <span className="settings-value" data-testid="settings-brightness-value">
                  {Math.round(screen.brightness * 100)}
                </span>
              </label>
              <div className="settings-row settings-pick">
                <span className="settings-name">
                  カットイン
                  <small>CUT-IN</small>
                </span>
                <div className="settings-choice" role="group" aria-label="カットイン">
                  {CUT_IN_CHOICES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={screen.cutIn === c.id}
                      data-testid={`settings-cutin-${c.id.toLowerCase()}`}
                      onClick={() => setDisplaySettings({ ...screen, cutIn: c.id })}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-row settings-pick">
                <span className="settings-name">
                  テキスト速度
                  <small>TEXT</small>
                </span>
                <div className="settings-choice" role="group" aria-label="テキスト表示速度">
                  {SPEED_CHOICES.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={screen.textSpeed === c.id}
                      data-testid={`settings-text-${c.id.toLowerCase()}`}
                      onClick={() => setDisplaySettings({ ...screen, textSpeed: c.id })}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <p className="settings-sample" data-testid="settings-text-sample" key={screen.textSpeed}>
                <Typed text={SAMPLE} holdsTaps={false} />
              </p>
            </section>

            <div className="settings-actions">
              {onTitle && <CrystalButton kind="confirm" testId="settings-title" label="タイトルに戻る" onClick={() => setAsk('TITLE')} />}
              <CrystalButton kind="back" testId="settings-close" label="閉じる" onClick={onClose} />
            </div>

            {/* The admin's row: last, small, out of a visitor's way. */}
            <section className="settings-admin" aria-label="管理者">
              {admin === 'LOCKED' && (
                <button type="button" className="settings-admin-open" data-testid="settings-admin" onClick={() => setAdmin('ASKING')}>
                  管理者
                </button>
              )}
              {admin === 'ASKING' && (
                <form
                  className="settings-admin-lock"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (adminUnlocks(code)) {
                      setAdmin('OPEN');
                      setWrong(false);
                    } else setWrong(true);
                    setCode('');
                  }}
                >
                  <input
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="ロック番号"
                    aria-label="ロック番号"
                    value={code}
                    data-testid="settings-admin-code"
                    onChange={(e) => setCode(e.target.value)}
                  />
                  <button type="submit" className="btn" data-testid="settings-admin-unlock">
                    解放
                  </button>
                  {wrong && (
                    <span className="settings-admin-wrong" data-testid="settings-admin-wrong">
                      番号が違います
                    </span>
                  )}
                </form>
              )}
              {admin === 'OPEN' && (
                <div className="settings-admin-tools" data-testid="settings-admin-tools">
                  <span className="settings-admin-note">管理者モード</span>
                  <button type="button" className="btn settings-danger" data-testid="settings-reset" onClick={() => setAsk('RESET_1')}>
                    データリセット
                  </button>
                </div>
              )}
            </section>
          </>
        ) : (
          <Confirm ask={ask} onTitle={onTitle} onAsk={setAsk} />
        )}
      </CrystalPanel>
    </div>
  );
}

/** One question at a time, in the card: タイトルに戻る once; データリセット twice, the second in red. */
function Confirm({ ask, onTitle, onAsk }: { ask: Exclude<Ask, null>; onTitle?: () => void; onAsk: (a: Ask) => void }) {
  const words =
    ask === 'TITLE'
      ? { q: 'タイトルに戻りますか？', note: 'ここまでの記録は残ります。', yes: '戻る' }
      : ask === 'RESET_1'
        ? { q: 'すべてのセーブデータを消しますか？', note: '村・戦闘・ガルドの答え・世界の記憶がすべて消え、最初からになります。設定は残ります。', yes: '消す' }
        : { q: '本当に消しますか？', note: 'この操作は元に戻せません。', yes: '消して最初から' };
  return (
    <div className="settings-confirm" data-testid={`settings-confirm-${ask.toLowerCase()}`}>
      <p className="settings-confirm-q">{words.q}</p>
      <p className="settings-confirm-note">{words.note}</p>
      <div className="settings-actions">
        <button
          type="button"
          className={`btn ${ask === 'TITLE' ? 'primary' : 'settings-danger'}`}
          data-testid="settings-confirm-yes"
          onClick={() => {
            if (ask === 'TITLE') onTitle?.();
            else if (ask === 'RESET_1') onAsk('RESET_2');
            else requestSaveReset();
          }}
        >
          {words.yes}
        </button>
        <button type="button" className="btn" data-testid="settings-confirm-no" onClick={() => onAsk(null)}>
          やめる
        </button>
      </div>
    </div>
  );
}
