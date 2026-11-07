import { useEffect, useState, useSyncExternalStore } from 'react';
import type { CelebrateKind } from '@mugen/content/rewards/celebrate';
import { celebrateArtSrc } from '../../assets/celebrateArt';
import { playSfx } from '../../platform/audio';
import { celebrations, type CelebrateQueue } from './celebrateQueue';

/**
 * ハイタッチ — THE TWO OF THEM, GLAD, FOR A MOMENT (作者指示 2026-10-11).
 *
 * The high-five picture large, a little above the middle of the screen, the
 * heading over it and the small line under it; a faint gold flash once.
 * About a second and a half, then gone. It takes no touch — everything under
 * it still answers — so it never stops the game; a door taken while it shows
 * takes it away (the host is keyed by the screen).
 */
export function RewardCelebratePopup({
  imageSrc,
  title,
  subtitle,
  duration,
  effectType,
  priority,
}: {
  imageSrc: string | null;
  title: string;
  subtitle?: string;
  duration: number;
  effectType: CelebrateKind;
  priority: number;
}) {
  return (
    <div
      className={`celebrate celebrate-${effectType.toLowerCase()}`}
      data-testid="celebrate-popup"
      data-kind={effectType}
      data-priority={priority}
      role="status"
      aria-live="polite"
      style={{ animationDuration: `${duration}ms` }}
    >
      <div className="celebrate-flash" aria-hidden="true" />
      <p className="celebrate-title" data-testid="celebrate-title">
        {title}
      </p>
      {imageSrc && <img className="celebrate-art" src={imageSrc} alt="" aria-hidden="true" data-testid="celebrate-art" />}
      {subtitle && (
        <p className="celebrate-sub" data-testid="celebrate-sub">
          {subtitle}
        </p>
      )}
    </div>
  );
}

/** Where the queue's celebration is drawn, one at a time (celebrateQueue.ts). Keyed by the screen. */
export function CelebrateHost({ queue = celebrations }: { queue?: CelebrateQueue }) {
  const shown = useSyncExternalStore(queue.subscribe, queue.getShown, queue.getShown);
  useEffect(() => () => queue.clear(), [queue]);
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!shown) return;
    let gone = false;
    void celebrateArtSrc(shown.art).then((s) => !gone && setSrc(s));
    // One short bright ring as it appears.
    playSfx('ui_celebrate');
    return () => {
      gone = true;
    };
  }, [shown?.id]);
  if (!shown) return null;
  return (
    <RewardCelebratePopup
      key={shown.id}
      imageSrc={src}
      title={shown.title}
      subtitle={shown.subtitle}
      duration={shown.duration}
      effectType={shown.kind}
      priority={shown.priority}
    />
  );
}
