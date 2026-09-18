// ONE SEED, FOUR WOMEN.
//
// The claim this round exists to prove, and the one that decides
// whether a life-collecting game is possible: the same SEED_MAGIC_DREAM
// in the same girl, planted by the same afternoon, becomes a different
// life depending only on what else the world went on to do.
//
// Every world below opens identically — Kaos lights a star in front of
// a curious child at the well — and nothing anywhere chooses between
// the endings. The four futures fall out of whether the village was
// raided, whether anybody bound a wound in front of her, whether Kaos
// kept telling her what was out there, and whether anybody came back.

import { describe, it, expect } from 'vitest';
import { INITIAL_CLOCK } from '../time/calendar';
import {
  advanceTime,
  emptyWorld,
  observe,
  recompute,
  seedsOf,
  traceNpc,
  type WorldLifeRules,
} from './engine';
import type { WorldLifeState } from './types';
import {
  ALDEN_ACTIONS,
  ALDEN_BLOOMS,
  ALDEN_CORES,
  ALDEN_SEED_KINDS,
  ALDEN_VILLAGE_ACTOR,
  KAOS_ACTOR,
  LINA,
  MARTA,
  PLAYER_ACTOR,
} from '../../content/world/aldenLife';

const RULES: WorldLifeRules = {
  actions: ALDEN_ACTIONS,
  kinds: ALDEN_SEED_KINDS,
  cores: ALDEN_CORES,
  blooms: ALDEN_BLOOMS,
};

const WELL = 'ALDEN_VILLAGE';
const HER = LINA.npcId;

/** One thing happening in front of her, at whatever day the world is on. */
function happens(
  state: WorldLifeState,
  action: string,
  actor: string,
  extra: { target?: string | null; witnesses?: string[] } = {},
): WorldLifeState {
  return observe(
    state,
    {
      action,
      actor,
      target: extra.target ?? HER,
      location: WELL,
      witnesses: extra.witnesses ?? [MARTA.npcId],
    },
    RULES,
  ).state;
}

/** Move the world on, the only way it ever moves. */
function later(state: WorldLifeState, days: number): WorldLifeState {
  return advanceTime(state, days, 'STORY_TIME_ADVANCE');
}

/**
 * THE ONE AFTERNOON EVERY LIFE BELOW STARTS FROM.
 *
 * Kaos lights a star in front of a child. Identical in all four worlds,
 * down to the day and the wording, which is what makes the comparison
 * mean anything at all.
 */
function theAfternoon(): WorldLifeState {
  return happens(emptyWorld(INITIAL_CLOCK), 'SHOW_MAGIC', KAOS_ACTOR);
}

/** Somebody comes back and shows her again, every so often. */
function comesBack(state: WorldLifeState, times: number, every = 150): WorldLifeState {
  let world = state;
  for (let i = 0; i < times; i++) {
    world = happens(later(world, every), 'SHOW_MAGIC', KAOS_ACTOR);
  }
  return world;
}

function seedOf(state: WorldLifeState, npcId: string, type: string) {
  return seedsOf(state, RULES, npcId).find((s) => s.type === type);
}

function futures(state: WorldLifeState): string[] {
  return state.blooms.map((bloom) => bloom.id).sort();
}

// ---------------------------------------------------------------------
// THE FOUR WORLDS. Each is a handful of lines, and the difference
// between any two of them is what happened to a village.

/** Raided twice while she grew up, and somebody kept coming back. */
function theVillageThatWasAttacked(): WorldLifeState {
  let world = comesBack(theAfternoon(), 4);
  world = happens(later(world, 50), 'VILLAGE_ATTACKED', 'BANDITS', {
    target: ALDEN_VILLAGE_ACTOR,
    witnesses: [HER, MARTA.npcId],
  });
  world = happens(later(world, 300), 'VILLAGE_ATTACKED', 'BANDITS', {
    target: ALDEN_VILLAGE_ACTOR,
    witnesses: [HER, MARTA.npcId],
  });
  return recompute(later(world, 200), RULES);
}

/** Quiet, but she kept standing next to somebody binding wounds. */
function theVillageWhereSheHelped(): WorldLifeState {
  let world = comesBack(theAfternoon(), 4);
  for (let i = 0; i < 3; i++) {
    world = happens(later(world, 150), 'TENDED_THE_HURT', KAOS_ACTOR, {
      target: MARTA.npcId,
      witnesses: [HER],
    });
  }
  return recompute(later(world, 100), RULES);
}

/** Quiet, and Kaos kept telling her what was out there. */
function theVillageSheWasToldAbout(): WorldLifeState {
  let world = theAfternoon();
  for (let i = 0; i < 6; i++) {
    world = happens(later(world, 150), 'TELL_OF_THE_WORLD', KAOS_ACTOR);
    world = happens(world, 'SHOW_MAGIC', KAOS_ACTOR);
  }
  return recompute(later(world, 60), RULES);
}

/** Nobody ever came back. */
function theVillageNobodyReturnedTo(): WorldLifeState {
  return recompute(later(theAfternoon(), 1500), RULES);
}

describe('the afternoon they all start from', () => {
  it('plants one seed in her, and settles nothing', () => {
    const start = theAfternoon();
    const dream = seedOf(start, HER, 'MAGIC_DREAM');
    expect(dream).toBeDefined();
    expect(dream!.type).toBe('MAGIC_DREAM');
    expect(dream!.status).toBe('GROWING');
    // Her future occupation is not decided here and cannot be.
    expect(start.blooms).toEqual([]);
  });

  it('is the same afternoon in all four worlds, down to the seed', () => {
    // If this ever drifts, every comparison below is comparing two
    // different childhoods and proves nothing.
    const planted = seedOf(theAfternoon(), HER, 'MAGIC_DREAM')!;
    for (const world of [
      theVillageThatWasAttacked(),
      theVillageWhereSheHelped(),
      theVillageSheWasToldAbout(),
      theVillageNobodyReturnedTo(),
    ]) {
      const same = world.seeds.find((s) => s.targetNpcId === HER && s.type === 'MAGIC_DREAM')!;
      expect(same.sourceMemoryId).toBe(planted.sourceMemoryId);
      expect(same.strength).toBe(planted.strength);
      expect(same.createdAt).toEqual(planted.createdAt);
    }
  });

  it('lands on her and not on her mother, from the same afternoon', () => {
    const start = theAfternoon();
    expect(seedOf(start, HER, 'MAGIC_DREAM')).toBeDefined();
    expect(seedOf(start, MARTA.npcId, 'MAGIC_DREAM')).toBeUndefined();
  });
});

describe('THE CLAIM: the same seed becomes four different lives', () => {
  it('村の魔導士 — where the village was raided and she watched', () => {
    const world = theVillageThatWasAttacked();
    const why = traceNpc(world, RULES, HER).join('\n');
    expect(seedOf(world, HER, 'MAGIC_DREAM')!.status, why).toBe('ROOTED');
    expect(futures(world), why).toContain('LINA_VILLAGE_MAGE');
    // And not the other three.
    expect(futures(world)).not.toContain('LINA_WANDERING_MAGE');
    expect(futures(world)).not.toContain('LINA_HEALING_MAGE');
    expect(futures(world)).not.toContain('LINA_GIVES_UP_MAGIC');
  });

  it('治癒魔導士 — where she kept standing next to the hurt', () => {
    const world = theVillageWhereSheHelped();
    const why = traceNpc(world, RULES, HER).join('\n');
    expect(futures(world), why).toContain('LINA_HEALING_MAGE');
    expect(futures(world)).not.toContain('LINA_VILLAGE_MAGE');
    expect(futures(world)).not.toContain('LINA_WANDERING_MAGE');
  });

  it('放浪魔導士 — where somebody kept telling her what was out there', () => {
    const world = theVillageSheWasToldAbout();
    const why = traceNpc(world, RULES, HER).join('\n');
    expect(futures(world), why).toContain('LINA_WANDERING_MAGE');
    expect(futures(world)).not.toContain('LINA_VILLAGE_MAGE');
    expect(futures(world)).not.toContain('LINA_HEALING_MAGE');
  });

  it('魔法を諦める — where nobody ever came back', () => {
    const world = theVillageNobodyReturnedTo();
    const why = traceNpc(world, RULES, HER).join('\n');
    expect(seedOf(world, HER, 'MAGIC_DREAM')!.status, why).toBe('FADED');
    expect(futures(world), why).toContain('LINA_GIVES_UP_MAGIC');
    // Nothing else. A life that went nowhere is still a life the world
    // has an answer about.
    expect(futures(world)).toEqual(['LINA_GIVES_UP_MAGIC']);
  });

  it('and the four worlds genuinely disagree', () => {
    // Stated as one assertion so that a change which quietly collapses
    // two of them into the same answer fails here rather than passing
    // three tests out of four.
    const answers = [
      theVillageThatWasAttacked(),
      theVillageWhereSheHelped(),
      theVillageSheWasToldAbout(),
      theVillageNobodyReturnedTo(),
    ].map((world) => futures(world).join('+'));
    expect(new Set(answers).size).toBe(4);
  });
});

describe('what makes the difference, one thing at a time', () => {
  it('the village: a raid is a rope, and she does not leave', () => {
    // The wandering world, with one raid added and nothing else
    // changed. The same girl, the same tellings, a different answer.
    let world = theAfternoon();
    for (let i = 0; i < 6; i++) {
      world = happens(later(world, 150), 'TELL_OF_THE_WORLD', KAOS_ACTOR);
      world = happens(world, 'SHOW_MAGIC', KAOS_ACTOR);
    }
    const free = recompute(later(world, 60), RULES);
    const roped = recompute(
      later(
        happens(world, 'VILLAGE_ATTACKED', 'BANDITS', {
          target: ALDEN_VILLAGE_ACTOR,
          witnesses: [HER, MARTA.npcId],
        }),
        60,
      ),
      RULES,
    );
    expect(futures(free)).toContain('LINA_WANDERING_MAGE');
    expect(futures(roped)).not.toContain('LINA_WANDERING_MAGE');
  });

  it('her hands: wanting it is not enough without something to do it with', () => {
    // The healing world, given to a girl with no hand for healing.
    // Everything that happened to her is identical.
    const clumsy = { ...LINA, aptitudes: { ...LINA.aptitudes, HEALING: 0.1 } };
    const rules: WorldLifeRules = {
      ...RULES,
      cores: ALDEN_CORES.map((core) => (core.npcId === HER ? clumsy : core)),
    };
    const world = recompute({ ...theVillageWhereSheHelped() }, rules);
    expect(world.blooms.map((b) => b.id)).not.toContain('LINA_HEALING_MAGE');
  });

  it('her temperament: being a little timid is what makes leaving hard', () => {
    // The same six tellings, to a girl who is not timid. She wants the
    // world sooner, and that is the only thing that changed.
    const bold = { ...LINA, traits: LINA.traits.filter((t) => t !== 'TIMID') };
    const rules: WorldLifeRules = {
      ...RULES,
      cores: ALDEN_CORES.map((core) => (core.npcId === HER ? bold : core)),
    };
    let timid = theAfternoon();
    let brave = observe(
      emptyWorld(INITIAL_CLOCK),
      { action: 'SHOW_MAGIC', actor: KAOS_ACTOR, target: HER, location: WELL, witnesses: [] },
      rules,
    ).state;
    for (let i = 0; i < 2; i++) {
      timid = happens(later(timid, 150), 'TELL_OF_THE_WORLD', KAOS_ACTOR);
      brave = observe(
        later(brave, 150),
        { action: 'TELL_OF_THE_WORLD', actor: KAOS_ACTOR, target: HER, location: WELL },
        rules,
      ).state;
    }
    const hers = seedsOf(timid, RULES, HER).find((s) => s.type === 'OUTSIDE_WORLD_DREAM')!;
    const theirs = seedsOf(brave, rules, HER).find((s) => s.type === 'OUTSIDE_WORLD_DREAM')!;
    expect(hers.strength).toBeLessThan(theirs.strength);
  });

  it('somebody staying a person to her: a wanting with nobody attached goes nowhere', () => {
    const world = theVillageSheWasToldAbout();
    expect(futures(world)).toContain('LINA_WANDERING_MAGE');
    // The same seeds, with the records of who did any of it removed.
    const nameless = recompute({ ...world, memories: [] }, RULES);
    expect(nameless.blooms.map((b) => b.id)).not.toContain('LINA_WANDERING_MAGE');
  });

  it('the village’s own state, which is not about her at all', () => {
    // A village that has been quiet for fifteen years does not need a
    // defender, however much she once wanted to be one.
    const raided = theVillageThatWasAttacked();
    expect(futures(raided)).toContain('LINA_VILLAGE_MAGE');
    const longQuiet = recompute(later(raided, 365 * 15), RULES);
    expect(seedOf(longQuiet, ALDEN_VILLAGE_ACTOR, 'PROTECT_VILLAGE')!.status).toBe('FADED');
    expect(futures(longQuiet)).not.toContain('LINA_VILLAGE_MAGE');
  });
});

describe('what is still not decided', () => {
  it('offers candidates, never a life', () => {
    for (const world of [
      theVillageThatWasAttacked(),
      theVillageWhereSheHelped(),
      theVillageSheWasToldAbout(),
      theVillageNobodyReturnedTo(),
    ]) {
      for (const bloom of world.blooms) expect(bloom.status).toBe('CANDIDATE');
    }
  });

  it('has no requirement anywhere that names who did it', () => {
    // A future is about what is true of her, never about whether the
    // player was the one who made it true. If PLAYER ever appears in a
    // requirement, the engine has started rewarding the player.
    for (const bloom of ALDEN_BLOOMS) {
      expect(JSON.stringify(bloom.requirements), bloom.id).not.toContain(PLAYER_ACTOR);
    }
  });

  it('shows no number a screen could turn into a bar', () => {
    for (const bloom of ALDEN_BLOOMS) {
      expect(bloom.result).not.toMatch(/[0-9]/);
      expect(bloom.result).not.toMatch(/SEED|POINT|LEVEL|\+/);
    }
  });
});
