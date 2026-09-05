import { useEffect, useState, type ReactNode } from 'react';
import { stageFor, stageTransform, type StageBox } from './landscape';

function measure(): StageBox {
  if (typeof window === 'undefined') return { width: 812, height: 375, rotated: false };
  return stageFor(window.innerWidth, window.innerHeight);
}

/**
 * The whole game, always landscape.
 *
 * A phone held upright still gets the landscape game — turned, so the
 * player turns the phone. There is no portrait layout to fall back to
 * and no orientation switch to handle: every screen inside this can
 * assume it is wider than it is tall, which is what makes a battlefield
 * with an enemy at one end and the party at the other possible at all.
 *
 * The manifest asks an installed copy for landscape, but that is a
 * request a browser is free to ignore, so this is the part that is
 * actually load-bearing.
 */
export function LandscapeStage({ children }: { children: ReactNode }) {
  const [box, setBox] = useState<StageBox>(measure);

  useEffect(() => {
    const update = () => setBox(measure());
    update();
    window.addEventListener('resize', update);
    // Some browsers fire only one of the two, and some fire
    // orientationchange before the new size is readable — hence both,
    // and a re-measure on the next frame.
    window.addEventListener('orientationchange', () => requestAnimationFrame(update));
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return (
    <div className="landscape-root" data-testid="landscape-root">
      <div
        className="landscape-stage"
        data-testid="landscape-stage"
        data-rotated={box.rotated ? 'yes' : 'no'}
        style={{
          width: box.width,
          height: box.height,
          transform: stageTransform(box),
          // Screens that need to know how much room they have read these
          // rather than measuring the window, which after a rotation is
          // the wrong way round.
          ['--stage-w' as string]: `${box.width}px`,
          ['--stage-h' as string]: `${box.height}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
