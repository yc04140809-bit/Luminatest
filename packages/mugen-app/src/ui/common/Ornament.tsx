/**
 * MUGEN ZERO — the marks the world draws on its own pages.
 *
 * Three, and no more. Each one means something, and each one is used
 * where it means it; a mark that turns up everywhere stops being a mark
 * and becomes wallpaper.
 *
 *   ring     a circle that does not quite close — time, cause, return
 *   feather  something left behind by someone who has gone
 *   wings    Kaos, and only Kaos: one side feathered, one side webbed
 *
 * All three are inline SVG on currentColor: they cost no request, scale
 * to any size, and inherit whatever gold the page is already using.
 */
interface Props {
  kind: 'ring' | 'feather' | 'wings';
  /** Rendered size in px. The shapes are drawn on a 24-unit grid. */
  size?: number;
  className?: string;
}

export function Ornament({ kind, size = 20, className }: Props) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'aria-hidden': true as const,
    focusable: 'false' as const,
    className,
  };

  if (kind === 'ring') {
    return (
      <svg {...common} strokeWidth={1}>
        {/* The gap is the point: a circle still being drawn. */}
        <circle cx="12" cy="12" r="8.5" strokeDasharray="46 8" strokeLinecap="round" />
        <circle cx="12" cy="12" r="2.6" strokeWidth={0.9} opacity={0.75} />
      </svg>
    );
  }

  if (kind === 'feather') {
    return (
      <svg {...common} strokeWidth={0.9} strokeLinecap="round" strokeLinejoin="round">
        <path d="M16.8 5.2c2.4 3.6 1.5 8.6-2 11.2-2.3 1.7-5 1.9-7 1.5" />
        <path d="M16.8 5.2C13 5.6 9.6 7.4 8 10.4c-1.4 2.7-1.3 5.5-.2 7.5" />
        <path d="M7.8 17.9 5 21" />
      </svg>
    );
  }

  // Kaos. The asymmetry is her, so it is never mirrored: the left side is
  // feathered, the right side is webbed, and they are not the same shape.
  return (
    <svg
      width={size * 3}
      height={size}
      viewBox="0 0 72 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      className={className}
    >
      {/* angel — long overlapping feathers */}
      <path d="M31 12c-5-4.4-11-6.6-18-6.6 3 1.9 5 3.8 6 5.7" />
      <path d="M31 12c-5.6-2-11.2-2.4-16.8-1.2 2.6 1.4 4.4 2.9 5.4 4.4" />
      <path d="M31 12c-4.6.2-8.6 1.4-12 3.6 2.4.2 4.4.8 6 1.8" />
      {/* the ring between them — the world remembering */}
      <circle cx="36" cy="12" r="3.4" strokeDasharray="18 4" />
      {/* demon — fewer bones, webbed between them */}
      <path d="M41 12c4.6-4.2 10.4-6.4 17.4-6.6" />
      <path d="M41 12c5.4-1 10.8-.6 16 1.2" />
      <path d="M58.4 5.4c-.6 3-2.2 5.6-4.6 7.6" />
      <path d="M50.4 6.8c.2 2.6-.4 5-1.8 7.2" />
    </svg>
  );
}
