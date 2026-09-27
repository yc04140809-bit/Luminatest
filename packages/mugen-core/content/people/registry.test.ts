import { describe, expect, it } from 'vitest';
import {
  isFormalNpcId,
  registryProblems,
  resolveNpcId,
  unresolvedIds,
  type NpcRegistryEntry,
} from '../../core/link/npcId';
import { NPC_REGISTRY, registryEntry } from './registry';
import { MUGEN_WORLD_RULES, WORLD_PEOPLE } from '../world/mugenWorld';
import { GREENWOOD_PRELUDE } from '../world/galdLife';
import { INITIAL_GALD_STATE } from '../characters/gald';
import { INITIAL_LINA_STATE } from '../characters/lina';
import { INITIAL_BAKERY_OWNER_STATE } from '../characters/bakeryOwner';
import { LIFE_EVENT_DEFS } from '../events/lifeEvents';
import { ALDEN_EXPERIENCE_EVENTS } from '../experience/aldenExperience';
import { GREENWOOD_EXPERIENCE_EVENTS } from '../experience/greenwoodExperience';
import { ALDEN_NARRATIVE_SEEDS } from '../narrative/aldenSeeds';
import { PARTY_ART } from '../art/partyArt';
import { ENEMY_ART } from '../art/enemyArt';

type Ref = { id: string; where: string };

const INITIAL_STATES = [INITIAL_GALD_STATE, INITIAL_LINA_STATE, INITIAL_BAKERY_OWNER_STATE];

/** Every person id the game's content refers to, and where. */
function contentReferences(): Ref[] {
  const refs: Ref[] = [];
  const add = (id: string | null | undefined, where: string) => {
    if (id) refs.push({ id, where });
  };

  // Current state (what the save holds as character_<ID>).
  for (const state of INITIAL_STATES) {
    add(state.id, `CharacterState ${state.id}`);
    add(state.spouseId, `CharacterState ${state.id}.spouseId`);
    for (const child of state.childrenIds) add(child, `CharacterState ${state.id}.childrenIds`);
  }

  // The life engine's people, futures and crossings.
  for (const core of MUGEN_WORLD_RULES.cores) add(core.npcId, 'life engine NpcCore');
  for (const bloom of MUGEN_WORLD_RULES.blooms) {
    add(bloom.npcId, `bloom ${bloom.id}`);
    for (const seed of bloom.requirements.seeds) add(seed.npcId, `bloom ${bloom.id} seed`);
    for (const aptitude of bloom.requirements.aptitudes ?? []) add(aptitude.npcId, `bloom ${bloom.id} aptitude`);
    add(bloom.requirements.vine?.target, `bloom ${bloom.id} vine`);
  }
  for (const crossing of MUGEN_WORLD_RULES.crossings) {
    const where = `crossing ${crossing.id}`;
    for (const id of crossing.between) add(id, where);
    for (const seed of crossing.when.seeds ?? []) add(seed.npcId, `${where} seed`);
    for (const vine of crossing.when.vines ?? []) {
      add(vine.source, `${where} vine`);
      add(vine.target, `${where} vine`);
    }
    add(crossing.meets.actor, `${where} meets`);
    add(crossing.meets.target, `${where} meets`);
    for (const id of crossing.meets.witnesses ?? []) add(id, `${where} witnesses`);
  }
  for (const fact of GREENWOOD_PRELUDE) {
    add(fact.actor, 'GREENWOOD_PRELUDE');
    add(fact.target, 'GREENWOOD_PRELUDE');
    for (const id of fact.witnesses) add(id, 'GREENWOOD_PRELUDE witnesses');
  }

  // WORLD MEMORY: who the life events are about, and whose state they change.
  for (const def of LIFE_EVENT_DEFS) {
    for (const id of def.actors) add(id, `life event ${def.type}`);
    for (const effect of def.characterEffects) add(effect.characterId, `life event ${def.type} effect`);
  }
  // The actors World itself writes (world.ts): the player, Gald, and the
  // world for a stretch of time. A creature's individual id is not a
  // person and is not listed.
  for (const id of ['PLAYER', 'GALD', 'WORLD']) add(id, 'World (canon it writes)');

  // Who the experience events cast, and who the narrative seeds are about.
  for (const event of [...ALDEN_EXPERIENCE_EVENTS, ...GREENWOOD_EXPERIENCE_EVENTS]) {
    for (const id of event.dna?.characters ?? []) add(id, `experience ${event.eventId}`);
  }
  for (const seed of ALDEN_NARRATIVE_SEEDS) {
    for (const id of seed.relatedCharacters) add(id, `narrative seed ${seed.seedId}`);
  }

  // The life engine's roster for GOD VIEW.
  for (const person of WORLD_PEOPLE) add(person.npcId, 'WORLD_PEOPLE');
  return refs;
}

describe('the registry of who exists', () => {
  it('has no problems: formal ids, each once, named, aliases unambiguous', () => {
    expect(registryProblems(NPC_REGISTRY)).toEqual([]);
  });

  it('uses the formal upper-case ids the game already has', () => {
    for (const id of ['PLAYER', 'KAOS', 'GALD', 'LINA', 'MARTA', 'BAKERY_OWNER', 'ALDEN_GUARD', 'NEL', 'GRAVE'])
      expect(registryEntry(id), id).not.toBeNull();
  });

  it('reads the ids from every source it claims to (so the next check is not vacuous)', () => {
    const refs = contentReferences();
    const from = (prefix: string) => refs.filter((ref) => ref.where.startsWith(prefix)).map((ref) => ref.id);
    expect(from('CharacterState')).toEqual(expect.arrayContaining(['GALD', 'LINA', 'BAKERY_OWNER']));
    expect(from('life engine NpcCore')).toEqual(expect.arrayContaining(['alden_marta', 'NEL']));
    expect(from('crossing')).toEqual(expect.arrayContaining(['alden_marta', 'NEL', 'ALDEN_VILLAGE']));
    expect(from('life event')).toContain('GALD');
    expect(from('experience')).toEqual(expect.arrayContaining(['GRAVE', 'KAOS']));
    expect(from('narrative seed')).toContain('GRAVE');
    expect(from('WORLD_PEOPLE')).toHaveLength(WORLD_PEOPLE.length);
  });

  it('means somebody by every id the content uses — none points at nobody', () => {
    expect(unresolvedIds(contentReferences(), NPC_REGISTRY)).toEqual([]);
  });

  it('agrees with WORLD_PEOPLE on where everybody belongs and how much the story is about them', () => {
    for (const person of WORLD_PEOPLE) {
      const id = resolveNpcId(person.npcId, NPC_REGISTRY)!;
      const entry = registryEntry(id)!;
      expect(entry.region, person.npcId).toBe(person.region);
      expect(entry.standing, person.npcId).toBe(person.standing);
    }
  });
});

describe('ids and pictures are different things', () => {
  const pictures = new Set([...Object.keys(PARTY_ART), ...Object.keys(ENEMY_ART)]);

  it('keeps each picture in its own field, and every picture named exists', () => {
    for (const entry of NPC_REGISTRY) {
      if (entry.artId !== null) expect(pictures.has(entry.artId), `${entry.npcId} → ${entry.artId}`).toBe(true);
    }
  });

  it('never takes a lower-case picture id for a person', () => {
    for (const art of ['hero', 'kaos', 'gald', 'moss_rabbit']) {
      expect(isFormalNpcId(art)).toBe(false);
      expect(resolveNpcId(art, NPC_REGISTRY), art).toBeNull();
    }
  });
});

describe('MARTA: a formal id, and nothing more yet', () => {
  it('takes the old spelling alden_marta in as MARTA at the boundary', () => {
    expect(resolveNpcId('alden_marta', NPC_REGISTRY)).toBe('MARTA');
    expect(resolveNpcId('MARTA', NPC_REGISTRY)).toBe('MARTA');
  });

  it('gives her no family: nobody lists her as a spouse or a child, and she has no current state', () => {
    const marta = new Set(['MARTA', 'alden_marta']);
    for (const state of INITIAL_STATES) {
      expect(marta.has(state.id)).toBe(false);
      expect(state.spouseId !== null && marta.has(state.spouseId)).toBe(false);
      expect(state.childrenIds.some((child) => marta.has(child))).toBe(false);
    }
  });
});

describe('the checks catch what they are for', () => {
  const entry = (over: Partial<NpcRegistryEntry>): NpcRegistryEntry => ({
    npcId: 'SOMEONE',
    displayName: '誰か',
    kind: 'PERSON',
    region: 'ALDEN',
    standing: 'ORDINARY',
    artId: null,
    aliases: [],
    ...over,
  });

  it('refuses an id that is not formal', () => {
    for (const bad of ['alden_marta', 'lina', 'Gald', '1ST', 'LINA-2', ''])
      expect(registryProblems([entry({ npcId: bad })]).length, bad).toBeGreaterThan(0);
  });

  it('refuses a person listed twice', () => {
    expect(registryProblems([entry({}), entry({})])).toContain('SOMEONE: listed twice');
  });

  it('refuses an alias that is somebody else’s id, or that means two people', () => {
    expect(registryProblems([entry({ aliases: ['OTHER'] }), entry({ npcId: 'OTHER' })]).length).toBeGreaterThan(0);
    expect(
      registryProblems([entry({ aliases: ['old'] }), entry({ npcId: 'OTHER', aliases: ['old'] })]).length,
    ).toBeGreaterThan(0);
  });

  it('reports a reference to nobody, with where it was found', () => {
    expect(unresolvedIds([{ id: 'NOBODY', where: 'a test' }], NPC_REGISTRY)).toEqual([
      'NOBODY (in a test) is not in the registry',
    ]);
  });

  it('never folds case: lina is not LINA unless someone wrote it down as an alias', () => {
    expect(resolveNpcId('lina', NPC_REGISTRY)).toBeNull();
    expect(resolveNpcId('LINA', NPC_REGISTRY)).toBe('LINA');
  });
});
