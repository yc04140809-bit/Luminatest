import { useState } from 'react';
import type { LifeArchiveEntry } from '../../core/archive/lifeArchive';
import { UNKNOWN_CONTINUATION_TEXT } from '../../content/archive/galdChapters';

interface Props {
  /** World.getLifeArchive() — built from PLAYER KNOWLEDGE, never raw truth. */
  entries: LifeArchiveEntry[];
  onBack: () => void;
}

/**
 * LIFE ARCHIVE — the record of the lives the player has actually touched.
 * Not a bestiary and not an event log: chapters appear only as the player
 * meets, chooses, discovers and reunites. No event ids, no spoilers.
 */
export function ArchiveScreen({ entries, onBack }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = entries.find((e) => e.characterId === selectedId) ?? null;

  if (selected) {
    return (
      <div className="screen" data-testid="archive-detail">
        <div className="screen-title">{selected.displayName} — LIFE RECORD</div>
        <div className="location-list" style={{ gap: 6 }}>
          {selected.chapters.map((chapter, i) => (
            <div key={chapter.id}>
              {i > 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>↓</div>
              )}
              <div className="location-card" data-testid={`archive-chapter-${chapter.id}`}>
                <div className="location-desc" style={{ marginBottom: 4 }}>
                  {chapter.worldYear}年目 {chapter.worldDay}日目
                </div>
                <div className="location-name">{chapter.title}</div>
                <div className="location-desc">{chapter.summary}</div>
              </div>
            </div>
          ))}
          {selected.hasUnknownContinuation && (
            <div>
              <div style={{ textAlign: 'center', color: 'var(--text-dim)', fontSize: 12 }}>↓</div>
              <div
                className="location-card"
                data-testid="archive-unknown"
                style={{ opacity: 0.6 }}
              >
                <div className="location-name">？？？</div>
                <div className="location-desc">{UNKNOWN_CONTINUATION_TEXT}</div>
              </div>
            </div>
          )}
        </div>
        <div className="screen-footer">
          <button className="btn" data-testid="archive-detail-back" onClick={() => setSelectedId(null)}>
            もどる
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen" data-testid="archive-screen">
      <div className="screen-title">LIFE ARCHIVE</div>
      <div className="location-list">
        <p
          style={{
            color: 'var(--text-dim)',
            fontSize: 13,
            textAlign: 'center',
            margin: '4px 0 10px',
          }}
        >
          あなたが出会った命の記録
        </p>
        {entries.length === 0 ? (
          <p
            data-testid="archive-empty"
            style={{ color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.9 }}
          >
            まだ、誰の人生も記録されていない。
          </p>
        ) : (
          entries.map((entry) => (
            <button
              key={entry.characterId}
              className="location-card"
              data-testid={`archive-entry-${entry.characterId}`}
              onClick={() => setSelectedId(entry.characterId)}
            >
              <div className="location-name">{entry.displayName}</div>
              <div className="location-desc">
                {entry.firstKnownAt.worldYear}年目 {entry.firstKnownAt.worldDay}日目に出会った
              </div>
            </button>
          ))
        )}
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="archive-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
