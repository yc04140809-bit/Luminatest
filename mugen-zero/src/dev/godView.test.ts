// WHAT THE AUTHOR CAN SEE.
//
// GOD VIEW is a tool for growing a world, so what it has to get right
// is not rendering — it is the four quiet failures that never throw:
//
//   a villager nobody's life touches
//   somebody the engine grows futures for that the roster cannot see
//   a future nothing in the world can currently reach
//   a region with no line into it
//
// These tests are about the data. The screen is a table on top of it.

import { describe, it, expect } from 'vitest';
import { INITIAL_CLOCK, addDays, toAbsoluteDay } from '../core/time/calendar';
import type { MemoryEvent } from '../core/memory/types';
import { canonAsWorldMemories } from '../core/life/canonBridge';
import {
  advanceTime,
  emptyWorld,
  observe,
  replayCanon,
  settle,
  type WorldLifeRules,
} from '../core/life/engine';
import type { WorldLifeState } from '../core/life/types';
import {
  ALDEN_REGION,
  GALD,
  LINA,
  MUGEN_WORLD_RULES,
  NEL,
  PLAYER_ACTOR,
  PORT_REGION,
  WORLD_PEOPLE,
} from '../content/world/mugenWorld';
import { GREENWOOD_PRELUDE } from '../content/world/galdLife';
import {
  isolatedPeople,
  memoriesFor,
  observeWorld,
  rosterLine,
  seedsFor,
  unreachedBlooms,
  PERSONAL_VINE,
} from './godView';
import type { CharacterState } from '../core/characters/types';
import { INITIAL_LINA_STATE } from '../content/characters/lina';
import { INITIAL_BAKERY_OWNER_STATE } from '../content/characters/bakeryOwner';

const RULES: WorldLifeRules = MUGEN_WORLD_RULES;
const HER = LINA.npcId;

function canon(type: MemoryEvent['type'], day: number, actors: string[], at: string): MemoryEvent {
  const when = addDays(INITIAL_CLOCK, day);
  return {
    id: `evt_${type}_${day}`,
    type,
    worldYear: when.worldYear,
    worldDay: when.worldDay,
    location: at,
    actors,
    importance: 'MAJOR',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/** The HELP world, four years on, with the crossings all played out. */
function grownWorld(days = 1500): WorldLifeState {
  let world = emptyWorld(INITIAL_CLOCK);
  for (const fact of GREENWOOD_PRELUDE) {
    world = observe(world, { ...fact, witnesses: [...fact.witnesses] }, RULES).state;
  }
  for (let i = 0; i < 5; i++) {
    if (i > 0) world = advanceTime(world, 150, 'STORY_TIME_ADVANCE');
    world = observe(
      world,
      {
        action: 'SHOW_MAGIC',
        actor: 'KAOS',
        target: HER,
        location: 'ALDEN_VILLAGE',
        witnesses: ['alden_marta'],
      },
      RULES,
    ).state;
  }
  world = replayCanon(
    world,
    canonAsWorldMemories([
      canon('PLAYER_HELPED_GALD', 1, [PLAYER_ACTOR, GALD], 'ALDEN_FOREST'),
      canon('GALD_WALKS_THE_ROAD', 5, [GALD], 'GREENWOOD_FOREST'),
      canon('GALD_BECOMES_HEALER', 125, [GALD], 'GREENWOOD_WAYSTATION'),
    ]),
    RULES,
  );
  while (toAbsoluteDay(world.now) - 1 < days) {
    const step = Math.min(180, days - (toAbsoluteDay(world.now) - 1));
    world = settle(advanceTime(world, step, 'STORY_TIME_ADVANCE'), RULES);
  }
  return settle(world, RULES);
}

const GALD_STATE: CharacterState = {
  id: GALD,
  name: 'ガルド',
  age: 34,
  alive: true,
  location: 'GREENWOOD_WAYSTATION',
  occupation: 'ROADSIDE_HEALER',
  lifePhase: 'ADULT',
  spouseId: null,
  childrenIds: [],
};

const look = (state = grownWorld(), region = ALDEN_REGION) =>
  observeWorld(state, RULES, WORLD_PEOPLE, region, { [GALD]: GALD_STATE });

function person(view: ReturnType<typeof look>, npcId: string) {
  return [...view.people, ...view.outsiders].find((p) => p.npcId === npcId)!;
}

describe('the roster', () => {
  it('holds only the region being looked at', () => {
    const view = look();
    expect(view.region).toBe(ALDEN_REGION);
    for (const p of view.people) expect(p.region).toBe(ALDEN_REGION);
    expect(view.people.map((p) => p.npcId)).toContain(HER);
    expect(view.people.map((p) => p.npcId)).not.toContain(NEL);
  });

  it('separates the people the story is about from the people who live there', () => {
    const view = look();
    const principals = view.people.filter((p) => p.standing === 'PRINCIPAL');
    const ordinary = view.people.filter((p) => p.standing === 'ORDINARY');
    expect(principals.map((p) => p.npcId)).toContain(GALD);
    expect(ordinary.map((p) => p.npcId)).toContain('alden_marta');
    // And a village is neither.
    expect(view.people.find((p) => p.npcId === 'ALDEN_VILLAGE')!.standing).toBe('PLACE');
  });

  it('says what canon knows, and says plainly when canon knows nothing', () => {
    const view = look();
    expect(rosterLine(person(view, GALD))).toContain('生存 34歳 / ROADSIDE_HEALER');
    // The other branch, checked with a character map that deliberately
    // holds only Gald. It used to be a statement about Lina — the
    // engine was growing four futures for a girl no scene could show —
    // and she has a record now, so what is left under test is that the
    // screen still SAYS SO for whoever is in that position next, rather
    // than quietly printing an empty age.
    expect(rosterLine(person(view, HER))).toContain('CHARACTER_STATE未登録');
  });

  it('counts what each person is carrying, in one line', () => {
    const line = rosterLine(person(look(), HER));
    expect(line).toContain('リナ（村娘）');
    // And the id, because the reader is the person who writes the rules.
    expect(line).toContain('<LINA>');
    expect(line).toMatch(/SEED:[1-9]/);
    expect(line).toMatch(/VINE:[1-9]/);
  });

  it('reports anybody the engine grows lives for that the roster cannot see', () => {
    const view = observeWorld(
      grownWorld(),
      RULES,
      WORLD_PEOPLE.filter((p) => p.npcId !== 'alden_marta'),
      ALDEN_REGION,
    );
    expect(view.unlisted).toContain('alden_marta');
  });
});

describe('孤立NPC — the question this screen exists to answer', () => {
  it('finds the woman nobody’s life touches', () => {
    // Marta was in the room for every spell her daughter was ever shown
    // and was moved by none of them. She appears in a dozen records and
    // is, in the sense that matters here, alone.
    const alone = isolatedPeople(look()).map((p) => p.npcId);
    expect(alone).toContain('alden_marta');
    expect(memoriesFor(grownWorld(), 'alden_marta').length).toBeGreaterThan(3);
  });

  it('does not call somebody isolated for being in no records', () => {
    // Being alone is about lines between people, not about appearing.
    const marta = person(look(), 'alden_marta');
    expect(marta.memories.length).toBeGreaterThan(0);
    expect(marta.isolated).toBe(true);
  });

  it('does not mistake being drawn to a THING for being tied to a person', () => {
    // A girl with a seed has a DRAWN_TO vine pointing at the seed type.
    // Counting that would make everybody look connected and the whole
    // screen would find nothing, ever.
    const lina = person(look(), HER);
    expect(lina.vinesOut.some((v) => v.relationType === 'DRAWN_TO')).toBe(true);
    expect(lina.linkedTo).not.toContain('MAGIC_DREAM');
    // Everything she is tied to is somebody the world has an entry for.
    for (const id of lina.linkedTo) {
      expect(RULES.kinds.map((k) => k.type), id).not.toContain(id);
    }
  });

  it('reports somebody who is in people\u2019s lives but not in the roster', () => {
    // The failure this found on its own the first time it was run: Kaos
    // shows a girl a spell for five years, holds no seed of her own,
    // and had no roster entry — so she was at the root of the world's
    // first seed and invisible to the only screen that could have said
    // so. A check that looked only at seeds and cores missed her.
    const view = observeWorld(
      grownWorld(),
      RULES,
      WORLD_PEOPLE.filter((p) => p.npcId !== 'KAOS'),
      ALDEN_REGION,
    );
    expect(view.unlisted).toContain('KAOS');
    // And with her listed, the world is complete.
    expect(look().unlisted).toEqual([]);
  });

  it('does not call a village lonely', () => {
    expect(isolatedPeople(look()).map((p) => p.npcId)).not.toContain('ALDEN_VILLAGE');
  });

  it('finds everybody alone in a world where nothing has happened yet', () => {
    const empty = settle(emptyWorld(INITIAL_CLOCK), RULES);
    const alone = isolatedPeople(observeWorld(empty, RULES, WORLD_PEOPLE, ALDEN_REGION));
    expect(alone.map((p) => p.npcId)).toContain(HER);
    expect(alone.map((p) => p.npcId)).toContain(GALD);
  });

  it('stops calling somebody alone the moment a life touches theirs', () => {
    const before = person(look(grownWorld(400)), HER);
    const after = person(look(grownWorld(1500)), HER);
    expect(before.linkedTo).not.toContain(GALD);
    expect(after.linkedTo).toContain(GALD);
  });
});

describe('選択したNPCだけに絞り込む', () => {
  it('gives only that person’s records, seeds, lines and futures', () => {
    const view = look();
    const lina = person(view, HER);

    for (const memory of lina.memories) {
      expect([memory.actor, memory.target, ...memory.witnesses]).toContain(HER);
    }
    for (const seed of lina.seeds) expect(seed.targetNpcId).toBe(HER);
    for (const vine of lina.vinesOut) expect(vine.source).toBe(HER);
    for (const vine of lina.vinesIn) expect(vine.target).toBe(HER);
    for (const bloom of lina.blooms) expect(bloom.npcId).toBe(HER);

    // And it is a genuine narrowing, not the whole world relabelled.
    expect(lina.memories.length).toBeLessThan(view.memories.length);
  });

  it('shows a seed’s strength and state as they stand today', () => {
    const seeds = seedsFor(grownWorld(), RULES, HER);
    expect(seeds.length).toBeGreaterThan(1);
    for (const seed of seeds) {
      expect(seed.strength).toBeGreaterThanOrEqual(0);
      expect(seed.strength).toBeLessThanOrEqual(1);
      expect(['DORMANT', 'GROWING', 'ROOTED', 'FADED']).toContain(seed.status);
    }
    // Deepest first, so the thing that is most true of somebody is the
    // first thing read.
    expect(seeds[0].strength).toBeGreaterThanOrEqual(seeds[seeds.length - 1].strength);
  });

  it('shows every future written about them, not only the open ones', () => {
    const lina = person(look(), HER);
    expect(lina.bloomChecks.length).toBeGreaterThan(lina.blooms.length);
    for (const check of lina.bloomChecks) expect(check.def.npcId).toBe(HER);
  });
});

describe('他地域接続', () => {
  it('shows the boy in the port because a line runs to him, not because he lives there', () => {
    const view = look();
    expect(view.outsiders.map((p) => p.npcId)).toContain(NEL);
    expect(view.outsiders.find((p) => p.npcId === NEL)!.region).toBe(PORT_REGION);
    // And he is not in the Alden roster.
    expect(view.people.map((p) => p.npcId)).not.toContain(NEL);
  });

  it('names which of a person’s ties reach out of the region', () => {
    const gald = person(look(), GALD);
    expect(gald.linkedOutside.map((o) => o.npcId)).toContain(NEL);
    expect(gald.linkedOutside.every((o) => o.region !== ALDEN_REGION)).toBe(true);
  });

  it('shows no outsiders in a world where nothing has reached out yet', () => {
    expect(look(grownWorld(400)).outsiders).toEqual([]);
  });
});

describe('what is holding the world up', () => {
  it('lists every future not yet reached, with the requirement blocking it', () => {
    const blocked = unreachedBlooms(look());
    expect(blocked.length).toBeGreaterThan(0);
    for (const entry of blocked) expect(entry.blocking.length).toBeGreaterThan(0);
    // A future this route genuinely cannot reach, named with its reason.
    const village = blocked.find((b) => b.id === 'GALD_RETURNS_TO_THE_VILLAGE');
    expect(village).toBeDefined();
    expect(village!.blocking.join(' ')).toContain('GALD_ROOTS_IN_ALDEN');
  });

  it('lists every crossing and whether it has happened', () => {
    const view = look();
    expect(view.crossings.length).toBe((RULES.crossings ?? []).length);
    expect(view.crossings.filter((c) => c.already).length).toBeGreaterThan(0);
  });
});

describe('it can only look', () => {
  it('changes nothing about the world it was handed', () => {
    const world = grownWorld();
    const before = JSON.stringify(world);
    const view = look(world);
    isolatedPeople(view);
    unreachedBlooms(view);
    expect(JSON.stringify(world)).toBe(before);
  });

  it('counts a line between two people only once, whichever end it is read from', () => {
    const view = look();
    const lina = person(view, HER);
    const gald = person(view, GALD);
    expect(lina.linkedTo).toContain(GALD);
    expect(gald.linkedTo).toContain(HER);
    expect(new Set(lina.linkedTo).size).toBe(lina.linkedTo.length);
  });

  it('uses one name for a personal line, so the definition cannot drift', () => {
    expect(PERSONAL_VINE).toBe('BECAUSE_OF');
  });
});

describe('CHARACTER_STATE と家族関係', () => {
  /** The real initial characters, as `World.open` would hand them over. */
  const REAL: Record<string, CharacterState | undefined> = {
    LINA: INITIAL_LINA_STATE,
    BAKERY_OWNER: INITIAL_BAKERY_OWNER_STATE,
  };
  const withCanon = () =>
    observeWorld(grownWorld(), RULES, WORLD_PEOPLE, ALDEN_REGION, REAL);

  it('shows what canon now knows about the girl', () => {
    const line = rosterLine(person(withCanon(), 'LINA'));
    expect(line).toContain('生存 14歳');
    expect(line).toContain('BAKERY_HELPER');
    // No longer the "engine is growing futures for somebody no scene
    // can show" case, which is what it said before she was registered.
    expect(line).not.toContain('CHARACTER_STATE未登録');
  });

  it('says 年齢未定 rather than printing a null', () => {
    // The baker's age is a decision nobody has made. A screen that
    // rendered `null歳` would make that look like a bug.
    const line = rosterLine(person(withCanon(), 'BAKERY_OWNER'));
    expect(line).toContain('年齢未定');
    expect(line).not.toContain('null');
  });

  it('reads the father and the daughter off one stored fact', () => {
    const view = withCanon();
    expect(person(view, 'BAKERY_OWNER').family).toContain('リナ（村娘）の親');
    // The other direction is derived, not stored — so it cannot drift.
    expect(person(view, 'LINA').family).toContain('パン屋の主人の子');
  });

  it('says 記録なし for somebody with no family written', () => {
    expect(person(withCanon(), 'GALD').family).toBe('');
  });
});
