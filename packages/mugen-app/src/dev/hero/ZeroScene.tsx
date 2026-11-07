// 零閃・天衝 — what is drawn. Debug preview only (STEP 9).
//
// v18's hero skill (playHeroSkill + the .hero-skill-* / .hero-moon-*
// rules in styles.css), rebuilt as a part the battle screen plays through
// its field-scene joint (ui/battle/scene/fieldScene.ts), in the roadmap's order:
//
//   his sword gathers → he dashes through, past the creature → 暗転 → the
//   RED MOON → one cut across it → the moon and the screen split in two →
//   the halves fall → back on the field (復帰) → the cut lands on the
//   creature, BLACK BLOOD sprays → he walks home.
//
// HE IS HIMSELF. Unlike Levi's and Aria's parts nobody stands in for him:
// the field's own drawing of him is moved, through the scene's words on
// him (data-scene-hero) and the distances handed over as CSS variables.
//
// A MASTER OF THE SHOWING, NOT A SKILL. The name is the confirmed one
// (零閃・天衝), but what the skill costs, does and when it is learned are
// not decided: no number is shown (v18's 56 is gone), no health taken,
// nothing is added to the game's skills.

import type { CSSProperties } from 'react';
import bloodMoon from '@mugen/assets/files/effects/blood-moon-v1.png';
import type { FieldMarks } from '../../ui/battle/scene/fieldScene';
import type { ZeroPlan } from './zeroTiming';
import './zero.css';

export type ZeroStep = 'charge' | 'dash' | 'hitstop' | 'moon' | 'pause' | 'break' | 'recover' | 'return';

const px = (n: number) => `${Math.round(n)}px`;

/** Where he runs to, and where the cut lands — in field pixels (v18 travelPastEnemy). */
export function zeroGeometry(marks: FieldMarks) {
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
  // Through it and out the other side — but never off the field's edge
  // by more than a third of himself.
  const targetLeft = Math.max(-hero.width * 0.32, enemy.left - hero.width * 0.62);
  return {
    dx: targetLeft - hero.left,
    dy: enemy.top + enemy.height - (hero.top + hero.height) + H * 0.012,
    centre: { x: enemy.left + enemy.width * 0.56, y: enemy.top + enemy.height * 0.5 },
  };
}

/** The distances and times his own drawing is moved by (zero.css reads them). */
export function zeroVars(marks: FieldMarks, plan: ZeroPlan): Record<string, string> {
  const g = zeroGeometry(marks);
  return {
    '--zr-dx': px(g.dx),
    '--zr-dy': px(g.dy),
    '--zr-x': px(g.centre.x),
    '--zr-y': px(g.centre.y),
    '--zr-charge': `${plan.ms.CHARGE}ms`,
    '--zr-dash': `${plan.ms.DASH}ms`,
    '--zr-moon': `${plan.ms.MOON}ms`,
    '--zr-break': `${plan.ms.BREAK}ms`,
    '--zr-recover': `${plan.ms.RECOVER}ms`,
    '--zr-return': `${plan.ms.RETURN}ms`,
  };
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/** Everything over the field: the dash's streak, the red moon, the cut landing. */
export function ZeroOver({ step, cut }: { step: ZeroStep; cut: boolean }) {
  const moonArt = { backgroundImage: `url(${bloodMoon})` } as CSSProperties;
  return (
    <div className="zr-over" data-step={step} data-cut={cut ? 'yes' : undefined} aria-hidden="true">
      <span className="zr-vignette" />
      {step === 'dash' && <span className="zr-streak" data-testid="zero-streak" />}

      {step === 'moon' && (
        // 暗転 → 紅月 → 斬撃 → 真っ二つ → 落下: a scene of its own, off the field.
        <div className="zr-moon-scene" data-testid="zero-moon">
          <span className="zr-black zr-black-upper" />
          <span className="zr-black zr-black-lower" />
          <span className="zr-haze" />
          <div className="zr-moon" data-testid="zero-moon-disc">
            <span className="zr-moon-trail zr-upper" style={moonArt} />
            <span className="zr-moon-trail zr-lower" style={moonArt} />
            <span className="zr-moon-half zr-upper" style={moonArt} data-testid="zero-moon-half" />
            <span className="zr-moon-half zr-lower" style={moonArt} data-testid="zero-moon-half" />
            <span className="zr-shockwave" />
            <span className="zr-moon-slash" />
            <span className="zr-afterline" />
            <span className="zr-burst" />
            <span className="zr-moon-shards">
              {range(14).map((i) => (
                <i key={i} />
              ))}
            </span>
          </div>
          {/* The cut does not stop at the moon: the screen itself is split. */}
          <span className="zr-screen-cut" data-testid="zero-screen-cut" />
          <span className="zr-moon-flash" />
        </div>
      )}

      {step === 'break' && (
        // 復帰: back on the field, the cut lands and the black blood sprays.
        <div className="zr-break" data-testid="zero-break">
          <span className="zr-rift" />
          <span className="zr-line zr-line-primary" />
          <span className="zr-line zr-line-echo" />
          <span className="zr-ring" />
          <span className="zr-blood" data-testid="zero-blood">
            {range(14).map((i) => (
              <i key={i} />
            ))}
          </span>
          <span className="zr-fragments">
            {range(12).map((i) => (
              <i key={i} />
            ))}
          </span>
          <span className="zr-flash" />
        </div>
      )}
    </div>
  );
}
