import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';

/** How long a notice stays, at its own pace (not the fight's speed). */
export const NOTICE_MS = 2800;

/**
 * A SHORT NOTICE, ONCE A WORLD — 「AUTO戦闘が使用可能になりました。」,
 * 「新しい目的地が追加されました」.
 *
 * Shown the first time `show` is true for this world, for a moment, and
 * then never again: being shown is being seen, so its read mark (`mark`,
 * core/world/readMarks.ts) is written as it appears. Nothing waits on it
 * and nothing is pressed to close it.
 */
export function OnceNotice({
  world,
  mark,
  text,
  show = true,
  testId,
}: {
  world: World;
  mark: string;
  text: string;
  show?: boolean;
  testId?: string;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!show || world.isRead(mark)) return;
    setVisible(true);
    void world.markRead([mark]).catch(() => {});
  }, [show]);
  useEffect(() => {
    if (!visible) return;
    const t = window.setTimeout(() => setVisible(false), NOTICE_MS);
    return () => window.clearTimeout(t);
  }, [visible]);
  if (!visible) return null;
  return (
    <p className="once-notice" role="status" data-testid={testId}>
      {text}
    </p>
  );
}
