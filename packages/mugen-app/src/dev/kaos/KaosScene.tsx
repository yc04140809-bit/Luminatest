// KAOS'S 双極崩界 (v19) — what is drawn. Debug preview only.
//
// The author's v19 prototype (KAOS_ULTIMATE_V19_HANDOFF.md, its index.html
// and styles.css), rebuilt as a part the battle screen plays through its
// field-scene joint (ui/battle/scene/fieldScene.ts), in the same kind of
// drawing as Levi's and Aria's:
//
//   she steps in where he stood (kaos-cast.png, as delivered) → 双極臨界: the
//   gold-and-blue aura round her — domain, two sigils, field, two rings, the
//   cross, motes → the working fixed on the creature: compression rays, the
//   seal, the eclipse ring; her aura charged, its pillar up → 界核崩壊: the
//   dark, the void core drawn to a point, a white-gold flash across the
//   screen, the blast disc and corona from the creature's centre, the cross
//   and the pillar, five shockwaves, the rupture halo, 36 fragments, the
//   afterglow → she goes, he is back.
//
// No small projectile: the blast is fixed on the creature's centre (v19).
// DRAWING ONLY: v19's 「38」 is a stand-in number and is not drawn, as Levi's
// and Aria's parts draw none — what it would do is not decided here. v19's
// canvas cracks (prototype.js) were not delivered and are not drawn.
//
// Everything is placed off the drawings, measured when it starts.

import type { CSSProperties } from 'react';
import kaosCast from '@mugen/assets/files/characters/kaos/kaos-cast.png';
import type { FieldBox, FieldMarks } from '../../ui/battle/scene/fieldScene';
import { KAOS_PHASE_NAMES, type KaosPlan } from './kaosTiming';
import './kaos.css';

export type KaosStep = 'enter' | 'channel' | 'lock' | 'blast' | 'recover';

// Where things are in kaos-cast.png (1103×1426): the middle of her body and
// her feet — for standing her in his place.
const ART_ASPECT = 1103 / 1426;
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

/** Where she stands and where the blast is fixed — in field pixels. */
export function kaosGeometry(marks: FieldMarks) {
  const hero = inPixels(marks.hero, marks);
  const enemy = inPixels(marks.enemy, marks);
  const heroMid = hero.left + hero.width / 2;
  const heroFeet = hero.top + hero.height;
  // A little taller than his drawing, never off the top, never past the right edge.
  let height = Math.min(hero.height * 1.25, heroFeet - 4);
  let width = height * ART_ASPECT;
  const room = (marks.stage.width - heroMid) / (1 - ART_BODY_X);
  if (width > room) {
    width = room;
    height = width / ART_ASPECT;
  }
  const left = heroMid - width * ART_BODY_X;
  const top = heroFeet - height * ART_FEET_Y;
  const target = { x: enemy.left + enemy.width / 2, y: enemy.top + enemy.height * 0.52 };
  return { kaos: { left, top, width, height }, target };
}

const STEP_ON: Record<KaosStep, { aura: boolean; charged: boolean; locked: boolean; active: boolean }> = {
  enter: { aura: false, charged: false, locked: false, active: false },
  channel: { aura: true, charged: false, locked: false, active: false },
  lock: { aura: true, charged: true, locked: true, active: false },
  blast: { aura: true, charged: true, locked: false, active: true },
  recover: { aura: false, charged: false, locked: false, active: false },
};

/** Her, on the field where he stood, with the aura round her. */
export function KaosFigure({ marks, step, plan }: { marks: FieldMarks; step: KaosStep; plan: KaosPlan }) {
  const g = kaosGeometry(marks);
  const on = STEP_ON[step];
  const style = {
    left: px(g.kaos.left),
    top: px(g.kaos.top),
    width: px(g.kaos.width),
    height: px(g.kaos.height),
    '--kv-enter': `${plan.ms.ENTER}ms`,
    '--kv-recover': `${plan.ms.RECOVER}ms`,
    '--cast-ms': `${plan.ms.CHANNEL}ms`,
  } as CSSProperties;
  const aura = ['kv-aura', on.aura ? 'is-active' : '', on.charged ? 'is-charged' : ''].filter(Boolean).join(' ');
  return (
    <div className="ks-kaos" data-testid="kaos-figure" data-step={step} style={style} aria-hidden="true">
      <span className="ks-shadow" />
      <div className={aura} data-testid="kaos-aura" data-on={on.aura ? 'yes' : 'no'} data-charged={on.charged ? 'yes' : 'no'}>
        <span className="kv-aura-domain" />
        <span className="kv-aura-sigil kv-aura-sigil-outer" />
        <span className="kv-aura-sigil kv-aura-sigil-inner" />
        <span className="kv-aura-field" />
        <span className="kv-aura-ring kv-aura-ring-gold" />
        <span className="kv-aura-ring kv-aura-ring-blue" />
        <span className="kv-aura-cross" />
        <span className="kv-aura-pillar" />
        <span className="kv-aura-motes">
          {Array.from({ length: 14 }, (_, i) => (
            <i key={i} />
          ))}
        </span>
      </div>
      <img className="ks-art" src={kaosCast} alt="" draggable={false} data-testid="kaos-art" />
    </div>
  );
}

/** The working on the creature, the blast, the flash and the chip — over the field. */
export function KaosOver({ marks, step, plan }: { marks: FieldMarks; step: KaosStep; plan: KaosPlan }) {
  const g = kaosGeometry(marks);
  const on = STEP_ON[step];
  const style = {
    '--lock-ms': `${plan.ms.LOCK}ms`,
    '--magic-ms': `${plan.ms.BLAST}ms`,
    '--collapse-x': `${((g.target.x / marks.stage.width) * 100).toFixed(1)}%`,
    '--collapse-y': `${((g.target.y / marks.stage.height) * 100).toFixed(1)}%`,
  } as CSSProperties;
  const phase = step === 'channel' || step === 'lock' ? 'channel' : step === 'blast' ? 'blast' : null;
  const effect = ['kv-magic', on.locked ? 'is-locked' : '', on.active ? 'is-active' : ''].filter(Boolean).join(' ');
  return (
    <div className="ks-over" data-step={step} style={style} aria-hidden="true">
      {phase && (
        <span className="ks-phase" data-testid="kaos-phase" data-phase={phase}>
          {KAOS_PHASE_NAMES[phase]}
        </span>
      )}
      <div
        className={effect}
        data-testid="kaos-effect"
        data-state={on.active ? 'blast' : on.locked ? 'locked' : 'off'}
        // Its own lengths, here: v19's rule gives the element defaults of its own.
        style={
          {
            left: px(g.target.x),
            top: px(g.target.y),
            '--lock-ms': `${plan.ms.LOCK}ms`,
            '--magic-ms': `${plan.ms.BLAST}ms`,
          } as CSSProperties
        }
      >
        <span className="kv-blackout" />
        <span className="kv-compression-rays" />
        <span className="kv-target-seal" data-testid="kaos-seal" />
        <span className="kv-eclipse-ring" />
        <span className="kv-void-core" data-testid="kaos-core" />
        <span className="kv-burst-disc" data-testid="kaos-burst" />
        <span className="kv-corona" />
        <span className="kv-impact-cross" />
        <span className="kv-pillar" />
        <span className="kv-rupture-halo" />
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`kv-shockwave kv-shockwave-${n}`} data-testid="kaos-shockwave" />
        ))}
        <span className="kv-fragments">
          {Array.from({ length: 36 }, (_, i) => (
            <i key={i} data-testid="kaos-fragment" />
          ))}
        </span>
        <span className="kv-afterglow" />
      </div>
      <span className={`kv-screen-flash${on.active ? ' is-active' : ''}`} data-testid="kaos-flash" />
    </div>
  );
}
