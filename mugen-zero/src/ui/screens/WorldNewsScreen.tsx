import type { PlayerNews } from '../../core/news/types';

/**
 * 村のうわさ — what Alden is talking about today.
 *
 * FOUR LINES IN FIVE ARE ABOUT A CHICKEN, and nothing on this screen
 * says which one is not. No badge, no ordering, no count, no colour
 * that varies by line — every item is rendered by the same rule,
 * because the moment one of them looks different the player stops
 * reading a village and starts auditing a quest log.
 *
 * That is also why this screen is so plain. There is no filter, no
 * history, no 「新着」: a noticeboard is a thing you glance at on the
 * way past and half-remember later, and every feature that would make
 * the meaningful line easier to find would cost exactly that.
 *
 * It receives `PlayerNews`, which carries an id and a sentence and
 * nothing else — so it could not render an importance even if somebody
 * later wished it would.
 */

interface Props {
  clock: { worldYear: number; worldDay: number };
  news: readonly PlayerNews[];
  onBack: () => void;
}

export function WorldNewsScreen({ clock, news, onBack }: Props) {
  return (
    <div className="screen" data-testid="world-news-screen">
      <div className="screen-title">村のうわさ</div>
      <p className="news-day" data-testid="news-day">
        {clock.worldYear}年目 {clock.worldDay}日目 — アルデン村
      </p>
      <div className="screen-scroll">
        {news.length === 0 ? (
          <p className="news-item" data-testid="news-empty">
            今日は、とりたてて何も。
          </p>
        ) : (
          <ul className="news-list">
            {news.map((item) => (
              <li key={item.id} className="news-item" data-testid="news-item">
                {item.text}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="screen-footer">
        <button className="btn" data-testid="news-back" onClick={onBack}>
          もどる
        </button>
      </div>
    </div>
  );
}
