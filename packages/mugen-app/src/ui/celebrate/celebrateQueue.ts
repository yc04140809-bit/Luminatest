// ハイタッチ — ONE AT A TIME, AND NEVER TOO OFTEN (作者指示 2026-10-11).
//
// Every celebration goes through here (`showCelebratePopup`), and the host
// (RewardCelebratePopup.tsx) draws whatever is `shown`.
//
//   - ONE PER MOMENT: several arriving together (within MOMENT_MS — a golden
//     find seen for the first time, and the first herb it held, a save's
//     write apart) become the one most worth showing
//     (content/rewards/celebrate.ts: discovery, craft, rare, first).
//   - THE SAME THING CLOSE TOGETHER IS ONCE: the same key waiting, on
//     screen, or shown within DEDUPE_MS is dropped.
//   - A QUEUE, NOT AN OVERWRITE: one arriving while another is shown waits
//     its turn — at most MAX_WAITING wait; beyond that the least worth
//     showing is let go.
//   - A BREATH BETWEEN: after one ends, the next waits COOLDOWN_MS.
//   - Off with one flag (`celebrateSettings.rewardPopup`).
//
// The host is keyed by the screen: when the screen goes, whatever was
// waiting goes with it (`clear`) — nothing lingers over the next place.

import { mostWorthShowing, type Celebration } from '@mugen/content/rewards/celebrate';

/** Arrivals this close together are one moment (a save's write apart). */
export const MOMENT_MS = 200;
/** On screen: 0.15s in, about a second held, 0.3s out. */
export const CELEBRATE_MS = 1500;
/** The breath between two. */
export const COOLDOWN_MS = 500;
/** The same key again within this is the same moment. */
export const DEDUPE_MS = 1000;
/** How many may wait behind the one shown. */
export const MAX_WAITING = 2;

/** 演出のON/OFF — for a settings screen to come (on by default). */
export const celebrateSettings = { rewardPopup: true };

export interface ShownCelebration extends Celebration {
  id: number;
  duration: number;
}

export class CelebrateQueue {
  private moment: Celebration[] = [];
  private waiting: Celebration[] = [];
  private current: ShownCelebration | null = null;
  private lastShown = new Map<string, number>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private momentPending = false;
  private momentTimer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 1;
  private restingUntil = 0;
  private listeners = new Set<() => void>();

  constructor(
    private readonly now: () => number = () => Date.now(),
    private readonly settings: { rewardPopup: boolean } = celebrateSettings,
  ) {}

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getShown = (): ShownCelebration | null => this.current;

  /** What waits, in the order it will be shown. */
  pending(): readonly Celebration[] {
    return [...this.waiting];
  }

  push(c: Celebration | null): void {
    if (!c || !this.settings.rewardPopup) return;
    this.moment.push(c);
    if (this.momentPending) return;
    this.momentPending = true;
    // Whatever else arrives in the next moment is the same moment.
    this.momentTimer = setTimeout(() => {
      this.momentTimer = null;
      this.momentPending = false;
      const best = mostWorthShowing(this.moment);
      this.moment = [];
      if (best) this.enqueue(best);
    }, MOMENT_MS);
  }

  private seenLately(key: string): boolean {
    if (this.current?.key === key || this.waiting.some((w) => w.key === key)) return true;
    const at = this.lastShown.get(key);
    return at !== undefined && this.now() - at < DEDUPE_MS;
  }

  private enqueue(c: Celebration): void {
    if (this.seenLately(c.key)) return;
    this.waiting.push(c);
    // Too many: keep the most worth showing (then the earliest).
    if (this.waiting.length > MAX_WAITING) {
      const ranked = this.waiting.map((w, i) => ({ w, i })).sort((a, b) => a.w.priority - b.w.priority || a.i - b.i);
      const keep = new Set(ranked.slice(0, MAX_WAITING).map((r) => r.w));
      this.waiting = this.waiting.filter((w) => keep.has(w));
    }
    this.pump();
  }

  private pump(): void {
    if (this.current || this.timer || this.waiting.length === 0) return;
    const wait = this.restingUntil - this.now();
    if (wait > 0) {
      this.timer = setTimeout(() => {
        this.timer = null;
        this.pump();
      }, wait);
      return;
    }
    const next = this.waiting.shift()!;
    this.current = { ...next, id: this.nextId++, duration: CELEBRATE_MS };
    this.lastShown.set(next.key, this.now());
    const id = this.current.id;
    this.timer = setTimeout(() => {
      this.timer = null;
      this.finish(id);
    }, CELEBRATE_MS);
    this.emit();
  }

  /** The one shown is over (its time, or the host let it go). */
  finish(id: number): void {
    if (this.current?.id !== id) return;
    this.current = null;
    this.restingUntil = this.now() + COOLDOWN_MS;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit();
    this.pump();
  }

  /** Everything dropped (the screen changed). What was shown lately is still remembered. */
  clear(): void {
    this.moment = [];
    if (this.momentTimer) clearTimeout(this.momentTimer);
    this.momentTimer = null;
    this.momentPending = false;
    this.waiting = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    const had = this.current !== null;
    this.current = null;
    if (had) this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

/** The one queue the game uses. */
export const celebrations = new CelebrateQueue();

/** 「新しい発見！」… — the one call every moment uses. */
export function showCelebratePopup(c: Celebration | null): void {
  if (!c) return;
  if (import.meta.env.DEV && typeof window !== 'undefined') {
    // For the tests: every celebration asked for, in order (shown or not).
    const w = window as unknown as { __mugenCelebrations?: { kind: string; title: string; subtitle: string }[] };
    (w.__mugenCelebrations ??= []).push({ kind: c.kind, title: c.title, subtitle: c.subtitle });
  }
  celebrations.push(c);
}
