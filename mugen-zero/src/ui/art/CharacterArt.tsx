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
  /**
   * Show the top of the drawing rather than all of it.
   *
   * A conversation wants a face. When a talking picture exists it is
   * already a close-up and this does nothing; when the art layer has
   * fallen back to a whole figure, this is what turns that figure into
   * a close-up — which is the whole reason a close-up is not an eighth
   * picture somebody has to draw.
   */
  bust?: boolean;
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
  bust,
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
  // A close-up of a picture that is already a close-up is just the
  // picture. Only a stand-in gets cropped.
  const cropToBust = bust === true && art.state !== 'talk' && art.state !== 'portrait';
  const box = cropToBust ? bustBox(asset) : asset.box;
  const flip = face !== undefined && asset.facing !== undefined && asset.facing !== face;
  const style = box
    ? cropStyle(asset, box, height)
    : cropToBust
      ? bustStyle(asset, height)
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
      data-art-bust={cropToBust ? 'yes' : undefined}
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


/**
 * The top of a drawing, as a box.
 *
 * The head and shoulders of a standing figure are the top third or so
 * of it, roughly centred. Rough is right: this is a fallback for a
 * picture nobody has drawn yet, and a rule that is nearly right
 * everywhere beats a table of per-character numbers that has to be
 * maintained for a stand-in.
 */
const BUST_HEIGHT = 0.38;
const BUST_WIDTH = 0.56;

function bustBox(asset: ArtAsset): NonNullable<ArtAsset['box']> | undefined {
  const box = asset.box;
  if (!box) return undefined;
  return {
    fileW: box.fileW,
    fileH: box.fileH,
    x: box.x + box.width * ((1 - BUST_WIDTH) / 2),
    y: box.y,
    width: box.width * BUST_WIDTH,
    height: box.height * BUST_HEIGHT,
  };
}

/**
 * The same crop for a picture whose file has no box on it.
 *
 * Its pixel size is not known here, so the crop is said in proportions
 * instead: draw the whole figure at the height it would need for its
 * top BUST_HEIGHT to fill this element, and show that top.
 */
function bustStyle(asset: ArtAsset, height: number) {
  return {
    height,
    width: Math.round(height * (BUST_WIDTH / BUST_HEIGHT) * 0.62),
    backgroundImage: `url(${asset.src})`,
    backgroundSize: `auto ${Math.round(height / BUST_HEIGHT)}px`,
    backgroundPosition: 'center top',
    backgroundRepeat: 'no-repeat',
  } as const;
}
