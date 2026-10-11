import { useState } from "react";
import type { World } from "@mugen/core/world/world";
import { HERO_SPEAKER } from "@mugen/content/story/sekiryugaArc";
import { kaosFaceOf } from "@mugen/content/characters/kaosFaces";
import { banterMark, type KaosBanter } from "@mugen/content/story/kaosBanter";
import { NewBadge } from "./common/NewBadge";
import { TalkStage, stageAt } from "./talkStage";

/**
 * 主人公×ケイオス — ONE SHORT EXCHANGE, at the top of the page (作者指示
 * 2026-10-11): the same small box as her word on the map, NEW while it is
 * told (each is said once), the two of them side by side over the painting
 * with her face on each of her lines (ui/talkStage), read with
 * 「つぎへ」. It stops nothing. Read to its end, it is heard for good.
 */
export function BanterAside({
  world,
  banter,
}: {
  world: World;
  banter: KaosBanter;
}) {
  const [at, setAt] = useState(0);
  const [done, setDone] = useState(false);
  if (done || world.isRead(banterMark(banter.id))) return null;
  const line = banter.lines[Math.min(at, banter.lines.length - 1)];
  const last = at >= banter.lines.length - 1;
  const speaker =
    line.speaker === HERO_SPEAKER ? world.getHeroName() : line.speaker;
  const face = kaosFaceOf(line);
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setDone(true);
    void world.markRead([banterMark(banter.id)]).catch(() => {});
  };
  return (
    <TalkStage
      {...stageAt(banter.lines, at)}
      box={
        <div
          className="kaos-aside daily-aside banter-aside"
          data-testid="kaos-banter"
          data-banter={banter.id}
          data-kaos-face={face ?? ""}
        >
          <div className="kaos-aside-head">
            {speaker && <p className="kaos-aside-speaker">{speaker}</p>}
            <NewBadge testId="kaos-banter-new" />
          </div>
          <p className="kaos-aside-line" data-testid="kaos-banter-line">
            「{line.text}」
          </p>
          <button
            className="kaos-aside-next"
            data-testid="kaos-banter-next"
            onClick={next}
          >
            {last ? "とじる" : "つぎへ"}
          </button>
        </div>
      }
    />
  );
}
