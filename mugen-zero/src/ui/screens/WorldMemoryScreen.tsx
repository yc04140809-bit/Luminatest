import type { MemoryEvent } from '../../core/memory/types';
import type { CharacterState } from '../../core/characters/types';
import { MEMORY_EVENT_LABEL } from '../../content/events/galdLifeChoice';

interface Props {
  events: MemoryEvent[];
  /** Debug: Gald's CURRENT state, shown to verify event effects. */
  galdState?: CharacterState;
  onBack: () => void;
}

/**
 * Displays what is stored in WORLD MEMORY (the DB is the truth;
 * this screen only renders it). Phase C: doubles as the debug view for
 * verifying causality — this is world truth, not player knowledge;
 * the player-facing discovery flow comes in later phases.
 */
export function WorldMemoryScreen({ events, galdState, onBack }: Props) {
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
              </div>
            </div>
          ))
        )}
        {galdState && (
          <div className="location-card" data-testid="gald-state">
            <div className="location-name" style={{ fontSize: 13, color: 'var(--text-dim)' }}>
              CHARACTER STATE（現在 / DEBUG）
            </div>
            <div className="location-desc">
              GALD — occupation: {galdState.occupation} / location: {galdState.location} / alive:{' '}
              {String(galdState.alive)}
            </div>
          </div>
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
