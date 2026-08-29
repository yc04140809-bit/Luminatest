import { useState } from 'react';
import type { WorldClock } from '../../core/events/types';

interface Props {
  clock: WorldClock;
  onExplore: () => void;
  onWorldMemory: () => void;
  /** REST: advances the world by one day. */
  onRest: () => Promise<void>;
  /** Opens the TIME SHIFT confirmation screen. */
  onTimeShift: () => void;
}

export function HomeScreen({ clock, onExplore, onWorldMemory, onRest, onTimeShift }: Props) {
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
    <div className="screen">
      <div className="home-main">
        <div className="home-place">ALDEN VILLAGE — アルデン村</div>
        <div className="home-place" style={{ letterSpacing: '0.1em' }} data-testid="world-clock">
          {clock.worldYear}年目 {clock.worldDay}日目
        </div>
        <button className="btn home-explore" data-testid="explore-button" onClick={onExplore}>
          EXPLORE
        </button>
        <div className="home-place" style={{ letterSpacing: 0 }}>
          周辺を探索する
        </div>
        <button
          className="btn"
          data-testid="world-memory-button"
          style={{ fontSize: 13 }}
          onClick={onWorldMemory}
        >
          WORLD MEMORY — 世界の記憶
        </button>
        <button
          className="btn"
          data-testid="time-shift-button"
          style={{ fontSize: 13 }}
          onClick={onTimeShift}
        >
          TIME SHIFT — 旅立つ（+3年）
        </button>
      </div>
      <nav className="bottom-nav">
        <button className="nav-item active">HOME</button>
        <button className="nav-item" disabled title="PHASE F で実装">
          ARCHIVE
        </button>
        <button className="nav-item" data-testid="rest-button" disabled={resting} onClick={rest}>
          REST
        </button>
      </nav>
    </div>
  );
}
