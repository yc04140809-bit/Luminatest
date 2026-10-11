import { useState } from "react";
import type { World } from "@mugen/core/world/world";
import { HERO_SPEAKER } from "@mugen/content/story/sekiryugaArc";
import {
  INCIDENT_KAOS_TALKS,
  incidentKaosMark,
  incidentKaosOwed,
} from "@mugen/content/story/aldenIncident";
import { NewBadge } from "./common/NewBadge";
import { kaosFaceOf } from "@mugen/content/characters/kaosFaces";
import { TalkStage, stageAt } from "./talkStage";
import { BanterAside } from "./kaosBanter";
import { banterFor } from "./banterRoll";

/**
 * ALDEN INCIDENT — KAOS SENSES SOMETHING (予兆フェーズ, 2026-10-10).
 *
 * As they set out (the region map), once per phase reached: a few lines
 * between her and the hero in a small box at the TOP of the page, under the
 * title and over every way on, marked NEW until heard (2026-10-11: at the
 * foot it went unnoticed), read
 * with 「つぎへ」. It stops nothing — every way on the map stays where it
 * was — and it is heard when read to its end (readMarks
 * `talk:INCIDENT_KAOS_<phase>`); left half-read, it is there next time.
 * One phase at a time: the lowest reached and not yet heard — and one per
 * setting out (the next waits for the next time they head out).
 */
export function KaosAside({ world }: { world: World }) {
  const owed = incidentKaosOwed(world.getIncidentPhase(), (m) =>
    world.isRead(m),
  );
  const [at, setAt] = useState(0);
  const [heard, setHeard] = useState<number | null>(null);
  // Nothing of the story owed: now and then, one of their short exchanges (decided once, as they set out).
  const [banter] = useState(() =>
    owed === null ? banterFor(world, "SETTING_OUT") : null,
  );
  if (owed === null && heard === null)
    return banter ? <BanterAside world={world} banter={banter} /> : null;
  // One word per setting out: once one is heard, the next waits for the next time.
  if (owed === null || heard !== null) return null;
  const lines = INCIDENT_KAOS_TALKS[owed];
  const line = lines[Math.min(at, lines.length - 1)];
  const last = at >= lines.length - 1;
  const speaker =
    line.speaker === HERO_SPEAKER ? world.getHeroName() : line.speaker;
  const face = kaosFaceOf(line);
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setHeard(owed);
    setAt(0);
    void world.markRead([incidentKaosMark(owed)]).catch(() => {});
  };
  // The two of them side by side over the painting while she talks, her words under them (ui/talkStage).
  return (
    <TalkStage
      {...stageAt(lines, at)}
      box={
        <div
          className="kaos-aside incident-aside"
          data-testid="kaos-aside"
          data-phase={owed}
          data-kaos-face={face ?? ""}
        >
          <div className="kaos-aside-head">
            <p className="kaos-aside-speaker">{speaker}</p>
            <NewBadge testId="kaos-aside-new" />
          </div>
          <p className="kaos-aside-line" data-testid="kaos-aside-line">
            「{line.text}」
          </p>
          <button
            className="kaos-aside-next"
            data-testid="kaos-aside-next"
            onClick={next}
          >
            {last ? "とじる" : "つぎへ"}
          </button>
        </div>
      }
    />
  );
}
