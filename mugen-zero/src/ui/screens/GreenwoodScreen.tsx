import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGreenwoodGame } from '../../game/exploration/GreenwoodScene';

interface Props {
  onEncounter: () => void;
  onBack: () => void;
  /** False when Gald's life choice already exists in WORLD MEMORY. */
  encounterEnabled: boolean;
}

/** Hosts the Phaser exploration scene for Greenwood Forest. */
export function GreenwoodScreen({ onEncounter, onBack, encounterEnabled }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const encounterRef = useRef(onEncounter);
  encounterRef.current = onEncounter;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let game: Phaser.Game | null = null;
    let cancelled = false;

    // Phaser tears its canvas down asynchronously, so a fast
    // mount → unmount → mount (StrictMode, or navigating straight back
    // in) could leave an orphaned canvas behind and run two games at
    // once. Defer creation by a tick, and clear the host on cleanup.
    const timer = window.setTimeout(() => {
      if (cancelled) return;
      game = createGreenwoodGame(
        host,
        { onEncounter: () => encounterRef.current() },
        { encounterEnabled },
      );
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      game?.destroy(true);
      game = null;
      host.replaceChildren();
    };
  }, [encounterEnabled]);

  return (
    <div className="screen">
      <div className="screen-title">GREENWOOD FOREST — グリーンウッドの森</div>
      <div className="phaser-wrap" ref={hostRef} data-testid="greenwood-canvas" />
      <div className="screen-footer">
        <button className="btn" onClick={onBack}>
          森を出る
        </button>
      </div>
    </div>
  );
}
