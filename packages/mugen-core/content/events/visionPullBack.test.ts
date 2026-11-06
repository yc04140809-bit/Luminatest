import { describe, expect, it } from 'vitest';
import { PULL_BACK_HIS_PAGE, PULL_BACK_LINE, PULL_BACK_OTHER_PAGES, PULL_BACK_UNKNOWN } from './visionPullBack';

describe('引く演出 (作者 2026-11-03 採用)', () => {
  it('his page as the record names him; four others, nothing known of them; the one line', () => {
    expect(PULL_BACK_HIS_PAGE.name).toBe('盗賊');
    expect(PULL_BACK_OTHER_PAGES.map((p) => p.name)).toEqual(['リナ', 'リゼル', 'エルナ', 'バルド']);
    expect(PULL_BACK_UNKNOWN).toEqual({ mark: '？？？', note: 'まだ知らない出来事' });
    expect(PULL_BACK_LINE).toBe('見ていない間も、人生は続いている。');
  });
});
