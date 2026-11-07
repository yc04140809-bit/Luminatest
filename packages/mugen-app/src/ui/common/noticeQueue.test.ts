import { describe, expect, it } from 'vitest';
import { NOTICE_DURATION, NoticeQueue, type Notice } from './noticeQueue';

/** 共通通知キュー (2026-10-08): one at a time, in order, never on top of each other. */

/** A queue whose "end of tick" is run by hand. */
function manual() {
  const runs: (() => void)[] = [];
  const q = new NoticeQueue((run) => runs.push(run));
  const tick = () => {
    while (runs.length) runs.shift()!();
  };
  return { q, tick };
}
const n = (message: string, priority: Notice['priority'] = 'NORMAL', extra: Partial<Notice> = {}): Notice => ({
  type: 'test',
  message,
  priority,
  look: 'top',
  ...extra,
});
/** Shows everything, recording the order. */
function drain(q: NoticeQueue, tick: () => void): string[] {
  const seen: string[] = [];
  tick();
  for (let i = 0; i < 20 && q.getShown(); i++) {
    seen.push(q.getShown()!.message);
    q.finish(q.getShown()!.id);
    tick();
  }
  return seen;
}

describe('the notice queue', () => {
  it('one notice: shown, for its duration, then gone', () => {
    const { q, tick } = manual();
    q.push(n('a', 'LOW'));
    expect(q.getShown()).toBeNull(); // not until the tick's arrivals are in
    tick();
    expect(q.getShown()!.message).toBe('a');
    expect(q.getShown()!.duration).toBe(NOTICE_DURATION.LOW);
    q.finish(q.getShown()!.id);
    tick();
    expect(q.getShown()).toBeNull();
  });

  it('two or three together: one at a time, by priority, then as they came', () => {
    const { q, tick } = manual();
    q.push(n('item', 'LOW'));
    q.push(n('auto', 'NORMAL'));
    q.push(n('destination', 'HIGH'));
    expect(drain(q, tick)).toEqual(['destination', 'auto', 'item']);
  });

  it('an important one and an item together: the important one first', () => {
    const { q, tick } = manual();
    q.push(n('薬草 ×1 を手に入れた', 'LOW'));
    q.push(n('新しい目的地が追加されました', 'HIGH'));
    expect(drain(q, tick)).toEqual(['新しい目的地が追加されました', '薬草 ×1 を手に入れた']);
  });

  it('one arriving while another is shown waits — the shown one is never cut short', () => {
    const { q, tick } = manual();
    q.push(n('first', 'LOW'));
    tick();
    const first = q.getShown()!;
    q.push(n('urgent', 'HIGH'));
    tick();
    expect(q.getShown()!.id).toBe(first.id);
    q.finish(first.id);
    tick();
    expect(q.getShown()!.message).toBe('urgent');
  });

  it('a later arrival does not jump ahead of one already waiting from an earlier tick', () => {
    const { q, tick } = manual();
    q.push(n('shown', 'LOW'));
    tick();
    q.push(n('waiting-low', 'LOW'));
    tick();
    q.push(n('later-high', 'HIGH'));
    tick();
    q.finish(q.getShown()!.id);
    tick();
    expect(q.getShown()!.message).toBe('waiting-low');
  });

  it('never two on screen: at every moment, at most one is shown', () => {
    const { q, tick } = manual();
    for (let i = 0; i < 5; i++) q.push(n(`m${i}`));
    tick();
    expect(q.pending()).toHaveLength(4);
    expect(q.getShown()).not.toBeNull();
  });

  it('the same thing again before it is shown: one notice, counted (薬草 ×3)', () => {
    const { q, tick } = manual();
    q.push(n('other', 'LOW'));
    tick();
    const herb = (count: number): Notice =>
      n(`薬草 ×${count} を手に入れた`, 'LOW', { merge: { key: 'got:FOREST_HERB', count, format: (c) => `薬草 ×${c} を手に入れた` } });
    q.push(herb(1));
    q.push(herb(1));
    q.push(herb(1));
    expect(q.pending().map((p) => p.message)).toEqual(['薬草 ×3 を手に入れた']);
  });

  it('the same notice (by id) twice is queued once; a stale finish does nothing; clear empties it', () => {
    const { q, tick } = manual();
    q.push(n('once', 'HIGH', { id: 'once:x' }));
    q.push(n('once', 'HIGH', { id: 'once:x' }));
    tick();
    expect(q.pending()).toHaveLength(0);
    q.finish('someone-else');
    expect(q.getShown()!.id).toBe('once:x');
    q.push(n('more'));
    q.clear();
    tick();
    expect(q.getShown()).toBeNull();
    expect(q.pending()).toHaveLength(0);
  });
});
