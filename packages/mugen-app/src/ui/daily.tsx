import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import type { DailyScene } from '@mugen/content/story/dailyScenes';

/**
 * 襲撃前の日常 — A SMALL THING IN THE VILLAGE, as they come back into it
 * (content/story/dailyScenes.ts). The same small box as Kaos's word on the
 * region map, at the foot of the square, read with 「つぎへ」. Not a button
 * and not a list: it is there when it happens, and gone once read. It stops
 * nothing — every door on the square stays where it was — and it is seen
 * when read to its end; left half way, it is there next time.
 */
export function DailyAside({ world, scene }: { world: World; scene: DailyScene }) {
  const [at, setAt] = useState(0);
  const [done, setDone] = useState(false);
  if (done) return null;
  const line = scene.lines[Math.min(at, scene.lines.length - 1)];
  const last = at >= scene.lines.length - 1;
  const speaker = line.speaker === HERO_SPEAKER ? world.getHeroName() : line.speaker;
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setDone(true);
    void world.finishDailyScene(scene.id).catch(() => {});
  };
  return (
    <div className="kaos-aside daily-aside" data-testid="daily-scene" data-scene={scene.id}>
      {speaker && <p className="kaos-aside-speaker">{speaker}</p>}
      <p className="kaos-aside-line" data-testid="daily-line">
        {speaker ? `「${line.text}」` : line.text}
      </p>
      <button className="kaos-aside-next" data-testid="daily-next" onClick={next}>
        {last ? 'とじる' : 'つぎへ'}
      </button>
    </div>
  );
}
