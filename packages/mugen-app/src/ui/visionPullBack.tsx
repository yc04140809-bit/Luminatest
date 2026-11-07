import { useEffect, useRef, useState } from 'react';
import {
  PULL_BACK_HIS_PAGE,
  PULL_BACK_LINE,
  PULL_BACK_OTHER_PAGES,
  PULL_BACK_UNKNOWN,
} from '@mugen/content/events/visionPullBack';
import { audioManager } from '../platform/audio';
import { areaArt } from '../assets/areas';
import { usePicture } from './scene';
import './visionPullBack.css';

/**
 * 引く演出 (作者 2026-11-03 採用 — TIME SHIFT の直後、第1章の中盤の山場).
 *
 *   HOLD    his three years' picture where it was, a moment longer; the music falls away, and the village behind
 *           darkens slowly into the night of the pages (作者 2026-11-07 — not a cut)
 *   SHRINK  the picture draws back into a page of the life record — his, 「盗賊」
 *   PAGES   around it, one after another, other people's pages: a name, 「？？？」, 「まだ知らない出来事」
 *   WORDS   「見ていない間も、人生は続いている。」
 *   DONE    つづける — and on, to her bringing them back (the music with it)
 *
 * A tap before the end shows the end at once; a device that asks for less motion is shown the end from the
 * start. Nothing is written anywhere — like all of TIME SHIFT, it is shown, not lived.
 */
export type PullBackStage = 'HOLD' | 'SHRINK' | 'PAGES' | 'WORDS' | 'DONE';

/** When each stage begins (ms from the start). */
export const PULL_BACK_AT: Readonly<Record<Exclude<PullBackStage, 'HOLD'>, number>> = {
  SHRINK: 1800,
  PAGES: 3500,
  WORDS: 5300,
  DONE: 6600,
};

const ORDER: readonly PullBackStage[] = ['HOLD', 'SHRINK', 'PAGES', 'WORDS', 'DONE'];
const reached = (now: PullBackStage, stage: PullBackStage) => ORDER.indexOf(now) >= ORDER.indexOf(stage);

function lessMotion(): boolean {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}

export function VisionPullBack({
  picture,
  onDone,
}: {
  /** His three years' picture, as SEE showed it (null where it could not be drawn: the pages alone). */
  picture: { src: string; alt: string } | null;
  onDone: () => void;
}) {
  const [stage, setStage] = useState<PullBackStage>(() => (lessMotion() ? 'DONE' : 'HOLD'));
  const [ratio, setRatio] = useState(2 / 3);
  const timers = useRef<number[]>([]);
  // The ground SEE stood on (the village, held back), for the night to come over slowly.
  const ground = usePicture(() => areaArt('ALDEN').then((a) => a.background), 'backdrop:ALDEN');
  const left = useRef(false);

  useEffect(() => {
    // The music falls away while they look; it comes back as she brings them back.
    audioManager.duckBgmTo(0.22, 1500);
    if (stage !== 'DONE') {
      for (const s of ['SHRINK', 'PAGES', 'WORDS', 'DONE'] as const) {
        timers.current.push(window.setTimeout(() => setStage((now) => (reached(now, s) ? now : s)), PULL_BACK_AT[s]));
      }
    }
    return () => {
      timers.current.forEach((t) => window.clearTimeout(t));
      timers.current = [];
      if (!left.current) audioManager.duckBgmTo(1, 800);
    };
  }, []);

  const finish = () => {
    if (stage === 'DONE') return;
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    setStage('DONE');
  };

  return (
    <div
      className={`vision-pull vp-${stage.toLowerCase()}`}
      data-testid="vision-pull"
      data-stage={stage}
      style={{ ['--vp-ratio' as string]: String(ratio) }}
      onClick={finish}
    >
      {ground && <img className="vp-backdrop" src={ground} alt="" aria-hidden="true" data-testid="vision-pull-ground" />}
      <span className="vp-sky" aria-hidden="true" data-testid="vision-pull-sky" />
      <span className="vp-veil" aria-hidden="true" />
      {/* His page: the picture, then the page round it. */}
      <div className="vp-page vp-his" data-testid="vision-pull-his">
        {picture && (
          <img
            src={picture.src}
            alt={picture.alt}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalWidth && img.naturalHeight) setRatio(img.naturalWidth / img.naturalHeight);
            }}
          />
        )}
        <p className="vp-page-name">
          {PULL_BACK_HIS_PAGE.name}
          <small>{PULL_BACK_HIS_PAGE.sub}</small>
        </p>
      </div>
      {/* The others: a name, and nothing known of them yet. */}
      {PULL_BACK_OTHER_PAGES.map((p, i) => (
        <div
          key={p.id}
          className={`vp-page vp-other vp-other-${i}`}
          data-testid={`vision-pull-page-${p.id}`}
          aria-hidden={reached(stage, 'PAGES') ? undefined : true}
        >
          <p className="vp-page-name">{p.name}</p>
          <p className="vp-unknown">{PULL_BACK_UNKNOWN.mark}</p>
          <p className="vp-unknown-note">{PULL_BACK_UNKNOWN.note}</p>
        </div>
      ))}
      <p className="vp-line" data-testid="vision-pull-line" aria-live="polite">
        {reached(stage, 'WORDS') ? PULL_BACK_LINE : ''}
      </p>
      {stage === 'DONE' && (
        <button
          type="button"
          className="btn primary vp-next"
          data-testid="future-vision-next"
          onClick={(e) => {
            e.stopPropagation();
            left.current = true;
            audioManager.duckBgmTo(1, 800);
            onDone();
          }}
        >
          つづける
        </button>
      )}
    </div>
  );
}
