import { useState } from 'react';
import type { WorldClock } from '../../core/events/types';

interface Props {
  clock: WorldClock;
  onExplore: () => void;
  onWorldMemory: () => void;
  /** DEV (Phase C): advances the world by one day. REST replaces this in Phase D. */
  onAdvanceDay: () => Promise<void>;
}

export function HomeScreen({ clock, onExplore, onWorldMemory, onAdvanceDay }: Props) {
  const [advancing, setAdvancing] = useState(false);

  const advance = async () => {
    if (advancing) return;
    setAdvancing(true);
    try {
      await onAdvanceDay();
    } finally {
      setAdvancing(false);
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
          data-testid="advance-day-button"
          style={{ fontSize: 13 }}
          disabled={advancing}
          onClick={advance}
        >
          ADVANCE DAY（開発用）
        </button>
      </div>
      <nav className="bottom-nav">
        <button className="nav-item active">HOME</button>
        <button className="nav-item" disabled title="PHASE F で実装">
          ARCHIVE
        </button>
        <button className="nav-item" disabled title="PHASE D で実装">
          REST
        </button>
      </nav>
    </div>
  );
}
