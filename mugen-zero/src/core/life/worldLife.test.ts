// THE CHAIN, END TO END, on one girl in one village.
//
// The success condition of the whole round, written as something that
// fails when it stops being true:
//
//   player action → memory → seed → time passing → growth
//                 → conditions met → bloom candidate
//
// Plus the four things the engine must REFUSE to do, which are harder
// to keep true than the chain itself and matter more.

import { describe, it, expect } from 'vitest';
import { INITIAL_CLOCK, addDays, type WorldClock } from '../time/calendar';
import {
  advanceTime,
  emptyWorld,
  observe,
  recompute,
  seedsOf,
  traceNpc,
  type WorldLifeRules,
} from './engine';
import { statusOf, ROOTED_AT, GROWING_AT } from './growth';
import { checkBloom } from './bloom';
import {
  ALDEN_ACTIONS,
  ALDEN_BLOOMS,
  ALDEN_CORES,
  ALDEN_SEED_KINDS,
  LINA,
  PLAYER_ACTOR,
} from '../../content/world/aldenLife';

const RULES: WorldLifeRules = {
  actions: ALDEN_ACTIONS,
  kinds: ALDEN_SEED_KINDS,
  cores: ALDEN_CORES,
  blooms: ALDEN_BLOOMS,
};

const WELL = 'ALDEN_VILLAGE';

/** The player lights a star in front of the pair of them at the well. */
function showMagic(state = emptyWorld(INITIAL_CLOCK)) {
  return observe(
    state,
    {
      action: 'SHOW_MAGIC',
      actor: PLAYER_ACTOR,
      target: 'alden_lina',
      location: WELL,
      witnesses: ['alden_marta'],
      metadata: { spell: 'starlight_bolt' },
    },
    RULES,
  );
}

function seedOf(state: Parameters<typeof seedsOf>[0], npcId: string, type: string) {
  return seedsOf(state, RULES, npcId).find((seed) => seed.type === type);
}

describe('ACTION → WORLD MEMORY', () => {
  it('writes down what was done, where, and who saw — and nothing about what it meant', () => {
    const { memory } = showMagic();
    expect(memory.actor).toBe(PLAYER_ACTOR);
    expect(memory.target).toBe('alden_lina');
    expect(memory.action).toBe('SHOW_MAGIC');
    expect(memory.location).toBe(WELL);
    expect(memory.witnesses).toEqual(['alden_marta']);
    expect(memory.time).toEqual(INITIAL_CLOCK);
    expect(memory.metadata.spell).toBe('starlight_bolt');
    // The record carries no outcome, no seed, no judgement. If a field
    // ever appears here saying what somebody became, the engine has
    // started settling futures at the moment of the action.
    expect(Object.keys(memory)).not.toContain('result');
  });

  it('keeps a record of a thing that changed nobody', () => {
    const { state, planted } = observe(
      emptyWorld(INITIAL_CLOCK),
      { action: 'SHARE_BREAD', actor: PLAYER_ACTOR, target: 'alden_marta', location: WELL },
      RULES,
    );
    expect(state.memories).toHaveLength(1);
    // Marta values QUIET and FAMILY, so bread does land on her — what
    // must be true is that history exists either way.
    expect(state.memories[0].action).toBe('SHARE_BREAD');
    expect(planted.length).toBeGreaterThanOrEqual(0);
  });

  it('does not write the same happening twice', () => {
    const once = showMagic();
    const twice = showMagic(once.state);
    expect(twice.state.memories).toHaveLength(1);
    expect(twice.planted).toEqual([]);
  });
});

describe('WORLD MEMORY → WORLD SEED', () => {
  it('plants a wanting, not a future', () => {
    const { state, planted } = showMagic();
    expect(planted).toHaveLength(1);
    const seed = planted[0];
    expect(seed.targetNpcId).toBe('alden_lina');
    expect(seed.type).toBe('MAGIC_DREAM');
    expect(seed.sourceMemoryId).toBe(state.memories[0].id);
    // Nothing about her future is settled by this. She is not a mage,
    // she is not going to be one, and the world holds no promise that
    // she will.
    expect(state.blooms).toEqual([]);
  });

  it('lands on the girl and not on her mother, from the same afternoon', () => {
    // The claim the whole design rests on: the action is the same, the
    // day is the same, the room is the same. Who they already were is
    // the difference, and nothing anywhere was written to make Lina the
    // special one — she simply has the aptitude and the curiosity.
    const { state } = showMagic();
    expect(seedOf(state, 'alden_lina', 'MAGIC_DREAM')).toBeDefined();
    expect(seedOf(state, 'alden_marta', 'MAGIC_DREAM')).toBeUndefined();
  });

  it('plants nothing in somebody the world has never written down', () => {
    const { planted } = observe(
      emptyWorld(INITIAL_CLOCK),
      { action: 'SHOW_MAGIC', actor: PLAYER_ACTOR, target: 'a_passing_carter', location: WELL },
      RULES,
    );
    expect(planted).toEqual([]);
  });

  it('never plants anything in the person doing it', () => {
    const { planted } = observe(
      emptyWorld(INITIAL_CLOCK),
      {
        action: 'SHOW_MAGIC',
        actor: 'alden_lina',
        target: null,
        location: WELL,
        witnesses: ['alden_lina', 'alden_marta'],
      },
      RULES,
    );
    expect(planted.map((seed) => seed.targetNpcId)).not.toContain('alden_lina');
  });

  it('keeps a kindness to itself: only the person it was done to feels it', () => {
    const { planted } = observe(
      emptyWorld(INITIAL_CLOCK),
      {
        action: 'SHARE_BREAD',
        actor: PLAYER_ACTOR,
        target: 'alden_marta',
        location: WELL,
        witnesses: ['alden_lina'],
      },
      RULES,
    );
    expect(planted.map((seed) => seed.targetNpcId)).toEqual(['alden_marta']);
  });
});

describe('時間経過 → WORLD GROWTH', () => {
  it('moves only when the story moves it, and says why in the record', () => {
    const { state } = showMagic();
    const later = advanceTime(state, 200, 'STORY_TIME_ADVANCE');
    expect(later.now).toEqual(addDays(INITIAL_CLOCK, 200));
    const written = later.memories[later.memories.length - 1];
    expect(written.action).toBe('STORY_TIME_ADVANCE');
    expect(written.actor).toBe('WORLD');
    expect(written.metadata.days).toBe(200);
  });

  it('fades a wanting nobody comes back for', () => {
    const { state } = showMagic();
    const fresh = seedOf(state, 'alden_lina', 'MAGIC_DREAM')!;
    const years = recompute(advanceTime(state, 365 * 3, 'STORY_TIME_ADVANCE'), RULES);
    const worn = seedOf(years, 'alden_lina', 'MAGIC_DREAM')!;
    expect(worn.strength).toBeLessThan(fresh.strength);
  });

  it('asks rather than ticks: a world jumped to a day is the world walked to it', () => {
    // The property that makes a thousand people cost nothing. If this
    // ever fails, something has started simulating.
    const { state } = showMagic();
    const jumped = recompute(advanceTime(state, 300, 'STORY_TIME_ADVANCE'), RULES);
    let walked = state;
    for (let i = 0; i < 300; i++) walked = advanceTime(walked, 1, 'STORY_TIME_ADVANCE');
    walked = recompute(walked, RULES);
    expect(seedOf(walked, 'alden_lina', 'MAGIC_DREAM')!.strength).toBeCloseTo(
      seedOf(jumped, 'alden_lina', 'MAGIC_DREAM')!.strength,
      10,
    );
  });

  it('holds what is fed, and deepens it', () => {
    let world = showMagic().state;
    const once = seedOf(world, 'alden_lina', 'MAGIC_DREAM')!.strength;
    // Four more visits over three years.
    for (let i = 0; i < 4; i++) {
      world = advanceTime(world, 270, 'JOURNEY');
      world = showMagic(world).state;
    }
    const fed = seedOf(world, 'alden_lina', 'MAGIC_DREAM')!;
    expect(fed.fedBy.length).toBe(4);
    expect(fed.strength).toBeGreaterThan(once);
    expect(fed.status).toBe('ROOTED');
  });

  it('is a different thing from having been struck once very hard', () => {
    // What makes a life take time. One enormous afternoon and five
    // ordinary ones do not arrive at the same place three years later.
    let steady = showMagic().state;
    for (let i = 0; i < 4; i++) {
      steady = advanceTime(steady, 200, 'SEASON_TURN');
      steady = showMagic(steady).state;
    }
    steady = recompute(advanceTime(steady, 200, 'SEASON_TURN'), RULES);

    const struck = recompute(advanceTime(showMagic().state, 1000, 'SEASON_TURN'), RULES);
    expect(seedOf(steady, 'alden_lina', 'MAGIC_DREAM')!.strength).toBeGreaterThan(
      seedOf(struck, 'alden_lina', 'MAGIC_DREAM')!.strength,
    );
  });
});

describe('WORLD VINE', () => {
  it('draws a line to the person who was there when it started', () => {
    const { state } = showMagic();
    const vine = state.vines.find((v) => v.relationType === 'INSPIRED_BY');
    expect(vine).toBeDefined();
    expect(vine!.source).toBe('alden_lina');
    expect(vine!.target).toBe(PLAYER_ACTOR);
    expect(vine!.sourceSeedIds.length).toBeGreaterThan(0);
  });

  it('draws one to the thing itself, whoever showed it to her', () => {
    const { state } = showMagic();
    expect(
      state.vines.some((v) => v.relationType === 'DRAWN_TO' && v.target === 'MAGIC_DREAM'),
    ).toBe(true);
  });

  it('lets go of a line whose reason wore out, rather than forgetting it', () => {
    const { state } = showMagic();
    const long = recompute(advanceTime(state, 365 * 8, 'STORY_TIME_ADVANCE'), RULES);
    const vine = long.vines.find((v) => v.relationType === 'INSPIRED_BY');
    expect(vine?.status).toBe('BROKEN');
  });
});

describe('WORLD BLOOM', () => {
  it('offers nothing on the day it happened', () => {
    expect(showMagic().state.blooms).toEqual([]);
  });

  it('finds a candidate once it has rooted, been held, and been given time', () => {
    // THE SUCCESS CONDITION OF THE ROUND.
    let world = showMagic().state;
    for (let i = 0; i < 4; i++) {
      world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
      world = showMagic(world).state;
    }
    world = recompute(world, RULES);

    const seed = seedOf(world, 'alden_lina', 'MAGIC_DREAM')!;
    expect(seed.status).toBe('ROOTED');

    const bloom = world.blooms.find((b) => b.id === 'LINA_LEAVES_TO_STUDY_MAGIC');
    expect(bloom, traceNpc(world, RULES, 'alden_lina').join('\n')).toBeDefined();
    // And it is a CANDIDATE. Not a fact, not her future, not something
    // the engine has done to her.
    expect(bloom!.status).toBe('CANDIDATE');
    expect(bloom!.npcId).toBe('alden_lina');
  });

  it('will not offer it to somebody nobody stayed a person to', () => {
    // Same wanting, same depth, nobody attached: a different life.
    let world = showMagic().state;
    for (let i = 0; i < 4; i++) {
      world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
      world = showMagic(world).state;
    }
    world = recompute(world, RULES);
    const orphaned = recompute({ ...world, memories: [] }, RULES);
    expect(
      orphaned.blooms.some((b) => b.id === 'LINA_LEAVES_TO_STUDY_MAGIC'),
    ).toBe(false);
  });

  it('stops being a candidate if the reason for it goes away', () => {
    let world = showMagic().state;
    for (let i = 0; i < 4; i++) {
      world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
      world = showMagic(world).state;
    }
    world = recompute(world, RULES);
    expect(world.blooms.length).toBeGreaterThan(0);
    const abandoned = recompute(advanceTime(world, 365 * 12, 'STORY_TIME_ADVANCE'), RULES);
    expect(abandoned.blooms.some((b) => b.id === 'LINA_LEAVES_TO_STUDY_MAGIC')).toBe(false);
  });

  it('says what it is still waiting for, not just no', () => {
    const { state } = showMagic();
    const check = checkBloom(ALDEN_BLOOMS[0], {
      defs: ALDEN_BLOOMS,
      seeds: state.seeds,
      vines: state.vines,
      kinds: ALDEN_SEED_KINDS,
      now: state.now,
      since: state.now,
    });
    expect(check.met).toBe(false);
    expect(check.reasons.length).toBe(3);
    expect(check.reasons.some((reason) => !reason.met)).toBe(true);
    for (const reason of check.reasons) expect(reason.detail).toBeTruthy();
  });
});

describe('what the engine must refuse to do', () => {
  it('holds no table of (what the player did → what somebody became)', () => {
    // A bloom is written in terms of the person, never the deed. If a
    // requirement ever names an action, the table has arrived.
    const actionIds = ALDEN_ACTIONS.map((action) => action.id);
    for (const bloom of ALDEN_BLOOMS) {
      const written = JSON.stringify(bloom.requirements);
      for (const id of actionIds) expect(written, bloom.id).not.toContain(id);
    }
  });

  it('costs nothing for the people nobody is looking at', () => {
    // Marta is in the village, in the room, and in the records. No
    // seeds, so nothing about her is computed, stored or aged.
    const { state } = showMagic();
    const years = advanceTime(state, 365 * 5, 'STORY_TIME_ADVANCE');
    expect(seedsOf(years, RULES, 'alden_marta')).toEqual([]);
    expect(years.seeds.filter((seed) => seed.targetNpcId === 'alden_marta')).toEqual([]);
  });

  it('gives the same world for the same records, however it was arrived at', () => {
    const a = recompute(advanceTime(showMagic().state, 400, 'JOURNEY'), RULES);
    const b = recompute(advanceTime(showMagic().state, 400, 'JOURNEY'), RULES);
    expect(a.seeds).toEqual(b.seeds);
    expect(a.vines).toEqual(b.vines);
    expect(a.blooms).toEqual(b.blooms);
  });

  it('needs nothing outside itself to decide any of it', () => {
    // No clock read, no randomness, no network, no model. The whole
    // chain is a function of the records and the date.
    const at = (now: WorldClock) =>
      recompute({ ...showMagic().state, now }, RULES).blooms.map((b) => b.id);
    expect(at(addDays(INITIAL_CLOCK, 500))).toEqual(at(addDays(INITIAL_CLOCK, 500)));
  });
});

describe('the developer’s view of why somebody is the way they are', () => {
  it('reads the chain back in order, from the action to the candidate', () => {
    let world = showMagic().state;
    for (let i = 0; i < 4; i++) {
      world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
      world = showMagic(world).state;
    }
    world = recompute(world, RULES);
    const trace = traceNpc(world, RULES, 'alden_lina').join('\n');

    expect(trace).toContain('CORE');
    expect(trace).toContain('SEED   MAGIC_DREAM ROOTED');
    expect(trace).toContain('FROM ACTION SHOW_MAGIC by PLAYER');
    expect(trace).toContain('FED');
    expect(trace).toContain('VINE   INSPIRED_BY → PLAYER');
    expect(trace).toContain('BLOOM  LINA_LEAVES_TO_STUDY_MAGIC CANDIDATE');
  });

  it('says plainly when it knows nothing about somebody', () => {
    const trace = traceNpc(showMagic().state, RULES, 'a_passing_carter').join('\n');
    expect(trace).toContain('この世界に記録がない');
    expect(trace).toContain('SEED   なし');
  });
});

describe('the four words a seed is ever in', () => {
  it('reads them off the one number, so they cannot disagree', () => {
    expect(statusOf(0)).toBe('FADED');
    expect(statusOf(GROWING_AT - 0.01)).toBe('DORMANT');
    expect(statusOf(GROWING_AT)).toBe('GROWING');
    expect(statusOf(ROOTED_AT)).toBe('ROOTED');
    expect(statusOf(1)).toBe('ROOTED');
  });

  it('never lets one afternoon root anything, whoever it lands on', () => {
    // The hard ceiling on the player's reach. The most suggestible
    // person in the world, shown the most impressive thing there is,
    // still only has something that is GROWING at most.
    const most = ALDEN_ACTIONS.reduce((a, b) => (a.impact > b.impact ? a : b));
    const perfect = { ...LINA, aptitudes: { MAGIC: 1 } };
    const { planted } = observe(
      emptyWorld(INITIAL_CLOCK),
      { action: most.id, actor: PLAYER_ACTOR, target: perfect.npcId, location: WELL },
      { ...RULES, cores: [perfect] },
    );
    expect(planted[0].status).not.toBe('ROOTED');
  });
});
