import { useState } from 'react';
import type { World } from '@mugen/core/world/world';
import { HERO_SPEAKER } from '@mugen/content/story/sekiryugaArc';
import { INCIDENT_KAOS_TALKS, incidentKaosMark, incidentKaosOwed } from '@mugen/content/story/aldenIncident';

/**
 * ALDEN INCIDENT — KAOS SENSES SOMETHING (予兆フェーズ, 2026-10-10).
 *
 * As they set out (the region map), once per phase reached: a few lines
 * between her and the hero in a small box at the foot of the page, read
 * with 「つぎへ」. It stops nothing — every way on the map stays where it
 * was — and it is heard when read to its end (readMarks
 * `talk:INCIDENT_KAOS_<phase>`); left half-read, it is there next time.
 * One phase at a time: the lowest reached and not yet heard.
 */
export function KaosAside({ world }: { world: World }) {
  const owed = incidentKaosOwed(world.getIncidentPhase(), (m) => world.isRead(m));
  const [at, setAt] = useState(0);
  const [heard, setHeard] = useState<number | null>(null);
  if (owed === null || heard === owed) return null;
  const lines = INCIDENT_KAOS_TALKS[owed];
  const line = lines[Math.min(at, lines.length - 1)];
  const last = at >= lines.length - 1;
  const speaker = line.speaker === HERO_SPEAKER ? world.getHeroName() : line.speaker;
  const next = () => {
    if (!last) return setAt((n) => n + 1);
    setHeard(owed);
    setAt(0);
    void world.markRead([incidentKaosMark(owed)]).catch(() => {});
  };
  return (
    <div className="kaos-aside" data-testid="kaos-aside" data-phase={owed}>
      <p className="kaos-aside-speaker">{speaker}</p>
      <p className="kaos-aside-line" data-testid="kaos-aside-line">
        「{line.text}」
      </p>
      <button className="kaos-aside-next" data-testid="kaos-aside-next" onClick={next}>
        {last ? 'とじる' : 'つぎへ'}
      </button>
    </div>
  );
}
