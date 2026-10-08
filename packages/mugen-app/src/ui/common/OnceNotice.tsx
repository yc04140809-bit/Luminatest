import { useEffect } from 'react';
import type { World } from '@mugen/core/world/world';
import { notices, type NoticePriority } from './noticeQueue';

/**
 * A SHORT NOTICE, ONCE A WORLD — 「AUTO戦闘が使用可能になりました。」,
 * 「新しい目的地が追加されました」.
 *
 * Queued the first time `show` is true for this world (common queue,
 * noticeQueue.ts — shown alone, in its turn, at the top), and never again:
 * being queued is being seen, so its read mark (`mark`, core/world/
 * readMarks.ts) is written then. Nothing waits on it and nothing is pressed
 * to close it. Draws nothing itself (NoticeHost does).
 */
export function OnceNotice({
  world,
  mark,
  text,
  show = true,
  testId,
  type = 'system',
  priority = 'NORMAL',
}: {
  world: World;
  mark: string;
  text: string;
  show?: boolean;
  testId?: string;
  type?: string;
  priority?: NoticePriority;
}) {
  useEffect(() => {
    if (!show || world.isRead(mark)) return;
    notices.push({ id: `once:${mark}`, type, message: text, priority, look: 'top', testId });
    void world.markRead([mark]).catch(() => {});
  }, [show]);
  return null;
}
