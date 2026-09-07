import { useEffect, useState, type ReactNode } from 'react';
import { layoutFor, stageFor, type StageBox } from './landscape';

function measure(): StageBox {
  if (typeof window === 'undefined') return { width: 812, height: 375, portraitHost: false };
  // The visual viewport where there is one: it is what is actually on
  // screen, rather than what would be there if the browser's own bars
  // were not. Inside a published copy, and on a phone with a retracting
  // address bar, the two differ by enough to letterbox the game for no
  // reason. Falls back to the window, which is what it always used.
  const vv = window.visualViewport;
  const width = vv?.width ?? window.innerWidth;
  const height = vv?.height ?? window.innerHeight;
  return stageFor(width, height);
}

/**
 * The one stage every screen is drawn on.
 *
 * Landscape, always, and never by turning anything: the stage is laid
 * out at a landscape size and the game is drawn into it the right way
 * up. A window too tall to hold it gets a smaller stage, centred, with
 * the leftover left plain — a shrunk game a player can read beats a
 * full-size one printed up the side of their phone.
 *
 * It is also the only thing in the app that measures the window. Every
 * screen inside sizes itself against `--stage-w` / `--stage-h` instead,
 * so there is one coordinate system and no screen has to know how it
 * got there.
 */
export function LandscapeStage({ children }: { children: ReactNode }) {
  const [box, setBox] = useState<StageBox>(measure);

  useEffect(() => {
    const update = () => setBox(measure());
    update();
    window.addEventListener('resize', update);
    // The visual viewport resizes without the window doing so — a
    // browser bar sliding away is exactly that — so it is watched too.
    window.visualViewport?.addEventListener('resize', update);
    // Some browsers fire only one of the two, and some fire
    // orientationchange before the new size is readable — hence both,
    // and a re-measure on the next frame.
    window.addEventListener('orientationchange', () => requestAnimationFrame(update));
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const layout = layoutFor(box);
  return (
    <div
      className="landscape-root"
      data-testid="landscape-root"
      data-portrait-host={box.portraitHost ? 'yes' : 'no'}
    >
      <div
        className="landscape-stage"
        data-testid="landscape-stage"
        data-scale={layout.scale === 1 ? 'none' : layout.scale.toFixed(3)}
        style={{ width: box.width, height: box.height }}
      >
        {/* Laid out at a size the screens were written for, then shrunk
            to whatever the window can give. On a phone held sideways
            the scale is exactly 1 and this is a plain box. */}
        <div
          className="landscape-frame"
          data-testid="landscape-frame"
          style={{
            width: layout.width,
            height: layout.height,
            transform: layout.scale === 1 ? undefined : `scale(${layout.scale})`,
            // Screens that need to know how much room they have read
            // these rather than measuring the window, which on a
            // portrait phone is a good deal taller than the game.
            ['--stage-w' as string]: `${layout.width}px`,
            ['--stage-h' as string]: `${layout.height}px`,
          }}
        >
          {children}
        </div>
      </div>
      {/* Not a wall in front of the game: it stays playable at the size
          it fits in. Just the one thing worth saying to somebody holding
          the phone the wrong way. */}
      {box.portraitHost && (
        <p className="landscape-turn-hint" data-testid="turn-hint">
          端末を横向きにしてください
        </p>
      )}
    </div>
  );
}
