import type { MemoryEvent } from '../../core/memory/types';
import { MEMORY_EVENT_LABEL } from '../../content/events/galdLifeChoice';
import { Ornament } from '../common/Ornament';

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
      <div className="screen-title">世界の記憶</div>
      {/* The記憶 read as one thread with marks along it, not as rows in a
          table: what the world keeps is a chain of causes, and the page
          should look like that before a word of it is read. */}
      <div className="location-list memory-trace" data-testid="world-memory-list">
        {events.length === 0 ? (
          <p className="memory-empty">
            <Ornament kind="feather" size={26} />
            <br />
            まだ、世界に刻まれた記憶はありません。
          </p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="location-card" data-testid={`memory-event-${event.type}`}>
              <span className="memory-trace-mark" aria-hidden="true">
                <Ornament kind="ring" size={16} />
              </span>
              <div className="location-name">{MEMORY_EVENT_LABEL[event.type] ?? event.type}</div>
              <div className="location-desc">
                {event.worldYear}年目 {event.worldDay}日目
                {event.causedBy && event.causedBy.length > 0 && (
                  <>
                    <br />
                    <span data-testid={`caused-by-${event.type}`}>
                      きっかけ:{' '}
                      {event.causedBy
                        .map((cause) => MEMORY_EVENT_LABEL[cause] ?? cause)
                        .join(' / ')}
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
