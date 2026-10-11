import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import type { DailyScene } from '@mugen/content/story/dailyScenes';
import { dailyFaceFor } from '../assets/dailyFaces';
import { NewBadge } from './common/NewBadge';
import { kaosFaceOf, type KaosFace } from '@mugen/content/characters/kaosFaces';
import { TalkStage } from './talkStage';

/**
 * 襲撃前の日常 — A SMALL THING IN THE VILLAGE, as they come back into it
 * (content/story/dailyScenes.ts). The same small box as Kaos's word on the
 * region map, at the TOP of the square under the title and marked NEW until
 * read (2026-10-11: at the foot it went unnoticed), read with 「つぎへ」. Not a button
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
  // A face beside the line, once one is delivered for whoever speaks (assets/dailyFaces.ts).
  const face = dailyFaceFor(line.speaker);
  // Only the two of them (and narration): they stand side by side while it is told (ui/talkStage).
  const twoOfThem = scene.lines.every((l) => l.speaker === null || l.speaker === HERO_SPEAKER || l.speaker === 'ケイオス');
  const kaosFace = kaosFaceOf(line);
  // The hero or narration speaking: she keeps the look she last had.
  let shownFace: KaosFace = kaosFace ?? 'NORMAL';
  for (let i = at; !kaosFace && i >= 0; i--) {
    const f = kaosFaceOf(scene.lines[i]);
    if (f) {
      shownFace = f;
      break;
    }
  }
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setDone(true);
    void world.finishDailyScene(scene.id).catch(() => {});
  };
  return (
    <div className="kaos-aside daily-aside" data-testid="daily-scene" data-scene={scene.id}>
      {twoOfThem && (
        <TalkStage speaking={line.speaker === HERO_SPEAKER ? 'HERO' : kaosFace ? 'KAOS' : null} kaosFace={shownFace} />
      )}
      {face && <img className="daily-face" src={face} alt={speaker ?? ''} data-testid="daily-face" />}
      <div className="kaos-aside-head">
        {speaker && <p className="kaos-aside-speaker">{speaker}</p>}
        <NewBadge testId="daily-new" />
      </div>
      <p className="kaos-aside-line" data-testid="daily-line">
        {speaker ? `「${line.text}」` : line.text}
      </p>
      <button className="kaos-aside-next" data-testid="daily-next" onClick={next}>
        {last ? 'とじる' : 'つぎへ'}
      </button>
    </div>
  );
}
