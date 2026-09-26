// WHAT A SPELL LOOKS LIKE WHILE IT HAPPENS — her aura, and its landing.
//
// Drawn in the battle screen's effects layer (battle.layers.css: over the
// people and the HUD, under a cut-in and a choice panel). Draws only; it
// is told where she stands, where the spell lands, which step it is at
// and for how long, and it is gone from the page when the spell is over.
//
// The look is v18's 双極崩界, rebuilt in CSS (spellfx.css): the gold-and-
// blue sigil rings and motes round the caster, and a landing that happens
// AT the target rather than a ball thrown at it — scaled down for the
// bolt, scaled up for the comet, and turned gentle for the three that do
// not hurt: a rising light for mending, a membrane for the shield, a
// drifting star-mist for the haze.

import type { CSSProperties } from 'react';
import type { SpellKind } from './spellShow';
import './spellfx.css';

export interface SpellFxView {
  /** Changes with every spell, so a second cast starts its own drawing. */
  id: number;
  kind: SpellKind;
  /** Where it lands (spellShow.ts). */
  lands: 'enemy' | 'party';
  phase: 'channel' | 'impact';
  /** How long this step lasts — the CSS reads it. */
  ms: number;
}

interface Point {
  x: number;
  y: number;
}

const at = (p: Point): CSSProperties => ({ left: `${p.x * 100}%`, top: `${(1 - p.y) * 100}%` });

export function SpellFx({ spell, caster, target }: { spell: SpellFxView; caster: Point; target: Point }) {
  const style = { '--fx-step': `${spell.ms}ms` } as CSSProperties;
  return (
    <div
      className="sfx"
      data-testid="spell-fx"
      data-kind={spell.kind}
      data-phase={spell.phase}
      style={style}
      aria-hidden="true"
    >
      {spell.phase === 'channel' ? (
        <div key={`aura-${spell.id}`} className="sfx-aura" data-testid="spell-aura" style={at(caster)}>
          <span className="sfx-aura-domain" />
          <span className="sfx-aura-field" />
          <span className="sfx-aura-sigil sfx-aura-sigil-outer" />
          <span className="sfx-aura-sigil sfx-aura-sigil-inner" />
          <span className="sfx-aura-ring sfx-aura-ring-gold" />
          <span className="sfx-aura-ring sfx-aura-ring-blue" />
          <span className="sfx-aura-motes">
            {Array.from({ length: 12 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </div>
      ) : (
        <div
          key={`land-${spell.id}`}
          className={`sfx-land sfx-${spell.kind.toLowerCase()}`}
          data-testid="spell-landing"
          style={at(target)}
        >
          <span className="sfx-glow" />
          <span className="sfx-ring" />
          <span className="sfx-ring sfx-ring-two" />
          <span className="sfx-core" />
          <span className="sfx-cross" />
          <span className="sfx-column" />
          <span className="sfx-sparks">
            {Array.from({ length: 10 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
        </div>
      )}
    </div>
  );
}
