import { describe, expect, it } from 'vitest';
import { PROTOTYPE_PLACEMENTS, prototypeStyle, type PrototypeSlot } from './formation';
import {
  CAMERA_GLIDE_MS,
  SHOT_FLOORS,
  SWING_ROLES,
  cameraOffset,
  cameraStyle,
  swingCues,
  type CameraPhase,
} from './battleCamera';

const SLOTS = Object.keys(PROTOTYPE_PLACEMENTS) as PrototypeSlot[];
const PHASES: CameraPhase[] = ['IDLE', 'FOCUS', 'RETREAT', 'IMPACT', 'RETURN'];

describe('the camera at rest', () => {
  /**
   * THE ONE THAT MATTERS MOST.
   *
   * A fight nobody is playing has to be pixel-for-pixel the fight that
   * was there before this file existed, or every position B-1 moved out
   * of the stylesheet has quietly moved again.
   */
  it('draws every slot exactly where the formation puts it', () => {
    for (const slot of SLOTS) {
      expect(cameraStyle(slot, 'IDLE'), slot).toEqual(prototypeStyle(slot));
    }
  });

  it('moves nobody by any amount', () => {
    for (const role of ['ACTOR', 'ALLY', 'TARGET', 'BYSTANDER'] as const) {
      expect(cameraOffset('IDLE', role), role).toEqual({ inset: 0, bottom: 0 });
    }
  });

  it('is where a turn comes back to, so RETURN is the formation too', () => {
    for (const slot of SLOTS) {
      expect(cameraStyle(slot, 'RETURN'), slot).toEqual(prototypeStyle(slot));
    }
  });
});

describe('the camera on a swing', () => {
  it('leans the actor toward what they are hitting, and nobody else', () => {
    // He is on the right, so further IN is further toward the creature.
    const idle = cameraStyle('hero', 'IDLE');
    const focus = cameraStyle('hero', 'FOCUS');
    expect(focus).not.toEqual(idle);
    expect(cameraOffset('FOCUS', 'ACTOR').inset).toBeGreaterThan(0);

    // At FOCUS it is only him: standing back is the next moment.
    expect(cameraStyle('kaos', 'FOCUS')).toEqual(prototypeStyle('kaos'));
    expect(cameraStyle('enemy', 'FOCUS')).toEqual(prototypeStyle('enemy'));
    expect(cameraStyle('summon', 'FOCUS')).toEqual(prototypeStyle('summon'));
  });

  it('stands the ally back, and only the ally', () => {
    expect(cameraStyle('kaos', 'RETREAT')).not.toEqual(prototypeStyle('kaos'));
    // Up the path rather than sideways: she is already hard against her
    // own edge and has nowhere sideways to go.
    expect(cameraOffset('RETREAT', 'ALLY')).toEqual({
      inset: 0,
      bottom: cameraOffset('RETREAT', 'ALLY').bottom,
    });
    expect(cameraOffset('RETREAT', 'ALLY').bottom).toBeGreaterThan(0);

    // The creature is what the blow is aimed at and what the player is
    // reading. It does not move in any phase.
    for (const phase of PHASES) {
      expect(cameraStyle('enemy', phase), phase).toEqual(prototypeStyle('enemy'));
    }
  });

  it('reaches furthest at the moment of contact', () => {
    expect(cameraOffset('IMPACT', 'ACTOR').inset).toBeGreaterThan(
      cameraOffset('FOCUS', 'ACTOR').inset,
    );
    // And holds the ally where the retreat put her rather than letting
    // her drift home under the blow.
    expect(cameraOffset('IMPACT', 'ALLY')).toEqual(cameraOffset('RETREAT', 'ALLY'));
  });

  it('never leans so far that the field stops being a field', () => {
    // A guard on the numbers rather than on the look: everybody stays
    // inside their own half, so no shot can put an actor through the
    // creature or off the side of the battlefield.
    for (const phase of PHASES) {
      for (const slot of SLOTS) {
        const base = PROTOTYPE_PLACEMENTS[slot];
        const moved = base.inset + cameraOffset(phase, SWING_ROLES[slot]).inset;
        expect(moved, `${slot} @ ${phase} stays on its own side`).toBeLessThan(0.5);
        expect(moved, `${slot} @ ${phase} stays on the field`).toBeGreaterThanOrEqual(0);
        const up = base.bottom + cameraOffset(phase, SWING_ROLES[slot]).bottom;
        expect(up, `${slot} @ ${phase} stays on the ground`).toBeGreaterThanOrEqual(0);
        expect(up, `${slot} @ ${phase} stays below the sky`).toBeLessThan(0.6);
      }
    }
  });

  it('keeps the summoned memory out of it, for now', () => {
    for (const phase of PHASES) {
      expect(cameraStyle('summon', phase), phase).toEqual(prototypeStyle('summon'));
    }
  });
});

describe('the track a swing is filmed on', () => {
  // A strike at ×1, answered by a tackle and a flinch.
  const STRIKE = 320;
  const TURN = 320 + 460 + 300;

  it('runs the whole shot, in order, inside the turn', () => {
    const cues = swingCues(STRIKE, TURN, CAMERA_GLIDE_MS);
    expect(cues.map((c) => c.phase)).toEqual(['FOCUS', 'RETREAT', 'IMPACT', 'RETURN', 'IDLE']);
    for (let i = 1; i < cues.length; i += 1) {
      expect(cues[i].at, `${cues[i].phase} follows ${cues[i - 1].phase}`).toBeGreaterThan(
        cues[i - 1].at,
      );
    }
    expect(cues[0].at, 'the lean begins with the blow').toBe(0);
    expect(cues[3].at, 'and it is over when the actor’s beat is').toBe(STRIKE);
    expect(cues[4].at, 'resting no later than the turn does').toBe(TURN);
  });

  it('lands the contact inside the actor’s own beat', () => {
    const cues = swingCues(STRIKE, TURN, CAMERA_GLIDE_MS);
    const impact = cues.find((c) => c.phase === 'IMPACT')!;
    expect(impact.at).toBeGreaterThan(0);
    expect(impact.at).toBeLessThan(STRIKE);
  });

  /**
   * THE RETURN GUARANTEE, as a property rather than as a habit.
   *
   * Whatever the durations — a creature that answered, one that did
   * nothing, a turn of no length at all — the last thing the camera is
   * ever told to do is go home.
   */
  it('always ends at rest, whatever the turn was', () => {
    for (const [beat, turn] of [
      [STRIKE, TURN],
      [STRIKE, STRIKE], // it did nothing: the turn is one beat long
      [0, 0], // and a turn of no length at all
      [160, 540], // ×2
      [90, 90], // the shortest beat the speed floor allows
    ]) {
      const cues = swingCues(beat, turn, CAMERA_GLIDE_MS);
      expect(cues[cues.length - 1].phase, `${beat}/${turn}`).toBe('IDLE');
    }
  });

  it('gives the return somewhere to happen even when the turn is one beat', () => {
    // Told to return and to be at rest in the same instant, the field
    // would snap home rather than come home. The glide is what the last
    // cue is held back by.
    const cues = swingCues(STRIKE, STRIKE, CAMERA_GLIDE_MS);
    const back = cues.find((c) => c.phase === 'RETURN')!;
    const rest = cues.find((c) => c.phase === 'IDLE')!;
    expect(rest.at - back.at).toBeGreaterThanOrEqual(CAMERA_GLIDE_MS);
  });

  it('is shorter at twice speed, because its numbers already were', () => {
    // The camera holds no durations of its own: it is handed the beats
    // the theatre worked out, so halving those halves the shot.
    const one = swingCues(320, 1080, 220);
    const two = swingCues(160, 540, 110);
    for (let i = 0; i < one.length; i += 1) {
      expect(two[i].phase).toBe(one[i].phase);
      expect(two[i].at, one[i].phase).toBeLessThan(Math.max(1, one[i].at));
    }
  });

  it('refuses to run backwards on a nonsense duration', () => {
    const cues = swingCues(-500, -20, CAMERA_GLIDE_MS);
    expect(cues.every((c) => c.at >= 0)).toBe(true);
    expect(cues[cues.length - 1].phase).toBe('IDLE');
  });
});

describe('who plays what in a swing', () => {
  it('gives every slot a part, so no actor is left undrawn', () => {
    for (const slot of SLOTS) {
      expect(SWING_ROLES[slot], slot).toBeDefined();
    }
  });

  it('has exactly one actor and one target', () => {
    const parts = SLOTS.map((s) => SWING_ROLES[s]);
    expect(parts.filter((p) => p === 'ACTOR')).toHaveLength(1);
    expect(parts.filter((p) => p === 'TARGET')).toHaveLength(1);
    expect(SWING_ROLES.hero).toBe('ACTOR');
    expect(SWING_ROLES.enemy).toBe('TARGET');
  });
});


/**
 * WHAT SPEED IS NOT ALLOWED TO TAKE AWAY.
 *
 * Twice speed halves the waiting. It must not halve the watching: a
 * lean, a landing and a step back that each get eighty milliseconds are
 * not a faster fight, they are a fight nobody can follow. These are the
 * floors, and the shape of the check is always the same — at ×1 nothing
 * binds and the shot is exactly what it was, at ×2 every span is still
 * at least its floor.
 */
describe('the floors under a shot', () => {
  // The turn as the prototype times it: a strike, then the creature's
  // tackle and the flinch it causes.
  const X1 = { beat: 320, turn: 320 + 460 + 300, glide: 120 };
  const X2 = { beat: 160, turn: 160 + 230 + 150, glide: 120 };

  const spans = (beat: number, turn: number, glide: number) => {
    const cues = swingCues(beat, turn, glide);
    const at = (p: string) => cues.find((c) => c.phase === p)!.at;
    return {
      anticipation: at('IMPACT') - at('FOCUS'),
      hitStop: at('RETURN') - at('IMPACT'),
      retreat: at('RETURN') - at('RETREAT'),
      returnHome: at('IDLE') - at('RETURN'),
      cues,
    };
  };

  /**
   * NORMAL SPEED IS UNTOUCHED, and this is the test that says so. The
   * floors are every one of them a `max`, so a shot already over them
   * passes through unchanged — and at ×1 every span is well over.
   */
  it('changes nothing at all about a shot at ×1', () => {
    expect(swingCues(X1.beat, X1.turn, X1.glide).map((c) => c.at)).toEqual([0, 109, 230, 320, 1080]);
  });

  it('leaves every span at ×1 far above its floor, so none of them bind', () => {
    const s = spans(X1.beat, X1.turn, X1.glide);
    expect(s.anticipation).toBeGreaterThan(SHOT_FLOORS.anticipation);
    expect(s.hitStop).toBeGreaterThan(SHOT_FLOORS.hitStop);
    expect(s.retreat).toBeGreaterThan(SHOT_FLOORS.retreat);
    expect(s.returnHome).toBeGreaterThan(SHOT_FLOORS.returnHome);
  });

  it('holds every span at or above its floor at ×2', () => {
    const s = spans(X2.beat, X2.turn, X2.glide);
    expect(s.anticipation, 'anticipation').toBeGreaterThanOrEqual(SHOT_FLOORS.anticipation);
    expect(s.hitStop, 'hit stop').toBeGreaterThanOrEqual(SHOT_FLOORS.hitStop);
    expect(s.retreat, 'retreat').toBeGreaterThanOrEqual(SHOT_FLOORS.retreat);
    expect(s.returnHome, 'return home').toBeGreaterThanOrEqual(SHOT_FLOORS.returnHome);
  });

  /**
   * The retreat is the one the floors exist for. Halved it came out at
   * about a tenth of a second of travel and ten milliseconds standing
   * back — one frame — which on a phone read as a twitch rather than as
   * somebody giving the swing room.
   */
  it('keeps the ally away from the front long enough to be seen', () => {
    expect(spans(X2.beat, X2.turn, X2.glide).retreat).toBeGreaterThanOrEqual(180);
    // And she finishes arriving before she is sent home again.
    const s = spans(X2.beat, X2.turn, X2.glide);
    expect(s.retreat).toBeGreaterThan(X2.glide);
  });

  it('never lets a floor run the cues backwards, at any speed', () => {
    for (const [beat, turn, glide] of [
      [320, 1080, 120],
      [160, 540, 120],
      [107, 360, 120], // ×3
      [90, 90, 120], // the shortest beat, and nothing answered
      [0, 0, 0],
    ]) {
      const cues = swingCues(beat, turn, glide);
      for (let i = 1; i < cues.length; i += 1) {
        expect(cues[i].at, `${beat}/${turn}: ${cues[i].phase}`).toBeGreaterThanOrEqual(cues[i - 1].at);
      }
      expect(cues[cues.length - 1].phase).toBe('IDLE');
    }
  });

  it('is still shorter at ×2 than at ×1 — floors raise, they do not invert', () => {
    const one = swingCues(X1.beat, X1.turn, X1.glide);
    const two = swingCues(X2.beat, X2.turn, X2.glide);
    for (let i = 0; i < one.length; i += 1) {
      expect(two[i].at, one[i].phase).toBeLessThanOrEqual(one[i].at);
    }
  });

  it('takes the floors as an argument, so a shot can be given its own', () => {
    const loose = swingCues(160, 540, 120, {
      anticipation: 0,
      hitStop: 0,
      retreat: 0,
      returnHome: 0,
    });
    expect(loose.map((c) => c.at)).toEqual([0, 54, 115, 160, 540]);
  });
});

/** The step back, which the first two passes made too small to read. */
describe('how far the ally stands back', () => {
  it('is a retreat rather than a twitch', () => {
    // A share of the field's height: on the 221px stage of an 844-wide
    // phone this is about twenty-six pixels, where 0.04 was nine.
    const back = cameraOffset('RETREAT', 'ALLY').bottom;
    expect(back).toBeGreaterThanOrEqual(0.1);
    expect(back * 221).toBeGreaterThanOrEqual(22);
  });

  it('does not stand her off the field or into the creature', () => {
    const kaos = PROTOTYPE_PLACEMENTS.kaos;
    const up = kaos.bottom + cameraOffset('RETREAT', 'ALLY').bottom;
    expect(up).toBeLessThan(0.5);
    // She is on the other edge from the creature, so height alone cannot
    // put them on top of each other — but she stays below it regardless.
    expect(up).toBeLessThan(PROTOTYPE_PLACEMENTS.enemy.bottom + 0.05);
  });
});
