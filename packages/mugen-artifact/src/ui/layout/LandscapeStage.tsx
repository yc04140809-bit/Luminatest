import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
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
 * The same question, asked of the page instead of the window.
 *
 * `.landscape-root` is sized in `dvh` and padded by the four
 * safe-area insets, so its CONTENT BOX is exactly the part of the glass
 * that belongs to the game: bars, notches, cutouts and Android's
 * gesture strip already taken out. Reading it back is how the stage
 * learns about all of that without this file naming a single device.
 *
 * `clientWidth`/`clientHeight` include padding, so the padding is
 * subtracted — which is also the only way to get an `env()` value into
 * JavaScript at all.
 */
function measureInside(root: HTMLElement | null): StageBox | null {
  if (!root) return null;
  const style = getComputedStyle(root);
  const px = (v: string) => Number.parseFloat(v) || 0;
  const width = root.clientWidth - px(style.paddingLeft) - px(style.paddingRight);
  const height = root.clientHeight - px(style.paddingTop) - px(style.paddingBottom);
  // A box with no size yet — the first frame, a hidden tab — is not an
  // answer. The window's own measurement stands until there is one.
  if (width <= 0 || height <= 0) return null;
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
  const rootRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<StageBox>(measure);

  // LAYOUT effect, not an ordinary one: the first measurement happens
  // before the browser paints, so the game is never drawn once at the
  // window's size and then again at the safe one.
  useLayoutEffect(() => {
    const update = () => setBox(measureInside(rootRef.current) ?? measure());
    update();
    // The element itself changing size covers every cause at once —
    // a rotation, a bar retracting, a keyboard, a host page resizing
    // its frame — and it covers them without guessing which event a
    // given browser will fire.
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => update());
    if (rootRef.current && observer) observer.observe(rootRef.current);
    window.addEventListener('resize', update);
    // The visual viewport resizes without the window doing so — a
    // browser bar sliding away is exactly that — so it is watched too.
    window.visualViewport?.addEventListener('resize', update);
    // Some browsers fire only one of the two, and some fire
    // orientationchange before the new size is readable — hence both,
    // and a re-measure on the next frame.
    window.addEventListener('orientationchange', () => requestAnimationFrame(update));
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const layout = layoutFor(box);
  return (
    <div
      ref={rootRef}
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
