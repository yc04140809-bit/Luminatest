import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { rumorMark, type VillageRumor } from '@mugen/content/story/villageRumors';
import { NewBadge } from './common/NewBadge';
import { rumorsOf } from './rumors';

/**
 * ✉ アルデン通信 — THE VILLAGE'S NEWS, BROUGHT TO THEM (襲撃前の日々,
 * 作者指示 2026-10-11).
 *
 * As they come back into the village, or wake after a night's rest: a small
 * card at the top of the square when something is being talked about that
 * they have not read — one at a time, NEW. 「読む」 opens it there (and it is
 * read, as in 噂話); 「あとで」 lets it be (still NEW in 噂話). It is announced
 * once, as it is shown (`note:NEWS_<id>`): the card does not come back for
 * it, ignored or not — the next time brings the next one.
 * 噂話 stays the archive of everything heard.
 *
 * READING MOVES NOTHING: no incident point, no memory (「噂を読むだけでは世界は
 * 進まない」) — it is the same read mark 噂話 writes.
 */

export const newsMark = (rumorId: string) => `note:NEWS_${rumorId}`;

/** The rumour to bring them now: one not yet read nor announced, or null. */
export function newsFor(world: World): VillageRumor | null {
  return rumorsOf(world).rumors.find((r) => !world.isRead(rumorMark(r.id)) && !world.isRead(newsMark(r.id))) ?? null;
}

export function NewsAside({ world, rumor, onDone }: { world: World; rumor: VillageRumor; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  // Brought once: shown is announced.
  useEffect(() => {
    if (!world.isRead(newsMark(rumor.id))) void world.markRead([newsMark(rumor.id)]).catch(() => {});
  }, [rumor.id]);
  const read = () => {
    setOpen(true);
    void world.markRead([rumorMark(rumor.id)]).catch(() => {});
  };
  // Read meanwhile in 噂話: nothing to bring.
  if (!open && world.isRead(rumorMark(rumor.id))) return null;
  const later = onDone;
  return (
    <div className="kaos-aside daily-aside news-aside" data-testid="alden-news" data-rumor={rumor.id}>
      <div className="kaos-aside-head">
        <p className="kaos-aside-speaker">✉ アルデン通信</p>
        <NewBadge show={!open} testId="alden-news-new" />
      </div>
      <p className="kaos-aside-line" data-testid="alden-news-title">
        {rumor.title}
        {open && (
          <span className="news-text" data-testid="alden-news-text">
            {rumor.from && <small className="rumor-from">{rumor.from}</small>}「{rumor.text}」
          </span>
        )}
      </p>
      <div className="news-actions">
        {open ? (
          <button className="kaos-aside-next" data-testid="alden-news-close" onClick={onDone}>
            とじる
          </button>
        ) : (
          <>
            <button className="kaos-aside-next" data-testid="alden-news-read" onClick={read}>
              読む
            </button>
            <button className="kaos-aside-next news-later" data-testid="alden-news-later" onClick={later}>
              あとで
            </button>
          </>
        )}
      </div>
    </div>
  );
}
