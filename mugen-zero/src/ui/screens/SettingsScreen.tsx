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
      <div className="screen-title">SETTINGS — 設定</div>
      <div className="location-list">
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
          <label htmlFor="se-volume">SE 音量（{Math.round(settings.seVolume * 100)}%）</label>
          <input
            id="se-volume"
            data-testid="se-volume"
            type="range"
            min={0}
            max={100}
            value={Math.round(settings.seVolume * 100)}
            onChange={(e) => set('seVolume', Number(e.target.value) / 100)}
          />
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
