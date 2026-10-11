import { useEffect, useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { kaosFaceOf, type KaosFace } from '@mugen/content/characters/kaosFaces';
import { banterMark, type KaosBanter } from '@mugen/content/story/kaosBanter';
import { kaosFaceSrc } from '../assets/kaosFaces';
import { NewBadge } from './common/NewBadge';

/** Her face beside her line, once its picture (or the nearest) is delivered; nothing until then. */
export function KaosFace({ face }: { face: KaosFace | null }) {
  const [src, setSrc] = useState<{ face: KaosFace; src: string | null } | null>(null);
  useEffect(() => {
    if (!face) return;
    let gone = false;
    void kaosFaceSrc(face).then((s) => !gone && setSrc({ face, src: s }));
    return () => {
      gone = true;
    };
  }, [face]);
  if (!face || !src || src.face !== face || !src.src) return null;
  return <img className="daily-face kaos-face" src={src.src} alt="ケイオス" data-testid="kaos-face" data-face={face} />;
}

/**
 * 主人公×ケイオス — ONE SHORT EXCHANGE, at the top of the page (作者指示
 * 2026-10-11): the same small box as her word on the map, NEW while it is
 * told (each is said once), her face beside each of her lines, read with
 * 「つぎへ」. It stops nothing. Read to its end, it is heard for good.
 */
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
      <KaosFace face={face} />
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
