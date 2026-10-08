// KAOS'S SKILL — what is drawn. Debug preview only.
//
// Her スキル as the author's motion test plays it, rebuilt as a part the
// battle screen plays through its field-scene joint (ui/battle/scene/
// fieldScene.ts), in the same kind of drawing as Levi's and Aria's:
//
//   she steps in where he stood, casting (kaos-cast.png, as delivered) →
//   双極臨界: the circle in her hand lights, a seal of gold rays round a
//   blue ring closes on the creature, a great arc crosses the field and
//   gold and blue motes drift between them → 界核崩壊: the field goes dark,
//   the seal falls inward into a turning core with a diamond round it →
//   it breaks in a burst of light, the creature struck → she goes, he is back.
//
// DRAWING ONLY. No number and no health taken — like Levi's and Aria's, it
// is joined to no skill of the game's, and what it would do is not decided
// here. The two half-names are the motion test's, shown in its corner chip.
//
// Everything is placed off the drawings, measured when it starts.

import type { CSSProperties } from 'react';
import kaosCast from '@mugen/assets/files/characters/kaos/kaos-cast.png';
import type { FieldBox, FieldMarks } from '../../ui/battle/scene/fieldScene';
import { KAOS_PHASE_NAMES, type KaosPlan } from './kaosTiming';
import './kaos.css';

export type KaosStep = 'enter' | 'critical' | 'collapse' | 'burst' | 'recover';

// Where things are in kaos-cast.png (1103×1426): the circle in her hand,
// the middle of her body, and her feet — for standing her in his place.
const ART_ASPECT = 1103 / 1426;
const ART_CIRCLE = { x: 0.17, y: 0.29 };
const ART_BODY_X = 0.56;
const ART_FEET_Y = 0.985;

const px = (n: number) => `${Math.round(n)}px`;

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}
const inPixels = (b: FieldBox, marks: FieldMarks): Box => ({
  left: b.left * marks.stage.width,
  top: b.top * marks.stage.height,
  width: b.width * marks.stage.width,
  height: b.height * marks.stage.height,
});

/** Where she stands, where her circle is, where the seal closes — in field pixels. */
export function kaosGeometry(marks: FieldMarks) {
  const W = marks.stage.width;
  const H = marks.stage.height;
  const hero = inPixels(marks.hero, marks);
  const enemy = inPixels(marks.enemy, marks);
  const heroMid = hero.left + hero.width / 2;
  const heroFeet = hero.top + hero.height;
  // A little taller than his drawing, never off the top, and her circle
  // short of the creature.
  let height = Math.min(hero.height * 1.25, heroFeet - 4);
  let width = height * ART_ASPECT;
  const circleNoCloserThan = enemy.left + enemy.width + W * 0.06;
  if (heroMid - width * (ART_BODY_X - ART_CIRCLE.x) < circleNoCloserThan) {
    width = (heroMid - circleNoCloserThan) / (ART_BODY_X - ART_CIRCLE.x);
    height = width / ART_ASPECT;
  }
  const left = heroMid - width * ART_BODY_X;
  const top = heroFeet - height * ART_FEET_Y;
  const target = { x: enemy.left + enemy.width / 2, y: enemy.top + enemy.height * 0.55 };
  const circle = { x: left + width * ART_CIRCLE.x, y: top + height * ART_CIRCLE.y };
  return {
    kaos: { left, top, width, height },
    circle,
    circleSize: width * 0.36,
    target,
    // The seal is a little larger than the creature, but never off the field.
    seal: Math.min(Math.max(enemy.height, enemy.width) * 1.95, H * 0.72, W * 0.38),
    // The great arc: a ring between the two of them, much of it off the field.
    arc: { x: (target.x + circle.x) / 2, y: H * 0.5, size: Math.max(W, H) * 0.95 },
    from: circle,
  };
}

/** Her, on the field where he stood. */
export function KaosFigure({ marks, step, plan }: { marks: FieldMarks; step: KaosStep; plan: KaosPlan }) {
  const g = kaosGeometry(marks);
  const style = {
    left: px(g.kaos.left),
    top: px(g.kaos.top),
    width: px(g.kaos.width),
    height: px(g.kaos.height),
    '--ks-enter': `${plan.ms.ENTER}ms`,
    '--ks-recover': `${plan.ms.RECOVER}ms`,
  } as CSSProperties;
  return (
    <div className="ks-kaos" data-testid="kaos-figure" data-step={step} style={style} aria-hidden="true">
      <span className="ks-shadow" />
      <img className="ks-art" src={kaosCast} alt="" draggable={false} data-testid="kaos-art" />
      <span
        className="ks-circle-glow"
        style={{ left: `${ART_CIRCLE.x * 100}%`, top: `${ART_CIRCLE.y * 100}%`, width: px(g.circleSize), height: px(g.circleSize) }}
      />
    </div>
  );
}

// Motes drifting from her circle toward the creature: a fixed scatter, so
// every playing is the same.
const MOTES = Array.from({ length: 22 }, (_, i) => ({
  along: ((i * 37) % 100) / 100,
  off: (((i * 53) % 100) / 100 - 0.5) * 2,
  size: 6 + ((i * 7) % 6),
  hue: i % 3,
  delay: ((i * 29) % 100) / 100,
}));
const STREAKS = 14;

/** The seal, the arc, the motes, the core and the burst — over the field. */
export function KaosOver({ marks, step, plan }: { marks: FieldMarks; step: KaosStep; plan: KaosPlan }) {
  const g = kaosGeometry(marks);
  const style = {
    '--ks-critical': `${plan.ms.CRITICAL}ms`,
    '--ks-collapse': `${plan.ms.COLLAPSE}ms`,
    '--ks-burst': `${plan.ms.BURST}ms`,
    '--ks-recover': `${plan.ms.RECOVER}ms`,
  } as CSSProperties;
  const phase = step === 'critical' || step === 'enter' ? 'critical' : step === 'recover' ? null : 'collapse';
  const dx = g.target.x - g.from.x;
  const dy = g.target.y - g.from.y;
  return (
    <div className="ks-over" data-step={step} style={style} aria-hidden="true">
      <span className="ks-veil" />
      {phase && (
        <span className="ks-phase" data-testid="kaos-phase" data-phase={phase}>
          {KAOS_PHASE_NAMES[phase]}
        </span>
      )}
      {step === 'critical' && (
        <>
          <span
            className="ks-arc"
            data-testid="kaos-arc"
            style={{ left: px(g.arc.x), top: px(g.arc.y), width: px(g.arc.size), height: px(g.arc.size) }}
          />
          <span className="ks-motes" data-testid="kaos-motes">
            {MOTES.map((m, i) => (
              <i
                key={i}
                data-hue={m.hue}
                style={
                  {
                    left: px(g.from.x + dx * m.along),
                    top: px(g.from.y + dy * m.along + m.off * 70),
                    width: px(m.size),
                    height: px(m.size),
                    '--ks-delay': m.delay,
                  } as CSSProperties
                }
              />
            ))}
          </span>
        </>
      )}
      {(step === 'critical' || step === 'collapse') && (
        <span
          className="ks-seal"
          data-testid="kaos-seal"
          data-step={step}
          style={{ left: px(g.target.x), top: px(g.target.y), width: px(g.seal), height: px(g.seal) }}
        >
          <i className="ks-rays" />
          <i className="ks-ring" />
          <i className="ks-grid" />
        </span>
      )}
      {step === 'collapse' && (
        <span
          className="ks-core"
          data-testid="kaos-core"
          style={{ left: px(g.target.x), top: px(g.target.y), width: px(g.seal * 0.92), height: px(g.seal * 0.92) }}
        >
          <i className="ks-vortex" />
          <i className="ks-diamond" />
          <i className="ks-gold" />
        </span>
      )}
      {step === 'burst' && (
        <span
          className="ks-burst"
          data-testid="kaos-burst"
          style={{ left: px(g.target.x), top: px(g.target.y), width: px(g.seal * 1.6), height: px(g.seal * 1.6) }}
        >
          {Array.from({ length: STREAKS }, (_, i) => (
            <i key={i} style={{ '--ks-turn': `${(360 / STREAKS) * i + (i % 2) * 9}deg` } as CSSProperties} />
          ))}
          <b className="ks-flash" />
        </span>
      )}
    </div>
  );
}
