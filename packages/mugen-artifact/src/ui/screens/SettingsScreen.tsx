import type { GameSettings } from '../../platform/settings';
import { isHapticSupported } from '../../platform/haptics';

interface Props {
  settings: GameSettings;
  onChange: (next: GameSettings) => void;
  onBack: () => void;
}

/** Player preferences only. Nothing here touches the world's history. */
export function SettingsScreen({ settings, onChange, onBack }: Props) {
  const set = <K extends keyof GameSettings>(key: K, value: GameSettings[K]) =>
    onChange({ ...settings, [key]: value });

  return (
    <div className="screen" data-testid="settings-screen">
      <div className="screen-title">設定</div>
      <div className="location-list">
        {/* MASTER first, because it is over the top of the other three:
            a player who wants the game quieter reaches for this one and
            keeps the balance they already set underneath it. */}
        <div className="settings-row">
          <label htmlFor="master-volume">
            全体音量（{Math.round(settings.masterVolume * 100)}%）
          </label>
          <input
            id="master-volume"
            data-testid="master-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.masterVolume * 100)}
            onChange={(e) => set('masterVolume', Number(e.target.value) / 100)}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="bgm-volume">BGM 音量（{Math.round(settings.bgmVolume * 100)}%）</label>
          <input
            id="bgm-volume"
            data-testid="bgm-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.bgmVolume * 100)}
            onChange={(e) => set('bgmVolume', Number(e.target.value) / 100)}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="sfx-volume">SFX 音量（{Math.round(settings.sfxVolume * 100)}%）</label>
          <input
            id="sfx-volume"
            data-testid="sfx-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.sfxVolume * 100)}
            onChange={(e) => set('sfxVolume', Number(e.target.value) / 100)}
          />
        </div>
        {/* RESERVED, AND SAID SO. Nothing in the game speaks yet, and a
            live slider that changes nothing is worse than one that
            admits it: the value is kept and will be the player's on the
            day there is a voice to apply it to. */}
        <div className="settings-row">
          <label htmlFor="voice-volume">
            ボイス音量（{Math.round(settings.voiceVolume * 100)}%）
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)' }}>
              ボイス実装後に有効になります
            </span>
          </label>
          <input
            id="voice-volume"
            data-testid="voice-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.voiceVolume * 100)}
            onChange={(e) => set('voiceVolume', Number(e.target.value) / 100)}
          />
        </div>
        <div className="settings-row">
          <label htmlFor="opening-toggle">
            オープニングテーマ
            <span style={{ display: 'block', fontSize: 11, color: 'var(--text-dim)' }}>
              ONのとき、タイトル前に「聴く / スキップ」をたずねます
            </span>
          </label>
          <button
            id="opening-toggle"
            className="btn"
            data-testid="opening-toggle"
            aria-pressed={settings.openingMode !== 'OFF'}
            onClick={() =>
              set('openingMode', settings.openingMode === 'OFF' ? 'ONCE_PER_SESSION' : 'OFF')
            }
          >
            {settings.openingMode === 'OFF' ? 'OFF' : 'ON'}
          </button>
        </div>
        <div className="settings-row">
          <label htmlFor="haptic-toggle">
            振動フィードバック
            {!isHapticSupported() && '（この端末では利用できません）'}
          </label>
          <button
            id="haptic-toggle"
            className="btn"
            data-testid="haptic-toggle"
            aria-pressed={settings.hapticEnabled}
            onClick={() => set('hapticEnabled', !settings.hapticEnabled)}
          >
            {settings.hapticEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
        <div className="settings-row">
          <label htmlFor="motion-toggle">演出を控えめにする</label>
          <button
            id="motion-toggle"
            className="btn"
            data-testid="motion-toggle"
            aria-pressed={settings.reducedMotion}
            onClick={() => set('reducedMotion', !settings.reducedMotion)}
          >
            {settings.reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>
        <p
          style={{
            color: 'var(--text-muted)',
            fontSize: 'var(--font-size-xs)',
            lineHeight: 1.9,
            marginTop: 'var(--space-md)',
          }}
        >
          設定はこの端末にのみ保存されます。世界の記憶には影響しません。
        </p>
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="settings-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
