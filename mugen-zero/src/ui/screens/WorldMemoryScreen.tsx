import type { MemoryEvent } from '../../core/memory/types';
import { MEMORY_EVENT_LABEL } from '../../content/events/galdLifeChoice';

interface Props {
  /**
   * Pass World.getKnownEvents() here, never the full truth: this is the
   * player-facing view and must not spoil undiscovered lives. The complete
   * canon lives in the DEV ADMIN event viewer.
   */
  events: MemoryEvent[];
  onBack: () => void;
}

/** Displays the recorded past the player knows about. */
export function WorldMemoryScreen({ events, onBack }: Props) {
  return (
    <div className="screen">
      <div className="screen-title">WORLD MEMORY — 世界の記憶</div>
      <div className="location-list" data-testid="world-memory-list">
        {events.length === 0 ? (
          <p style={{ color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.8 }}>
            まだ、世界に刻まれた記憶はありません。
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="location-card" data-testid={`memory-event-${event.type}`}>
              <div className="location-name">{MEMORY_EVENT_LABEL[event.type] ?? event.type}</div>
              <div className="location-desc">
                {event.type}
                <br />
                {event.worldYear}年目 {event.worldDay}日目 / {event.location}
                <br />
                関係者: {event.actors.join('、')} / 重要度: {event.importance}
                {event.causedBy && event.causedBy.length > 0 && (
                  <>
                    <br />
                    <span data-testid={`caused-by-${event.type}`}>
                      因果: {event.causedBy.join(' + ')} → {event.type}
                    </span>
                  </>
                )}
                {event.type === 'WORLD_TIME_SHIFTED' && event.from && event.to && (
                  <>
                    <br />
                    {event.from.worldYear}年目{event.from.worldDay}日目 →{' '}
                    {event.to.worldYear}年目{event.to.worldDay}日目（+{event.yearsElapsed}年）
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="world-memory-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
