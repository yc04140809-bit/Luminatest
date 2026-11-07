import type { World } from '@mugen/core/world/world';
import { itemDef } from '@mugen/content/economy/itemDefs';
import { BAKERY_LINA_FIRST_MARK, ownerNoticeFor } from '@mugen/content/dialogue/bakeryTalk';

/**
 * NEW FOR EVERY TALK THAT IS NOT THE ORDINARY ONE (作者 2026-10-11:
 * 「いつもの会話じゃない場面は絶対new付けて」).
 *
 * What a place has waiting that is not its everyday line — a first meeting,
 * a small thing happening today (襲撃前の日常), a word on what is carried,
 * the route's rumour not yet heard — asked of the same facts each screen
 * asks when it decides what to say. The village's doors carry it (NEW on
 * 酒場／パン屋／道具屋), and inside, the 「話す」 and the line itself. It
 * stops being NEW when the talk is read, as every NEW does.
 * (The tavern's is its own: ui/tavern.tsx `tavernHasNews`.)
 */

type Talker = Pick<World, 'isRead' | 'getDailyScene' | 'getItemCount' | 'getInventory' | 'getSekiryugaStage' | 'isSekiryugaArcOpen'>;

/** The route's rumour, not heard yet anywhere (each of the three would say it). */
export function rumorUnheard(world: Talker): boolean {
  return world.isSekiryugaArcOpen() && world.getSekiryugaStage() === 'NONE';
}

/** アルデン道具屋: today's small thing over the counter, or her rumour. */
export function shopHasNews(world: Talker): boolean {
  return rumorUnheard(world) || world.getDailyScene('SHOP') !== null;
}

/** パン屋, リナ: her first meeting, or today's small thing. */
export function linaHasNews(world: Talker): boolean {
  return !world.isRead(BAKERY_LINA_FIRST_MARK) || world.getDailyScene('BAKERY_LINA') !== null;
}

/** パン屋, the owner: a word on what is carried, his rumour, or today's small thing. */
export function ownerHasNews(world: Talker): boolean {
  const carried = {
    held: (id: string) => world.getItemCount(id),
    tagged: (tag: string) =>
      world.getInventory().some((s) => s.quantity > 0 && (itemDef(s.itemId)?.ingredientTags ?? []).some((t) => t === tag)),
  };
  return (
    ownerNoticeFor(carried, (m) => world.isRead(m)) !== null ||
    rumorUnheard(world) ||
    world.getDailyScene('BAKERY_OWNER') !== null
  );
}

export function bakeryHasNews(world: Talker): boolean {
  return linaHasNews(world) || ownerHasNews(world);
}
