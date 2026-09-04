/**
 * The marks on the battle commands.
 *
 * Line drawings on a 24-unit grid, inline SVG on currentColor, in the
 * same hairline language as the rest of the game's ornament — so a
 * button wears a mark rather than a picture, and the mark takes the
 * colour of whatever it is sitting in.
 *
 * These are UI, not characters: nothing here draws a person or an
 * animal, and nothing here replaces an asset.
 */
interface Props {
  size?: number;
  className?: string;
}

const base = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.1,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
  focusable: 'false' as const,
  className,
});

/** 攻撃 / KILL — a blade. */
export function SwordIcon({ size = 18, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M18.5 4.2 10 12.7l1.3 1.3 8.5-8.5-1.3-1.3Z" />
      <path d="m9.3 13.4-2 2 3.3 3.3 2-2" />
      <path d="m6.6 16.1-2.4 2.4M5.9 20.5l-1.4-1.4" />
    </svg>
  );
}

/** スキル — the small light that means "something you know". */
export function SparkIcon({ size = 18, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 4.5 13.6 10 19 11.6 13.6 13.2 12 18.7 10.4 13.2 5 11.6 10.4 10Z" />
      <path d="M18.2 4.4v2.6M16.9 5.7h2.6" strokeWidth={0.9} />
    </svg>
  );
}

/** SPARE — a life left alone. */
export function HeartIcon({ size = 18, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M12 19s-6.4-4-6.4-8.3A3.5 3.5 0 0 1 12 8.6a3.5 3.5 0 0 1 6.4 2.1C18.4 15 12 19 12 19Z" />
    </svg>
  );
}

/** HELP — a hand put out, drawn as the leaf that was in the way. */
export function LeafIcon({ size = 18, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M19 5c0 7.2-3.6 11.4-8.6 11.4A4.4 4.4 0 0 1 6 12c0-4.4 4.7-7 13-7Z" />
      <path d="M5 19c2.4-3.4 5.4-6 9-7.6" />
    </svg>
  );
}

/** CAPTURE — a life taken along, not shut away for ever. */
export function CageIcon({ size = 18, className }: Props) {
  return (
    <svg {...base(size, className)}>
      <path d="M5.5 19h13" />
      <path d="M6.5 19V11a5.5 5.5 0 0 1 11 0v8" />
      <path d="M9.8 19v-8.4M14.2 19v-8.4" strokeWidth={0.85} />
      <path d="M12 5.6V4" strokeWidth={0.85} />
    </svg>
  );
}
