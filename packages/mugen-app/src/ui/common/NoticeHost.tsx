import { useEffect, useSyncExternalStore } from 'react';
import { notices, type NoticeQueue } from './noticeQueue';

/**
 * WHERE THE QUEUE'S NOTICE IS DRAWN — one at a time (noticeQueue.ts). Keyed
 * by the screen by whoever renders it: when the screen goes, so does
 * everything it was going to say (as each screen's own notices always did).
 */
export function NoticeHost({ queue = notices }: { queue?: NoticeQueue }) {
  const shown = useSyncExternalStore(queue.subscribe, queue.getShown, queue.getShown);
  useEffect(() => () => queue.clear(), [queue]);
  useEffect(() => {
    if (!shown) return;
    const t = window.setTimeout(() => queue.finish(shown.id), shown.duration);
    return () => window.clearTimeout(t);
  }, [shown?.id]);
  if (!shown) return null;
  const style = { animationDuration: `${shown.duration}ms` };
  if (shown.look === 'bottom') {
    return (
      <p
        key={shown.id}
        className={`walk-got notice-bottom${shown.special ? ' special' : ''}`}
        data-testid={shown.testId}
        data-special={shown.special ? 'yes' : 'no'}
        data-notice={shown.type}
        role="status"
        style={style}
      >
        {shown.message}
      </p>
    );
  }
  return (
    <p key={shown.id} className="once-notice" role="status" data-testid={shown.testId} data-notice={shown.type} style={style}>
      {shown.message}
    </p>
  );
}
