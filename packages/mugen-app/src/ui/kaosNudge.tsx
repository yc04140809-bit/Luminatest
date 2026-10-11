import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { kaosFaceOf } from '@mugen/content/characters/kaosFaces';
import { GRAVE_CRAFTS } from '@mugen/content/economy/graveCraft';
import { hasMetGrave } from '@mugen/content/talk/graveTalks';
import { nudgeFor, settingOutTalkFor, type KaosNudge, type NudgeFacts } from '@mugen/content/story/kaosNudges';
import { banterMark } from '@mugen/content/story/kaosBanter';
import { toAbsoluteDay } from '@mugen/core/time/calendar';
import { TalkStage, stageAt } from './talkStage';

/**
 * ケイオスの軽い誘い (襲撃前の日々, 2026-10-11): as they come back into the
 * village and nothing else is said — no small happening, no news, no short
 * exchange — now and then (at most once a day) one word from her about what
 * could be done today (content/story/kaosNudges.ts). The two of them side by
 * side, her line under them. No NEW (a word in passing), and nothing written.
 */

/**
 * WHAT THE TWO OF THEM REMEMBER OF TODAY (状況別の会話, 2026-10-11): the
 * lines said lately (not again soon), whether a word was had as they set
 * out / came back today (once each a day), how many times they have come
 * back today (a long day), a golden find on the way out, a close call, the
 * days they were at the tavern. Held by the App for the session; nothing
 * is saved.
 */
export interface TalkMemo {
  recent: string[];
  outDay: number;
  homeDay: number;
  back: { day: number; n: number };
  lucky: boolean;
  reckless: boolean;
  tavernDays: number[];
}

export const newTalkMemo = (): TalkMemo => ({
  recent: [],
  outDay: -1,
  homeDay: -1,
  back: { day: -1, n: 0 },
  lucky: false,
  reckless: false,
  tavernDays: [],
});

/** How many lines back count as "lately". */
const RECENT = 8;
const said = (memo: TalkMemo, id: string) => {
  memo.recent = [...memo.recent.filter((x) => x !== id), id].slice(-RECENT);
};
const today = (world: World) => toAbsoluteDay(world.getClock());

/** The shared HP bar and MP pool, as shares of their most. */
function condition(world: World): { hp: number; mp: number } {
  const party = world.getPartyCondition();
  const hero = party.hero;
  const mpHolder = party.kaos ?? hero;
  return {
    hp: hero && hero.maxHp > 0 ? hero.currentHp / hero.maxHp : 1,
    mp: mpHolder && mpHolder.maxMp > 0 ? mpHolder.currentMp / mpHolder.maxMp : 1,
  };
}

/** What is true today, for her word. */
export function nudgeFactsOf(world: World, memo: TalkMemo = newTalkMemo()): NudgeFacts {
  const met = hasMetGrave((id) => world.isRead(id), world.getSekiryugaStage());
  const { hp, mp } = condition(world);
  const day = today(world);
  return {
    phase: world.getIncidentPhase(),
    forestRegrown: world.hasRegrownPickup(),
    canCraft:
      met &&
      GRAVE_CRAFTS.some(
        (c) => !(c.once && world.getItemCount(c.get.itemId) > 0) && c.give.every((l) => world.getItemCount(l.itemId) >= l.quantity),
      ),
    shopWaiting: world.getDailyScene('SHOP') !== null,
    bakeryWaiting: world.getDailyScene('BAKERY_OWNER') !== null || world.getDailyScene('BAKERY_LINA') !== null,
    tavernWaiting: world.getDailyScene('TAVERN') !== null,
    hurt: hp <= 0.4,
    lowMp: mp <= 0.3,
    poor: world.getLumi() < 30,
    late: memo.back.day === day && memo.back.n >= 3,
    lucky: memo.lucky,
    reckless: memo.reckless,
    tavernYesterday: memo.tavernDays.includes(day - 1) && !memo.tavernDays.includes(day),
  };
}

/**
 * The roll. In the real game, chance; in DEV none unless a test asks
 * (`window.__mugenNudgeRoll`), as with the short exchanges.
 */
export function nudgeRoll(): number {
  if (import.meta.env.DEV) {
    const v = (window as unknown as { __mugenNudgeRoll?: number }).__mugenNudgeRoll;
    return typeof v === 'number' ? v : 1;
  }
  return Math.random();
}

export function pickNudge(world: World, last: string | null): KaosNudge | null {
  return nudgeFor(nudgeFactsOf(world), nudgeRoll(), last);
}

/**
 * Coming back into the village: counted (a long day), then her word —
 * at most once a day, nothing said lately. The way out's lucky find and
 * close call are spent either way.
 */
export function homecomingTalk(world: World, memo: TalkMemo, mayTalk: boolean): KaosNudge | null {
  const day = today(world);
  memo.back = memo.back.day === day ? { day, n: memo.back.n + 1 } : { day, n: 1 };
  let talk: KaosNudge | null = null;
  if (mayTalk && memo.homeDay !== day) {
    talk = nudgeFor(nudgeFactsOf(world, memo), nudgeRoll(), memo.recent);
    if (talk) {
      memo.homeDay = day;
      said(memo, talk.id);
    }
  }
  memo.lucky = false;
  memo.reckless = false;
  return talk;
}

/**
 * Setting out (the region map): her word — hurt, low on magic, which way —
 * once a day. Only asks: what was said is noted when it is shown
 * (`settingOutSaid`), so asking twice (React's development double call)
 * changes nothing.
 */
export function settingOutTalk(world: World, memo: TalkMemo): KaosNudge | null {
  if (memo.outDay === today(world)) return null;
  return settingOutTalkFor(nudgeFactsOf(world, memo), nudgeRoll(), memo.recent, world.isRead(banterMark('WHICH_WAY')));
}

/** Her word as they set out was shown: not again today, not again soon. */
export function settingOutSaid(world: World, memo: TalkMemo, talk: KaosNudge): void {
  memo.outDay = today(world);
  said(memo, talk.id);
}

export function NudgeAside({ world, nudge, onDone }: { world: World; nudge: KaosNudge; onDone: () => void }) {
  const [at, setAt] = useState(0);
  const line = nudge.lines[Math.min(at, nudge.lines.length - 1)];
  const last = at >= nudge.lines.length - 1;
  const speaker = line.speaker === HERO_SPEAKER ? world.getHeroName() : line.speaker;
  const face = kaosFaceOf(line);
  return (
    <TalkStage
      {...stageAt(nudge.lines, at)}
      box={
        <div className="kaos-aside daily-aside nudge-aside" data-testid="kaos-nudge" data-nudge={nudge.id} data-kaos-face={face ?? ''}>
          <div className="kaos-aside-head">{speaker && <p className="kaos-aside-speaker">{speaker}</p>}</div>
          <p className="kaos-aside-line" data-testid="kaos-nudge-line">
            「{line.text}」
          </p>
          <button className="kaos-aside-next" data-testid="kaos-nudge-next" onClick={() => (last ? onDone() : setAt((n) => n + 1))}>
            {last ? 'とじる' : 'つぎへ'}
          </button>
        </div>
      }
    />
  );
}
