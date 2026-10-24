interface Props {
  onSkip: () => void;
}

/**
 * The one control the opening theme has.
 *
 * It is on screen only while there is something to end, so it never
 * offers to skip silence. It sits clear of the title logo and of the
 * buttons underneath it, and covers no art.
 */
export function OpeningSkip({ onSkip }: Props) {
  return (
    <button className="opening-skip" data-testid="opening-skip" onClick={onSkip}>
      SKIP
    </button>
  );
}
