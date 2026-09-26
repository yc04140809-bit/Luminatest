// ARIA'S BLUE-ROSE ARROW — what is drawn. Debug preview only (STEP 7).
//
// v18's 天弓・蒼薔薇祝界 (playAriaSkill + the .aria-* rules in styles.css),
// rebuilt as a part the battle screen plays through its field-scene joint
// (ui/battle/scene/fieldScene.ts):
//
//   she steps in where he stood → leans back and draws her bow at the
//   sky → the arrow flies up over the field and bursts in a star of light
//   → a blue rose opens over the field → its light falls on the party
//   with a rain of petals, and he is back in its glow as she goes.
//
// A BLESSING, SHOT INTO THE SKY — not at the creature (as v18, and as the
// user has confirmed it is meant: 「弓を上に向けてバフ」). Nothing touches
// the creature. Her picture draws the bow level, so she leans back from
// her feet to raise it, and the arrow leaves along the bow — up and to
// the left, over the creature's side, never toward the party.
//
// DRAWING ONLY. No number, no health, and none of v18's tags — its
// PARTY BLESSING / ATK ▲ / SPD ▲ / CRIT ▲ name stats the game does not
// have. What the blessing does, if it becomes a skill, is not decided here.
//
// Everything is placed off the drawings, measured when it starts.

import type { CSSProperties } from 'react';
import ariaBattle from '@mugen/assets/files/characters/aria/aria-battle.png';
import roseSigil from '@mugen/assets/files/characters/aria/aria-blue-rose-sigil.png';
import type { FieldBox, FieldMarks } from '../../ui/battle/scene/fieldScene';
import type { AriaPlan } from './ariaTiming';
import './aria.css';

export type AriaStep = 'enter' | 'draw' | 'shot' | 'bloom' | 'bless' | 'recover';

// Where things are in aria-battle.png (1024×1536): the arrow's point,
// the middle of her body, and her feet — for standing her in his place.
const ART_ASPECT = 1024 / 1536;
const ART_TIP = { x: 0.012, y: 0.302 };
const ART_BODY_X = 0.6;
const ART_FEET_Y = 0.985;
/** How far she leans back from her feet to raise her bow at the sky (degrees). */
export const ARIA_LEAN = 20;

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

/** Where she stands, where her arrow goes and bursts — in field pixels. */
export function ariaGeometry(marks: FieldMarks) {
  const W = marks.stage.width;
  const H = marks.stage.height;
  const hero = inPixels(marks.hero, marks);
  const enemy = inPixels(marks.enemy, marks);
  const heroMid = hero.left + hero.width / 2;
  const heroFeet = hero.top + hero.height;

  // A little taller than his drawing (her bow reaches over her head),
  // but never off the top — leaning back, the picture's top corner is its
  // highest point — and her arrow's point short of the creature.
  const lean = (ARIA_LEAN * Math.PI) / 180;
  // (her top-left corner, turned about her feet, rises this many heights)
  const cornerRise = ART_ASPECT * ART_BODY_X * Math.sin(lean) + ART_FEET_Y * Math.cos(lean);
  let height = Math.min(hero.height * 1.3, (heroFeet - 4) / cornerRise);
  let width = height * ART_ASPECT;
  const tipNoCloserThan = enemy.left + enemy.width + W * 0.05;
  if (heroMid - width * (ART_BODY_X - ART_TIP.x) < tipNoCloserThan) {
    width = (heroMid - tipNoCloserThan) / (ART_BODY_X - ART_TIP.x);
    height = width / ART_ASPECT;
  }
  const left = heroMid - width * ART_BODY_X;
  const top = heroFeet - height * ART_FEET_Y;
  // Leaning back from her feet turns her arrow's point up with the bow.
  const pivot = { x: left + width * ART_BODY_X, y: top + height * ART_FEET_Y };
  const rad = lean;
  const rel = { x: width * (ART_TIP.x - ART_BODY_X), y: height * (ART_TIP.y - ART_FEET_Y) };
  const tip = {
    x: pivot.x + rel.x * Math.cos(rad) - rel.y * Math.sin(rad),
    y: pivot.y + rel.x * Math.sin(rad) + rel.y * Math.cos(rad),
  };
  // Along the bow, up and to the left, until it is high over the field.
  const skyY = Math.max(20, H * 0.08);
  const run = Math.max(40, Math.min((tip.y - skyY) / Math.sin(rad), (tip.x - W * 0.12) / Math.cos(rad)));
  const sky = { x: tip.x - Math.cos(rad) * run, y: tip.y - Math.sin(rad) * run };

  // The party: him, and her if she is there.
  const party = [hero, ...(marks.kaos ? [inPixels(marks.kaos, marks)] : [])];
  const from = Math.min(...party.map((b) => b.left));
  const to = Math.max(...party.map((b) => b.left + b.width));
  return {
    aria: { left, top, width, height },
    tip,
    sky,
    rose: { x: W * 0.5, y: H * 0.4, size: Math.min(H * 0.5, W * 0.28, 210) },
    rays: Array.from({ length: 5 }, (_, i) => from + ((to - from) * (i + 0.5)) / 5),
    crests: party.map((b) => ({ x: b.left + b.width / 2, y: b.top + b.height * 0.52 })),
    star: Math.min(H * 0.42, 170),
    crest: Math.min(H * 0.28, 110),
  };
}

/** Her, on the field where he stood. */
export function AriaFigure({
  marks,
  step,
  back,
  plan,
}: {
  marks: FieldMarks;
  step: AriaStep;
  back: boolean;
  plan: AriaPlan;
}) {
  const g = ariaGeometry(marks);
  const style = {
    left: px(g.aria.left),
    top: px(g.aria.top),
    width: px(g.aria.width),
    height: px(g.aria.height),
    '--ar-enter': `${plan.ms.ENTER}ms`,
    '--ar-draw': `${plan.ms.DRAW}ms`,
    '--ar-shot': `${plan.ms.SHOT}ms`,
    '--ar-lean': `${ARIA_LEAN}deg`,
    '--ar-pivot': `${ART_BODY_X * 100}% ${ART_FEET_Y * 100}%`,
  } as CSSProperties;
  return (
    <div
      className="ar-aria"
      data-testid="aria-figure"
      data-step={step}
      data-back={back ? 'yes' : undefined}
      style={style}
      aria-hidden="true"
    >
      <span className="ar-shadow" />
      <div className="ar-lean">
        <div className="ar-motion">
          <img className="ar-art" src={ariaBattle} alt="" draggable={false} data-testid="aria-art" />
          <span className="ar-charge" style={{ left: `${ART_TIP.x * 100}%`, top: `${ART_TIP.y * 100}%` }} />
        </div>
      </div>
    </div>
  );
}

/** The arrow, its burst in the sky, the rose, and its light on the party — over the field. */
export function AriaBloom({
  marks,
  step,
  landed,
  plan,
}: {
  marks: FieldMarks;
  step: AriaStep;
  landed: boolean;
  plan: AriaPlan;
}) {
  const g = ariaGeometry(marks);
  const dx = g.sky.x - g.tip.x;
  const dy = g.sky.y - g.tip.y;
  const style = {
    '--ar-shot': `${plan.ms.SHOT}ms`,
    '--ar-bloom': `${plan.ms.BLOOM}ms`,
    '--ar-bless': `${plan.ms.BLESS}ms`,
    '--ar-star': px(g.star),
    '--ar-crest': px(g.crest),
  } as CSSProperties;
  const blooming = step === 'bloom' || step === 'bless';
  return (
    <div className="ar-over" data-step={step} style={style} aria-hidden="true">
      <span className="ar-veil" />
      {step === 'shot' && (
        <span
          className="ar-arrow"
          data-testid="aria-arrow"
          style={{
            left: px(g.tip.x),
            top: px(g.tip.y),
            width: px(Math.hypot(dx, dy)),
            transform: `rotate(${(Math.atan2(dy, dx) * 180) / Math.PI}deg)`,
          }}
        >
          <i className="ar-arrow-wide" />
          <i className="ar-arrow-core" />
        </span>
      )}
      {step === 'shot' && landed && (
        <span className="ar-star" data-testid="aria-star" style={{ left: px(g.sky.x), top: px(g.sky.y) }} />
      )}
      {blooming && (
        <span
          className="ar-rose"
          data-testid="aria-rose"
          style={{ left: px(g.rose.x), top: px(g.rose.y), width: px(g.rose.size), height: px(g.rose.size) }}
        >
          <i className="ar-ring ar-ring-outer" />
          <i className="ar-ring ar-ring-inner" />
          <img className="ar-sigil" src={roseSigil} alt="" draggable={false} />
        </span>
      )}
      {step === 'bless' && (
        <>
          <span className="ar-rays" data-testid="aria-rays">
            {g.rays.map((x, i) => (
              <i key={i} style={{ left: px(x), '--ar-delay': [0.03, 0.11, 0.18, 0.08, 0.15][i] } as CSSProperties} />
            ))}
          </span>
          {g.crests.map((c, i) => (
            <img
              key={i}
              className="ar-crest"
              data-testid="aria-crest"
              src={roseSigil}
              alt=""
              draggable={false}
              style={{ left: px(c.x), top: px(c.y), '--ar-delay': 0.05 + i * 0.1 } as CSSProperties}
            />
          ))}
          <span className="ar-petals" data-testid="aria-petals">
            {Array.from({ length: 18 }, (_, i) => (
              <i key={i} />
            ))}
          </span>
          <span className="ar-flash" />
        </>
      )}
    </div>
  );
}
