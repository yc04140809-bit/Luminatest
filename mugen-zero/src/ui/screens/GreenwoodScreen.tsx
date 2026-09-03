import { useEffect, useRef } from 'react';
import type Phaser from 'phaser';
import { createGreenwoodGame } from '../../game/exploration/GreenwoodScene';

interface Props {
  onEncounter: () => void;
  onBack: () => void;
  /** False when Gald's life choice already exists in WORLD MEMORY. */
  encounterEnabled: boolean;
}

/**
 * Greenwood Forest.
 *
 * The world is the subject here, so the UI stands back: the place names
 * itself at the top, one line says how to move, and the way out is a
 * quiet line rather than a slab. Everything else on screen is forest.
 */
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
        { encounterEnabled, reducedMotion: prefersLessMotion() },
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
    <div className="screen field-screen">
      <header className="field-intro">
        <p className="field-intro-en">GREENWOOD FOREST</p>
        <h1 className="field-intro-jp">グリーンウッドの森</h1>
        <span className="field-intro-rule" aria-hidden="true" />
      </header>
      <div className="phaser-wrap" ref={hostRef} data-testid="greenwood-canvas" />
      <div className="field-foot">
        <p className="field-hint">
          {encounterEnabled ? '歩きたい場所をタップ' : '森は、静かだ。'}
        </p>
        <button className="field-exit" data-testid="leave-forest" onClick={onBack}>
          森を出る
        </button>
      </div>
    </div>
  );
}

/**
 * Whether to hold the cues still. Reads both the player's own setting
 * (the same attribute the stylesheet honours) and the system preference,
 * because Phaser draws outside CSS and would otherwise ignore both.
 */
function prefersLessMotion(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  if (document.documentElement.getAttribute('data-reduced-motion') === 'on') return true;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}
