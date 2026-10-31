/**
 * NEW — THE ONE MARK FOR "SOMETHING HERE YOU HAVE NOT LOOKED AT".
 *
 * Small and red, on whatever holds the new thing: a menu button, a list
 * row, a door on the map. It decides nothing. Whether a thing is new is
 * the world's (`world.isRead`, core/world/readMarks.ts), and it stops
 * being new only when the thing ITSELF is looked at, used or read —
 * never because the menu holding it was opened. Whoever shows the thing
 * calls `world.markRead` at that moment.
 */
export function NewBadge({ show = true, testId }: { show?: boolean; testId?: string }) {
  if (!show) return null;
  return (
    <i className="new-badge" data-testid={testId} aria-label="新着">
      NEW
    </i>
  );
}
