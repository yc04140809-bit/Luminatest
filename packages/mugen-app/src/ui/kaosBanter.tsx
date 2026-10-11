import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { kaosFaceOf, type KaosFace } from '@mugen/content/characters/kaosFaces';
import { banterMark, type KaosBanter } from '@mugen/content/story/kaosBanter';
import { NewBadge } from './common/NewBadge';
import { TalkStage } from './talkStage';

/**
 * 主人公×ケイオス — ONE SHORT EXCHANGE, at the top of the page (作者指示
 * 2026-10-11): the same small box as her word on the map, NEW while it is
 * told (each is said once), the two of them side by side over the painting
 * with her face on each of her lines (ui/talkStage), read with
 * 「つぎへ」. It stops nothing. Read to its end, it is heard for good.
 */
/** Her face as it last was before this line (the hero speaking: she keeps her look). */
function lastFace(banter: KaosBanter, at: number): KaosFace {
  for (let i = at; i >= 0; i--) {
    const f = kaosFaceOf(banter.lines[i]);
    if (f) return f;
  }
  return kaosFaceOf(banter.lines.find((l) => l.speaker === 'ケイオス') ?? { speaker: null }) ?? 'NORMAL';
}

export function BanterAside({ world, banter }: { world: World; banter: KaosBanter }) {
  const [at, setAt] = useState(0);
  const [done, setDone] = useState(false);
  if (done || world.isRead(banterMark(banter.id))) return null;
  const line = banter.lines[Math.min(at, banter.lines.length - 1)];
  const last = at >= banter.lines.length - 1;
  const speaker = line.speaker === HERO_SPEAKER ? world.getHeroName() : line.speaker;
  const face = kaosFaceOf(line);
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setDone(true);
    void world.markRead([banterMark(banter.id)]).catch(() => {});
  };
  return (
    <div
      className="kaos-aside daily-aside banter-aside"
      data-testid="kaos-banter"
      data-banter={banter.id}
      data-kaos-face={face ?? ''}
    >
      <TalkStage speaking={line.speaker === HERO_SPEAKER ? 'HERO' : face ? 'KAOS' : null} kaosFace={face ?? lastFace(banter, at)} />
      <div className="kaos-aside-head">
        {speaker && <p className="kaos-aside-speaker">{speaker}</p>}
        <NewBadge testId="kaos-banter-new" />
      </div>
      <p className="kaos-aside-line" data-testid="kaos-banter-line">
        「{line.text}」
      </p>
      <button className="kaos-aside-next" data-testid="kaos-banter-next" onClick={next}>
        {last ? 'とじる' : 'つぎへ'}
      </button>
    </div>
  );
}
