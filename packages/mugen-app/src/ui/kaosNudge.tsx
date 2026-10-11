import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { kaosFaceOf } from '@mugen/content/characters/kaosFaces';
import { GRAVE_CRAFTS } from '@mugen/content/economy/graveCraft';
import { hasMetGrave } from '@mugen/content/talk/graveTalks';
import { nudgeFor, type KaosNudge, type NudgeFacts } from '@mugen/content/story/kaosNudges';
import { TalkStage, stageAt } from './talkStage';

/**
 * ケイオスの軽い誘い (襲撃前の日々, 2026-10-11): as they come back into the
 * village and nothing else is said — no small happening, no news, no short
 * exchange — now and then (at most once a day) one word from her about what
 * could be done today (content/story/kaosNudges.ts). The two of them side by
 * side, her line under them. No NEW (a word in passing), and nothing written.
 */

/** What is true today, for her word. */
export function nudgeFactsOf(world: World): NudgeFacts {
  const met = hasMetGrave((id) => world.isRead(id), world.getSekiryugaStage());
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
