/**
 * 引く演出 — FROM ONE LIFE TO THE WORLD (作者 2026-11-03 採用: TIME SHIFT 直後、第1章の中盤の山場).
 *
 * After his three years: the picture held a moment longer, the music falling away; it shrinks into a page of the
 * life record — his — and around it other pages come, of people the player knows (or knows the name of: エルナ, from
 * the note), with nothing written in them yet. Then one line. Nothing is explained: what is on those pages is for
 * the player to wonder about. Then back to the village, as before.
 *
 * His page is titled as the life record titles it (「盗賊」 — 第1章's record keeps the name he was met by).
 */
export const PULL_BACK_HIS_PAGE = { name: '盗賊', sub: '人生の記録' } as const;

/** The other pages: who, and only that nothing of them is known yet. In the order they come. */
export const PULL_BACK_OTHER_PAGES: readonly { id: string; name: string }[] = [
  { id: 'lina', name: 'リナ' },
  { id: 'rizel', name: 'リゼル' },
  { id: 'elna', name: 'エルナ' },
  { id: 'baldo', name: 'バルド' },
];

/** What each of their pages holds. */
export const PULL_BACK_UNKNOWN = { mark: '？？？', note: 'まだ知らない出来事' } as const;

/** The one line. */
export const PULL_BACK_LINE = '見ていない間も、人生は続いている。';
