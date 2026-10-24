// ONE NOTICE AT A TIME — the shared queue (実装メイン⑥, 2026-10-08).
//
// 「新しい目的地」, 「AUTO戦闘が使用可能」, 「薬草 ×1 を手に入れた」… each used to
// appear on its own, so two arriving together lay on top of each other, or a
// later one cut an earlier one short. Now every short notice goes through
// this queue and is shown alone, one after another.
//
//   - Order: notices that arrive together (the same tick) go by priority
//     (HIGH, NORMAL, LOW), then as they came; a later arrival waits its turn
//     and never cuts short the one on screen.
//   - The same thing twice before it is shown is one notice: 「薬草 ×3」
//     rather than three of 「×1」 (`merge`).
//   - Where it is drawn (top or bottom, a pill or the walk's line) stays the
//     notice's own; only one is drawn at a time, wherever it is.
//
// Deliberately small: no history, no settings. The host (NoticeHost) shows
// `shown` for its `duration` and then calls `finish`.

export type NoticePriority = 'HIGH' | 'NORMAL' | 'LOW';

/** How long each kind stays, unless a notice says otherwise. */
export const NOTICE_DURATION: Record<NoticePriority, number> = { HIGH: 2800, NORMAL: 2400, LOW: 2200 };

export interface Notice {
  /** Unique per notice (made if absent). */
  id?: string;
  /** What kind it is: 'destination', 'unlock', 'pickup'… */
  type: string;
  message: string;
  priority: NoticePriority;
  /** Milliseconds on screen; absent is NOTICE_DURATION[priority]. */
  duration?: number;
  /** How it is drawn: the top pill (once-notice) or the walk's bottom line (walk-got). */
  look: 'top' | 'bottom';
  /** For tests and screen readers. */
  testId?: string;
  /** A rare find: drawn a little apart. */
  special?: boolean;
  /** Notices with the same key, not yet shown, become one: `format(total)`. */
  merge?: { key: string; count: number; format: (count: number) => string };
}

export interface QueuedNotice extends Required<Pick<Notice, 'id' | 'duration'>>, Omit<Notice, 'id' | 'duration'> {
  /** Which tick it arrived in, and in what order. */
  batch: number;
  seq: number;
}

const RANK: Record<NoticePriority, number> = { HIGH: 0, NORMAL: 1, LOW: 2 };

type Schedule = (run: () => void) => void;

export class NoticeQueue {
  private waiting: QueuedNotice[] = [];
  private current: QueuedNotice | null = null;
  private batch = 0;
  private seq = 0;
  private pumpPending = false;
  private listeners = new Set<() => void>();

  /** `schedule` runs a callback once the current tick is over (a microtask by default). */
  constructor(private readonly schedule: Schedule = (run) => queueMicrotask(run)) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /** What is on screen now, or null. */
  getShown = (): QueuedNotice | null => this.current;

  /** What is waiting, in the order it will be shown. */
  pending(): readonly QueuedNotice[] {
    return [...this.waiting].sort(order);
  }

  push(notice: Notice): void {
    // The same notice twice (by id) is one: already waiting or on screen, it is not queued again.
    if (notice.id && (this.current?.id === notice.id || this.waiting.some((w) => w.id === notice.id))) return;
    if (notice.merge) {
      const same = this.waiting.find((w) => w.merge?.key === notice.merge!.key);
      if (same && same.merge) {
        const count = same.merge.count + notice.merge.count;
        same.merge = { ...same.merge, count };
        same.message = same.merge.format(count);
        this.emit();
        return;
      }
    }
    this.waiting.push({
      ...notice,
      id: notice.id ?? `notice-${++this.seq}`,
      duration: notice.duration ?? NOTICE_DURATION[notice.priority],
      batch: this.batch,
      seq: ++this.seq,
    });
    this.later();
  }

  /** The one on screen has had its time (by id, so a stale timer finishes nothing). */
  finish(id: string): void {
    if (this.current?.id !== id) return;
    this.current = null;
    this.emit();
    this.later();
  }

  /** Everything, gone — the screen they belonged to has gone. */
  clear(): void {
    this.waiting = [];
    this.current = null;
    this.emit();
  }

  /** Show the next once this tick's arrivals are all in, so they can be put in order. */
  private later(): void {
    if (this.pumpPending) return;
    this.pumpPending = true;
    this.schedule(() => {
      this.pumpPending = false;
      this.batch += 1;
      this.pump();
    });
  }

  private pump(): void {
    if (this.current || this.waiting.length === 0) return;
    this.waiting.sort(order);
    this.current = this.waiting.shift() ?? null;
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

function order(a: QueuedNotice, b: QueuedNotice): number {
  return a.batch - b.batch || RANK[a.priority] - RANK[b.priority] || a.seq - b.seq;
}

/** The App's one queue. */
export const notices = new NoticeQueue();
