import { useEffect, useRef } from 'react';
import { createGreenwoodGame } from '../../game/exploration/GreenwoodScene';

interface Props {
  onEncounter: () => void;
  onBack: () => void;
}

/** Hosts the Phaser exploration scene for Greenwood Forest. */
export function GreenwoodScreen({ onEncounter, onBack }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const encounterRef = useRef(onEncounter);
  encounterRef.current = onEncounter;

  useEffect(() => {
    if (!hostRef.current) return;
    const game = createGreenwoodGame(hostRef.current, {
      onEncounter: () => encounterRef.current(),
    });
    return () => {
      game.destroy(true);
    };
  }, []);

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
