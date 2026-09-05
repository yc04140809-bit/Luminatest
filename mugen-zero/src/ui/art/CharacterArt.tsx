import type { ArtAsset, ResolvedArt } from '../../core/art/artStates';

interface Props<S extends string> {
  /** What the art layer answered. Never a filename. */
  art: ResolvedArt<S>;
  /** How tall to draw it, in CSS pixels. */
  height: number;
  className: string;
  /**
   * Which way this one should be looking on this screen.
   *
   * The battlefield faces enemies right and the party left. A drawing
   * that already faces that way is drawn as it is; one that does not is
   * mirrored. The file is never edited and never re-exported.
   */
  face?: 'left' | 'right';
  /** For the placeholder, so a missing picture still says who is missing. */
  label?: string;
  testId?: string;
}

/**
 * A character, drawn from whatever picture the art layer found.
 *
 * The picture is shown as a background crop rather than an <img>: art
 * arrives with transparent margin around it, and the game must not
 * repaint a pixel, so the box says which part of the file is the
 * character and this scales that box to the height asked for.
 */
export function CharacterArt<S extends string>({
  art,
  height,
  className,
  face,
  label,
  testId,
}: Props<S>) {
  if (art.placeholder || !art.asset) {
    return (
      <div
        className={`${className} art-missing`}
        style={{ height, width: Math.round(height * 0.62) }}
        data-testid={testId}
        data-art-state="missing"
        role="img"
        aria-label={label ? `${label}（画像未実装）` : '画像未実装'}
      >
        <span aria-hidden="true">?</span>
      </div>
    );
  }
  const { asset } = art;
  const box = asset.box;
  const flip = face !== undefined && asset.facing !== undefined && asset.facing !== face;
  const style = box
    ? cropStyle(asset, box, height)
    : { height, width: 'auto', backgroundImage: `url(${asset.src})`, backgroundSize: 'contain' };
  return (
    <div
      className={className}
      style={{ ...style, transform: flip ? 'scaleX(-1)' : undefined }}
      data-testid={testId}
      data-art-state={art.state ?? undefined}
      // A screen showing a stand-in says so in the DOM. It is how a test
      // can tell "the attack pose is drawn" from "the attack pose falls
      // back to the standing one", which look identical in a screenshot.
      data-art-substituted={art.substituted ? 'yes' : undefined}
    />
  );
}

function cropStyle(asset: ArtAsset, box: NonNullable<ArtAsset['box']>, height: number) {
  const k = height / box.height;
  return {
    width: box.width * k,
    height,
    backgroundImage: `url(${asset.src})`,
    backgroundSize: `${box.fileW * k}px ${box.fileH * k}px`,
    backgroundPosition: `${-box.x * k}px ${-box.y * k}px`,
  } as const;
}
