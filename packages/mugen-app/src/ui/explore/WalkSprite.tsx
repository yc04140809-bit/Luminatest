import { useState } from 'react';
import type { SpriteFrame } from '@mugen/content/characters/explorationSprites';

/**
 * ONE FRAME OF A WALKER, STANDING WHERE ITS FEET ARE.
 *
 * Positioned by the frame's own foot anchor — not the middle of the
 * picture — so changing frame never moves the person. A frame cut from a
 * sheet shows only its own rectangle; a frame that is a whole file shows
 * the file. Nothing is redrawn: the delivered pixels, scaled.
 */
export function WalkSprite({
  frame,
  scale,
  feetX,
  feetY,
  testId,
  alt,
  bob = 0,
}: {
  frame: SpriteFrame;
  /** Screen pixels per source pixel, before the frame's own correction. */
  scale: number;
  feetX: number;
  feetY: number;
  testId: string;
  alt: string;
  /** Pixels lifted off the ground this moment — the step. */
  bob?: number;
}) {
  const s = scale * (frame.scale ?? 1);
  const rect = frame.rect;
  // A whole-file frame is as big as its file, known once it has loaded.
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const box = rect
    ? { width: rect.width * s, height: rect.height * s }
    : natural
      ? { width: natural.w * s, height: natural.h * s }
      : undefined;
  return (
    <div
      className="walk-sprite"
      data-testid={testId}
      data-frame={frame.url + (rect ? `#${rect.x}` : '')}
      role="img"
      aria-label={alt}
      style={{
        left: feetX - frame.anchor.x * s,
        top: feetY - frame.anchor.y * s - bob,
        width: box?.width,
        height: box?.height,
        overflow: 'hidden',
      }}
    >
      <img
        src={frame.url}
        alt=""
        draggable={false}
        onLoad={(e) => {
          const img = e.currentTarget;
          if (!natural || natural.w !== img.naturalWidth || natural.h !== img.naturalHeight)
            setNatural({ w: img.naturalWidth, h: img.naturalHeight });
        }}
        style={{
          left: rect ? -rect.x * s : 0,
          top: rect ? -rect.y * s : 0,
          transform: `scale(${s})`,
        }}
      />
    </div>
  );
}
