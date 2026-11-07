import { TIME_GUIDE_CARD } from '@mugen/content/story/timeGuide';
import { NavyButton, NavyPlate } from './kit/NavyPlate';
import './timeGuide.css';

/**
 * 時間の使い方 — TO BE LOOKED AT AGAIN (段階4, 作者 2026-11-03/11-04): what Kaos said the first time back in, written
 * — the two ways (じっくり派・がっつり派) and the ※ — over whatever screen it was opened from (噂話・設定). The plain
 * navy plate, as the result's and the chapter's summary.
 */
export function TimeGuidePanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="time-guide-veil" role="dialog" aria-modal="true" aria-label={TIME_GUIDE_CARD.title} data-testid="time-guide">
      <NavyPlate title={TIME_GUIDE_CARD.title} className="time-guide-card">
        <dl className="time-guide-ways">
          {TIME_GUIDE_CARD.ways.map((w) => (
            <div key={w.name} className="time-guide-way" data-testid="time-guide-way">
              <dt>{w.name}</dt>
              <dd>{w.text}</dd>
            </div>
          ))}
        </dl>
        <p className="time-guide-note" data-testid="time-guide-note">
          {TIME_GUIDE_CARD.note}
        </p>
        <NavyButton testId="time-guide-close" label="とじる" onClick={onClose} />
      </NavyPlate>
    </div>
  );
}

/** The small way into it, on the screens it is reached from. */
export function TimeGuideButton({ onClick, testId }: { onClick: () => void; testId: string }) {
  return (
    <button type="button" className="time-guide-open" data-testid={testId} onClick={onClick}>
      {TIME_GUIDE_CARD.title}
    </button>
  );
}

/**
 * The dev server's tests come back into the village as they always have: a cookie (`mugen_dev_time_guide=off`, set
 * for the whole suite by playwright.config) passes her five lines. Its own spec (timeGuide.spec) clears it. DEV only
 * — a build never reads it.
 */
export function timeGuideSkipped(): boolean {
  if (!import.meta.env.DEV) return false;
  try {
    return document.cookie.split('; ').includes('mugen_dev_time_guide=off');
  } catch {
    return false;
  }
}
