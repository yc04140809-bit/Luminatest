// TODAY'S ALDEN, in five lines.
//
// The one place the news engine, the village's two lists, and the
// player's own world are brought together — so that a screen asks for
// "today's news" and gets sentences, and nothing on the way has an
// opportunity to hand it an importance.

import type { MemoryEvent } from '../memory/types';
import { toAbsoluteDay, type WorldClock } from '../time/calendar';
import { readWorldLife, WORLD_LIFE_RULES } from '../life/worldReading';
import { ALDEN_NEWS_PER_DAY, ALDEN_NOISE, ALDEN_SIGNALS } from '../../content/news/aldenNews';
import { newsday, playerNewsday } from './news';
import type { NewsItem, PlayerNews } from './types';

/**
 * What the village is saying today, as the player hears it.
 *
 * Derived from canon on every call and stored nowhere — there is no
 * news save, so nothing can disagree with the world it came from, and a
 * reloaded game hears the same village.
 *
 * The day is the world's own, so the gossip changes when the world does
 * and not when the screen is reopened.
 */
export function aldenNewsToday(
  events: readonly MemoryEvent[],
  clock: WorldClock,
  count = ALDEN_NEWS_PER_DAY,
): PlayerNews[] {
  return playerNewsday({
    state: readWorldLife(events, clock),
    kinds: WORLD_LIFE_RULES.kinds,
    signals: ALDEN_SIGNALS,
    noise: ALDEN_NOISE,
    count,
    day: toAbsoluteDay(clock),
  });
}

/**
 * The same day, with everything the author is allowed to see.
 *
 * For GOD VIEW and for tests. No screen calls this, and the return type
 * is the reason: a `NewsItem` carries the fields a `PlayerNews` cannot.
 */
export function aldenNewsTodayForAuthor(
  events: readonly MemoryEvent[],
  clock: WorldClock,
  count = ALDEN_NEWS_PER_DAY,
): NewsItem[] {
  return newsday({
    state: readWorldLife(events, clock),
    kinds: WORLD_LIFE_RULES.kinds,
    signals: ALDEN_SIGNALS,
    noise: ALDEN_NOISE,
    count,
    day: toAbsoluteDay(clock),
  });
}
