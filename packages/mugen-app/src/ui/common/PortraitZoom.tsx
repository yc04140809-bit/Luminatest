import { useEffect } from 'react';

/**
 * A FULL-LENGTH PICTURE, LARGE (作者指示 2026-10-11: 全身立ち絵をもっと見たい).
 *
 * The screen behind dims; the picture stands in the middle as large as the
 * screen allows, whole and in its own shape, a small name in the corner.
 * Closed by a touch anywhere (the picture or the dark around it), the ×, or
 * Escape. One component for anyone with a picture — the two of them today;
 * Aria, Levi, a skin later — so a screen only says what and whose.
 */
export function PortraitZoom({ src, name, onClose }: { src: string; name?: string; onClose: () => void }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onClose]);
  return (
    <div className="portrait-zoom" data-testid="portrait-zoom" role="dialog" aria-modal="true" aria-label={name ?? '立ち絵'} onClick={onClose}>
      {name && <p className="portrait-zoom-name">{name}</p>}
      <img className="portrait-zoom-img" src={src} alt={name ?? ''} data-testid="portrait-zoom-img" />
      <button
        className="portrait-zoom-close"
        data-testid="portrait-zoom-close"
        aria-label="閉じる"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ×
      </button>
    </div>
  );
}

/** The small magnifier that opens it. */
export function ZoomButton({ onClick, testId, label = '拡大' }: { onClick: () => void; testId: string; label?: string }) {
  return (
    <button className="zoom-button" data-testid={testId} aria-label={label} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <line x1="15.3" y1="15.3" x2="21" y2="21" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        <line x1="10.5" y1="7.5" x2="10.5" y2="13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="7.5" y1="10.5" x2="13.5" y2="10.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    </button>
  );
}
