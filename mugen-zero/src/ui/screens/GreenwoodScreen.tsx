import { useEffect, useRef } from 'react';
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
    if (!hostRef.current) return;
    const game = createGreenwoodGame(
      hostRef.current,
      { onEncounter: () => encounterRef.current() },
      { encounterEnabled },
    );
    return () => {
      game.destroy(true);
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
