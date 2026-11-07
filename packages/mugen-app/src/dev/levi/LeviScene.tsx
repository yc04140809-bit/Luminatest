// LEVI'S PHANTOM SPEARS — what is drawn. Debug preview only (STEP 5).
//
// v18's 冥槍・黒葬封界 (playLeviSkill + the .levi-* rules in styles.css),
// rebuilt as a part the battle screen plays through its field-scene joint
// (ui/battle/scene/fieldScene.ts), in the order this step asks for:
//
//   she steps in where he stood → her stance → six phantom spears form
//   round the creature → they go in one after another → she drives in
//   herself, and the finish lands a little bigger than any spear did.
//
// DRAWING ONLY. No number is shown and none is made: the part is joined
// to no skill of the game's, so there is no result to show, and the
// fight underneath is not touched (its health bar does not move).
// v18's DEF ▼ / RESIST ▼ tags are left off — the game has no such stats.
//
// EVERYTHING IS PLACED OFF THE DRAWINGS, measured when it starts: she
// stands where he stands, her lance pointing at the creature and never
// already through it; the spears meet at the creature's middle, each cut
// short where the field ends, so none trails far off the screen.

import type { CSSProperties } from 'react';
import leviBattle from '@mugen/assets/files/characters/levi/levi-battle.png';
import type { FieldMarks } from '../../ui/battle/scene/fieldScene';
import type { LeviPlan } from './leviTiming';
import './levi.css';

export type LeviStep = 'enter' | 'stance' | 'stab' | 'rush' | 'impact' | 'leave';
export type SpearState = 'none' | 'formed' | 'thrust' | 'lodged' | 'shatter';

/** v18's six directions, in the order they strike (degrees; 0 = from the left, 90 = from above). */
export const SPEAR_ANGLES = [0, 58, 118, 180, 238, 302] as const;

// Where things are in levi-battle.png (1536×1024): her lance's point,
// the middle of her body, and her feet — for standing her in his place.
const ART_ASPECT = 1536 / 1024;
const ART_TIP = { x: 0.012, y: 0.2 };
const ART_BODY_X = 0.75;
const ART_FEET_Y = 0.985;

interface Geometry {
  levi: { left: number; top: number; width: number; height: number };
  tip: { x: number; y: number };
  /** Her drive: how far she goes. */
  rush: { x: number; y: number };
  /** The creature's middle, where the spears meet. */
  centre: { x: number; y: number };
  /** How far into it a spear's point goes. */
  bite: number;
  /** The spears' length before any is cut short. */
  spear: number;
}

/** Where she stands, where her lance points and where the spears meet — in field pixels. */
export function leviGeometry(marks: FieldMarks): Geometry {
  const W = marks.stage.width;
  const H = marks.stage.height;
  const hero = {
    left: marks.hero.left * W,
    top: marks.hero.top * H,
    width: marks.hero.width * W,
    height: marks.hero.height * H,
  };
  const enemy = {
    left: marks.enemy.left * W,
    top: marks.enemy.top * H,
    width: marks.enemy.width * W,
    height: marks.enemy.height * H,
  };
  const heroMid = hero.left + hero.width / 2;
  const heroFeet = hero.top + hero.height;

  // His height, and her body where his was.
  let height = hero.height * 1.06;
  let width = height * ART_ASPECT;
  // Her lance points at the creature and stops short of it.
  const tipNoCloserThan = enemy.left + enemy.width + W * 0.05;
  if (heroMid - width * ART_BODY_X + width * ART_TIP.x < tipNoCloserThan) {
    width = (heroMid - tipNoCloserThan) / (ART_BODY_X - ART_TIP.x);
    height = width / ART_ASPECT;
  }
  const left = heroMid - width * ART_BODY_X;
  const top = heroFeet - height * ART_FEET_Y;
  const tip = { x: left + width * ART_TIP.x, y: top + height * ART_TIP.y };

  const centre = { x: enemy.left + enemy.width * 0.5, y: enemy.top + enemy.height * 0.52 };
  // Her drive ends with the point just inside the creature's near side.
  const reachX = enemy.left + enemy.width * 0.72;
  const rush = {
    x: Math.max(-W * 0.45, Math.min(0, reachX - tip.x)),
    y: Math.max(-H * 0.06, Math.min(H * 0.06, (centre.y - tip.y) * 0.5)),
  };
  return {
    levi: { left, top, width, height },
    tip,
    rush,
    centre,
    bite: Math.min(enemy.width, enemy.height) * 0.28,
    spear: Math.max(80, Math.min(W * 0.2, H * 0.36, 170)),
  };
}

/** How far off a formed spear hovers, as a part of its length (levi.css `formed`). */
const HOVER = 0.3;

/**
 * A spear's length along its direction, cut short so that — hovering,
 * before it strikes — its tail stays on the field; never under 60% of
 * the others, so none is a stub.
 */
export function spearLength(g: Geometry, angle: number, marks: FieldMarks): number {
  const rad = (angle * Math.PI) / 180;
  // The tail points away from the middle: (-cos, -sin) of its angle.
  const dx = -Math.cos(rad);
  const dy = -Math.sin(rad);
  const margin = 6;
  const room = [
    dx < -1e-6 ? (g.centre.x - margin) / -dx : Infinity,
    dx > 1e-6 ? (marks.stage.width - margin - g.centre.x) / dx : Infinity,
    dy < -1e-6 ? (g.centre.y - margin) / -dy : Infinity,
    dy > 1e-6 ? (marks.stage.height - margin - g.centre.y) / dy : Infinity,
  ];
  const fits = (Math.min(...room) - g.bite) / (1 + HOVER);
  return Math.round(Math.max(g.spear * 0.6, Math.min(g.spear, fits)));
}

const px = (n: number) => `${Math.round(n)}px`;

/** Her, on the field where he stood. */
export function LeviFigure({ marks, step, plan }: { marks: FieldMarks; step: LeviStep; plan: LeviPlan }) {
  const g = leviGeometry(marks);
  const style = {
    left: px(g.levi.left),
    top: px(g.levi.top),
    width: px(g.levi.width),
    height: px(g.levi.height),
    '--lv-enter': `${plan.ms.ENTER}ms`,
    '--lv-stance': `${plan.ms.STANCE}ms`,
    '--lv-rush': `${plan.ms.RUSH}ms`,
    '--lv-through': `${Math.round(plan.ms.IMPACT * 0.4)}ms`,
    '--lv-leave': `${plan.ms.LEAVE}ms`,
    '--lv-dx': px(g.rush.x),
    '--lv-dy': px(g.rush.y),
  } as CSSProperties;
  return (
    <div className="lv-levi" data-testid="levi-figure" data-step={step} style={style} aria-hidden="true">
      <span className="lv-shadow" />
      <div className="lv-motion">
        <img className="lv-art" src={leviBattle} alt="" draggable={false} data-testid="levi-art" />
        <img className="lv-after lv-after-one" src={leviBattle} alt="" draggable={false} />
        <img className="lv-after lv-after-two" src={leviBattle} alt="" draggable={false} />
      </div>
    </div>
  );
}

/** The six spears, the bite of each, and her finish — over the field. */
export function LeviSpears({
  marks,
  step,
  spears,
  lodged,
  plan,
}: {
  marks: FieldMarks;
  step: LeviStep;
  spears: readonly SpearState[];
  lodged: number;
  plan: LeviPlan;
}) {
  const g = leviGeometry(marks);
  const H = marks.stage.height;
  const W = marks.stage.width;
  const flash = Math.min(H * 0.62, W * 0.3, 260);
  const seal = Math.min(H * 0.3, 130);
  const style = {
    '--lv-form-in': `${plan.ms.FORM_IN}ms`,
    '--lv-stab': `${plan.ms.STAB}ms`,
    '--lv-rush': `${plan.ms.RUSH}ms`,
    '--lv-impact': `${plan.ms.IMPACT}ms`,
    '--lv-flash': px(flash),
    '--lv-seal': px(seal),
    '--lv-cross': px(Math.min(W * 0.6, 520)),
    '--lv-cross-v': px(Math.min(H * 0.8, 420)),
    '--lv-shard': String(seal / 184),
  } as CSSProperties;

  // Her lance's trail: from where its point was to the creature's middle.
  const tdx = g.centre.x - g.tip.x;
  const tdy = g.centre.y - g.tip.y;
  const trail = {
    left: px(g.tip.x),
    top: px(g.tip.y),
    width: px(Math.hypot(tdx, tdy)),
    transform: `rotate(${(Math.atan2(tdy, tdx) * 180) / Math.PI}deg)`,
  } as CSSProperties;

  // Where the last spear to go in bit.
  const lastAngle = lodged > 0 ? SPEAR_ANGLES[lodged - 1] : 0;
  const lastRad = (lastAngle * Math.PI) / 180;
  const bite = {
    left: px(g.centre.x - Math.cos(lastRad) * g.bite),
    top: px(g.centre.y - Math.sin(lastRad) * g.bite),
  } as CSSProperties;

  return (
    <div className="lv-over" data-step={step} style={style} aria-hidden="true">
      <span className="lv-vignette" style={{ '--lv-x': px(g.centre.x), '--lv-y': px(g.centre.y) } as CSSProperties} />
      {step === 'rush' && <span className="lv-trail" data-testid="levi-trail" style={trail} />}
      <span className="lv-at" style={{ left: px(g.centre.x), top: px(g.centre.y) }}>
        {SPEAR_ANGLES.map((angle, i) => (
          <i
            key={i}
            className="lv-spear"
            data-testid="levi-spear"
            data-index={i}
            data-state={spears[i]}
            style={
              {
                '--lv-angle': `${angle}deg`,
                '--lv-len': px(spearLength(g, angle, marks)),
                '--lv-in': px(g.bite),
              } as CSSProperties
            }
          />
        ))}
        {step === 'impact' && (
          <>
            <span className="lv-flash" data-testid="levi-finish" />
            <span className="lv-cross" />
            <span className="lv-seal">
              <i className="lv-seal-ring lv-seal-outer" />
              <i className="lv-seal-ring lv-seal-inner" />
              <i className="lv-seal-eye" />
            </span>
            <span className="lv-shards">
              {Array.from({ length: 16 }, (_, i) => (
                <i key={i} />
              ))}
            </span>
          </>
        )}
      </span>
      {lodged > 0 && (step === 'stab' || step === 'rush') && (
        <span key={`bite-${lodged}`} className="lv-bite" data-testid="levi-bite" data-count={lodged} style={bite} />
      )}
    </div>
  );
}
