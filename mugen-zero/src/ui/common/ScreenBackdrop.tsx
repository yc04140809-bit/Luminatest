/**
 * A full-screen art layer behind a screen's UI.
 *
 * Two rules it must never break:
 *  - it is decoration, so it is aria-hidden and pointer-events:none — a
 *    tap always reaches the button under the finger;
 *  - it never carries information. Everything the player must read is
 *    drawn by the UI above it.
 *
 * `variant` picks how the art is fitted and how hard it is dimmed; the
 * densities live next to each other in styles.css so the screens can be
 * tuned against one another.
 */
interface Props {
  /** Art to show, or null — then nothing is rendered at all. */
  src: string | null;
  variant: 'title' | 'village' | 'battle' | 'encounter';
  /** Overrides the variant's crop, for art that names its own subject. */
  focus?: string;
  /** Overrides the variant's scale, for art not composed for a phone. */
  fit?: string;
  testId?: string;
}

export function ScreenBackdrop({ src, variant, focus, fit, testId }: Props) {
  if (!src) return null;
  return (
    <div className={`screen-backdrop backdrop-${variant}`} aria-hidden="true" data-testid={testId}>
      {fit && (
        // Art given its own size leaves the page bare above and below it,
        // and on a light page that bare strip meets the picture as a hard
        // line. The same image, blurred out to fill the frame, gives the
        // band something of itself to fade into.
        <div
          className="screen-backdrop-underlay"
          style={{ backgroundImage: `url(${src})` }}
        />
      )}
      <div
        // Art given its own size does not fill the screen, so its edges
        // are real edges. On a light page they show as hard seams; the
        // inset class feathers them into the paper.
        className={`screen-backdrop-art${fit ? ' backdrop-art-inset' : ''}`}
        style={{
          backgroundImage: `url(${src})`,
          ...(focus ? { backgroundPosition: focus } : {}),
          ...(fit ? { backgroundSize: fit } : {}),
        }}
      />
      <div className="screen-backdrop-veil" />
    </div>
  );
}
