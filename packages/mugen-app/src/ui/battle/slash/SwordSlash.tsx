// HIS SWORD, SEEN — the trail of a swing and the bite where it lands.
//
// v18's normal attack, rebuilt for the App's battle screen: a wide
// crescent of light swept through the creature as the blade passes
// (v18 `.sword-arc`), and at the moment it arrives a flare, a ring and
// one bright cut across it (v18 `.hit-effect`). An ordinary swing's
// worth — no veil, no screen flash, nothing held: it is over in the time
// the swing takes, so it reads as a sword and never as a skill.
//
// Drawn inside the creature's own place on the field, so the camera's
// push and the creature's flinch carry it with them; the damage number
// (HitFx) stays above it and the HUD stays above both. It decides
// nothing and draws no number: the number is the core's, as before.

import type { CSSProperties } from 'react';
import './slash.css';

export interface SlashView {
  /** New for every swing, so each draws its own trail. */
  id: number;
  arcMs: number;
  biteMs: number;
  /** When, from the start of the swing, the blade arrives. */
  biteAt: number;
}

export function SwordSlash({ slash }: { slash: SlashView }) {
  const style = {
    '--slash-arc': `${slash.arcMs}ms`,
    '--slash-bite': `${slash.biteMs}ms`,
    '--slash-at': `${slash.biteAt}ms`,
  } as CSSProperties;
  return (
    <span key={slash.id} className="sw" data-testid="sword-slash" style={style} aria-hidden="true">
      <span className="sw-arc" />
      <span className="sw-bite">
        <span className="sw-flare" />
        <span className="sw-ring" />
        <span className="sw-cut" />
      </span>
    </span>
  );
}
