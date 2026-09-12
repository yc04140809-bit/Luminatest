// WHERE THE FIGHT IS LOOKING.
//
// The formation says where everybody STANDS. This says where they are
// drawn while something is happening to them — a step toward the
// creature as a blow is thrown, a step back for whoever is not throwing
// it, and everybody home again afterwards.
//
// It is presentation and only presentation. Nothing here reads or
// writes health, magic, damage, turns or the creature's mind; it is
// handed a moment and answers with an offset. That is deliberate: a
// camera that can change a fight is a camera that has to be tested like
// a fight.
//
// TWO RULES HOLD THIS TOGETHER.
//
// 1. THE BASE IS NEVER REWRITTEN. Every answer here is an offset ADDED
//    to `PROTOTYPE_PLACEMENTS`. The formation table is where a
//    character stands and stays the only place that says so, so a
//    camera that is switched off — or has gone wrong — leaves the
//    screen exactly as B-1 left it.
//
// 2. AT REST THE OFFSET IS ZERO. `IDLE` moves nobody by any amount, so
//    a fight nobody is playing is pixel-for-pixel the fight that was
//    there before this file existed. `e2e/battleFormation.spec.ts` is
//    what would notice if that ever stopped being true.

import {
  PROTOTYPE_PLACEMENTS,
  placementStyle,
  type PrototypeSlot,
  type PrototypePlacement,
} from './formation';

/**
 * The moments a turn is drawn in.
 *
 *   IDLE     nobody is acting; the formation as written.
 *   FOCUS    the actor leans toward what they are about to hit.
 *   RETREAT  and everybody else gives them the room.
 *   IMPACT   contact: the actor is at full reach and held there.
 *   RETURN   the field going home.
 *
 * RETURN and IDLE ask for the same place on purpose — the difference is
 * that RETURN is a field still moving and IDLE is a field at rest, and
 * the screen only lets positions glide while the camera is working.
 * Keeping them apart is what lets a later pass give the return a settle
 * or an overshoot without a single caller changing.
 */
export type CameraPhase = 'IDLE' | 'FOCUS' | 'RETREAT' | 'IMPACT' | 'RETURN';

/**
 * What somebody IS in the moment being drawn, rather than who they are.
 *
 * A camera that knew about heroes and creatures would need a new branch
 * for every fight that is not this one. It knows about the part being
 * played instead, so a creature that attacks is an ACTOR by the same
 * code that moves the hero today.
 */
export type CameraRole = 'ACTOR' | 'ALLY' | 'TARGET' | 'BYSTANDER';

/** An offset, in the same shares of the field the formation is written in. */
export interface CameraOffset {
  /** Added to the placement's inset: positive is further in from its edge. */
  inset: number;
  /** Added to the placement's bottom: positive is further up the path. */
  bottom: number;
}

const STILL: CameraOffset = { inset: 0, bottom: 0 };

/**
 * HOW FAR ANYBODY MOVES.
 *
 * Small on purpose, and these numbers are a starting point rather than
 * a finished look — the brief for this pass was a structure that can be
 * tuned, not a tuning.
 *
 * The whole field stays on screen. A lean of eight hundredths of the
 * field's width is about sixty-seven pixels on a 844-wide phone: enough
 * to read as a step taken, nowhere near enough to crowd the creature
 * being hit or to turn the battlefield into somebody's face.
 *
 * TUNED ON A PHONE. The first pass leaned 0.06 and reached 0.10, and
 * the moves were too small to read at arm's length.
 */
const LEAN = 0.08;
/** And a little further at the moment of contact. */
const REACH = 0.14;
/**
 * Standing back is drawn as standing further UP the path rather than
 * sideways: Kaos is already hard against her edge of the field, so she
 * has nowhere sideways to go, and up-the-path is the axis this
 * battlefield uses for distance anyway.
 */
const STEP_BACK = 0.05;

const OFFSETS: Readonly<Record<CameraPhase, Readonly<Record<CameraRole, CameraOffset>>>> = {
  IDLE: { ACTOR: STILL, ALLY: STILL, TARGET: STILL, BYSTANDER: STILL },
  FOCUS: {
    ACTOR: { inset: LEAN, bottom: 0 },
    ALLY: STILL,
    TARGET: STILL,
    BYSTANDER: STILL,
  },
  RETREAT: {
    // The actor holds the ground they took: the retreat is everybody
    // else's, and a lean that un-leaned to make room for it would read
    // as a flinch rather than a wind-up.
    ACTOR: { inset: LEAN, bottom: 0 },
    ALLY: { inset: 0, bottom: STEP_BACK },
    // The creature does not move. It is what the blow is aimed at and
    // what the player is reading; a target that dodges the camera is a
    // target nobody can follow.
    TARGET: STILL,
    BYSTANDER: STILL,
  },
  IMPACT: {
    ACTOR: { inset: REACH, bottom: 0 },
    ALLY: { inset: 0, bottom: STEP_BACK },
    TARGET: STILL,
    BYSTANDER: STILL,
  },
  RETURN: { ACTOR: STILL, ALLY: STILL, TARGET: STILL, BYSTANDER: STILL },
};

/** How far a role moves in a given moment. */
export function cameraOffset(phase: CameraPhase, role: CameraRole): CameraOffset {
  return OFFSETS[phase][role];
}

/**
 * WHO IS PLAYING WHAT, when the player swings.
 *
 * One case, named as one case. The brief for this pass was to make a
 * single ordinary attack work end to end rather than to guess at every
 * spell, skill and summon at once — so adding the next one is adding a
 * table beside this, and nothing else here has to know.
 *
 * The summoned memory is a BYSTANDER rather than an ally: it arrives on
 * its own timer with its own entrance, and a camera moving it mid-
 * entrance is a second thing animating one element. It will be worth
 * giving a part when somebody asks for one.
 */
export const SWING_ROLES: Readonly<Record<PrototypeSlot, CameraRole>> = {
  hero: 'ACTOR',
  kaos: 'ALLY',
  enemy: 'TARGET',
  enemyDowned: 'BYSTANDER',
  summon: 'BYSTANDER',
};

/**
 * Where a slot is drawn in this moment: the formation, plus the offset.
 *
 * `IDLE` adds nought to both numbers, so what comes back is exactly
 * `prototypeStyle(slot)` — the same object the screen drew before there
 * was a camera.
 */
export function cameraStyle(
  slot: PrototypeSlot,
  phase: CameraPhase,
  roles: Readonly<Record<PrototypeSlot, CameraRole>> = SWING_ROLES,
): ReturnType<typeof placementStyle> {
  const base = PROTOTYPE_PLACEMENTS[slot];
  const shift = cameraOffset(phase, roles[slot]);
  const moved: PrototypePlacement = {
    ...base,
    inset: base.inset + shift.inset,
    bottom: base.bottom + shift.bottom,
  };
  return placementStyle(moved);
}

/**
 * HOW LONG A MOVE TAKES TO BE SEEN.
 *
 * One number, owned here and handed to the stylesheet as a custom
 * property rather than written down twice. It is scaled by the fight's
 * own speed like every other duration on this screen, so ×2 halves it
 * without the CSS learning what speed is.
 *
 * SHORTER THAN THE GAP IT TRAVELS IN, which is the whole point of the
 * number. The first pass glided for 220ms while the phases beneath it
 * were 96 and 102ms apart, so every move was still in flight when the
 * next one retargeted it and no phase was ever actually reached — the
 * field read as drifting rather than as stepping. At 120 a move arrives
 * and is held before the next one begins, which is what makes FOCUS and
 * IMPACT separate things to look at rather than one smear.
 */
export const CAMERA_GLIDE_MS = 120;

/** A phase, and how far into the turn it starts. */
export interface CameraCue {
  phase: CameraPhase;
  /** Milliseconds from the start of the sequence, already speed-scaled. */
  at: number;
}

/**
 * THE CAMERA'S TRACK FOR ONE SWING.
 *
 * Laid over the beats the fight is already playing rather than beside
 * them: the caller hands in the two durations it has ALREADY worked out
 * for the theatre — how long the actor's own beat is held, and how long
 * the whole turn lasts — and every cue is a fraction of those. There is
 * no second clock, no second speed and no millisecond written down
 * here, so the camera cannot drift away from the fight it is filming.
 *
 * The fractions are the shape of a blow: lean, give room, land at not
 * quite three quarters through, and spend what is left going home. The
 * landing sits later than it first did so that the lean has somewhere
 * to be seen before the contact takes over.
 *
 * THE LAST CUE IS ALWAYS IDLE. That is the return guarantee, and it is
 * structural rather than remembered — a turn cannot end anywhere but
 * the formation.
 *
 * `glideMs` buys the return a window. When the creature answers there
 * is half a second of its reply to come home during; when it does
 * nothing at all the turn is one beat long, and without this the field
 * would be told to return and to be at rest in the same instant, which
 * is a snap rather than a return.
 */
export function swingCues(actorBeatMs: number, turnMs: number, glideMs: number): CameraCue[] {
  const beat = Math.max(0, actorBeatMs);
  const returnAt = Math.max(0, Math.min(beat, turnMs));
  return [
    { phase: 'FOCUS', at: 0 },
    { phase: 'RETREAT', at: Math.round(beat * 0.34) },
    { phase: 'IMPACT', at: Math.round(beat * 0.72) },
    { phase: 'RETURN', at: returnAt },
    { phase: 'IDLE', at: Math.max(turnMs, returnAt + Math.max(0, glideMs)) },
  ];
}
