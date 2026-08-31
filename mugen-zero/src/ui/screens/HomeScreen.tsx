import { useState } from 'react';
import type { WorldClock } from '../../core/events/types';
import { DEV_ADMIN_ENABLED } from '../../dev/devMode';
import { ScreenBackdrop } from '../common/ScreenBackdrop';
import { locationBackground } from '../../content/locations/locationVisuals';

interface Props {
  clock: WorldClock;
  onExplore: () => void;
  onWorldMemory: () => void;
  /** REST: advances the world by one day. */
  onRest: () => Promise<void>;
  /** Opens the TIME SHIFT confirmation screen. */
  onTimeShift: () => void;
  /** Opens the LIFE ARCHIVE. */
  onArchive: () => void;
  /** Opens player settings. */
  onSettings: () => void;
  /** Opens the DEV ADMIN lock screen (dev builds only). */
  onDevAdmin: () => void;
}

export function HomeScreen({
  clock,
  onExplore,
  onWorldMemory,
  onRest,
  onTimeShift,
  onArchive,
  onSettings,
  onDevAdmin,
}: Props) {
  const [resting, setResting] = useState(false);

  const rest = async () => {
    if (resting) return;
    setResting(true);
    try {
      await onRest();
    } finally {
      setResting(false);
    }
  };

  return (
    <div className="screen has-backdrop">
      {/* HOME is a place, not a menu: the player is standing in Alden. */}
      <ScreenBackdrop
        src={locationBackground('ALDEN_VILLAGE')}
        variant="village"
        testId="home-backdrop"
      />
      <div className="home-main">
        <div className="home-place">ALDEN VILLAGE — アルデン村</div>
        <div className="home-place" style={{ letterSpacing: '0.1em' }} data-testid="world-clock">
          {clock.worldYear}年目 {clock.worldDay}日目
        </div>
        <button className="btn home-explore" data-testid="explore-button" onClick={onExplore}>
          <span className="home-explore-jp">探索する</span>
          <span className="home-explore-en">EXPLORE</span>
        </button>
        <button
          className="btn"
          data-testid="world-memory-button"
          style={{ fontSize: 13 }}
          onClick={onWorldMemory}
        >
          世界の記憶
          <span className="btn-sub">WORLD MEMORY</span>
        </button>
        <button
          className="btn"
          data-testid="time-shift-button"
          style={{ fontSize: 13 }}
          onClick={onTimeShift}
        >
          旅立つ（+3年）
          <span className="btn-sub">TIME SHIFT</span>
        </button>
        <button
          className="btn"
          data-testid="settings-button"
          style={{ fontSize: 13 }}
          onClick={onSettings}
        >
          設定
          <span className="btn-sub">SETTINGS</span>
        </button>
        {DEV_ADMIN_ENABLED && (
          <button
            data-testid="dev-admin-entry"
            onClick={onDevAdmin}
            style={{
              background: 'none',
              border: 'none',
              color: '#3a3a4c',
              fontSize: 11,
              letterSpacing: '0.2em',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            DEV
          </button>
        )}
      </div>
      <nav className="bottom-nav">
        <button className="nav-item active">ホーム</button>
        <button className="nav-item" data-testid="archive-button" onClick={onArchive}>
          人生の記録
        </button>
        <button className="nav-item" data-testid="rest-button" disabled={resting} onClick={rest}>
          {resting ? '休息中…' : '休息する'}
        </button>
      </nav>
    </div>
  );
}
