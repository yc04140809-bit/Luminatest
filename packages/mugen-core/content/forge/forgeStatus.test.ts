import { describe, expect, it } from 'vitest';
import { forgeRegistrationState, forgeRegistrationStates } from './forgeStatus';
import { forgeAdoptionView } from './adoptionView';
import { applyForgeAdoption, contentFromData, planForgeAdoption, EMPTY_ROSTER, EMPTY_VOID_LEDGER } from '../../core/forge/content';
import type { ForgeContent, ForgeDeployPackage } from '../../core/forge/types';
import { asReal } from '../../core/forge/fixtures/load';

// Character, Life Engine, picture and relationships are separate states
// (decided 2026-09-28). Nothing here stores or creates anything.

const EMPTY: ForgeContent = { roster: EMPTY_ROSTER, baselines: {}, previous: {}, voidIds: [], damaged: [] };

function adopt(content: ForgeContent, payload: ForgeDeployPackage, npcId: string): ForgeContent {
  const plan = planForgeAdoption(JSON.stringify(payload), forgeAdoptionView(content), { npcId });
  const change = applyForgeAdoption(plan, content, '2026-09-28T00:00:00.000Z');
  const baselines: Record<string, unknown> = { ...content.baselines, [payload.characterId]: payload };
  return contentFromData(change.roster, EMPTY_VOID_LEDGER, baselines).content;
}

const withSibling = (id: string, counterpart: string) =>
  asReal('human', (p) => {
    p.characterId = id;
    p.relationshipRefs = ['REL-000001'];
    p.characterHistory = [
      ...p.characterHistory,
      { event: 'RELATION_CREATED', at: '2026-09-11T01:36:27.826Z', origin: 'SYNAPSE', details: { relationshipId: 'REL-000001', relationType: 'FAMILY_SIBLING', counterpartCharacterId: counterpart, canonStatus: 'PROVISIONAL' } },
    ];
  });

describe('separate states', () => {
  it('a character with no picture file is still registered and still a life actor', () => {
    const content = adopt(EMPTY, asReal('human'), 'SERA');
    const state = forgeRegistrationState(content.roster.characters[0], content);
    expect(state).toMatchObject({ character: 'REGISTERED', lifeEngine: 'ACTOR', image: 'NOT_REGISTERED', assetMetadataCount: 1 });
    // FORGE's asset carries no primary mark here: no primary picture, and the first is not taken as one.
    expect(state.primaryAssetId).toBeNull();
    const marked = adopt(EMPTY, asReal('human', (p) => ((p.assets[0] as unknown as Record<string, unknown>).primary = true)), 'SERA');
    expect(forgeRegistrationState(marked.roster.characters[0], marked).primaryAssetId).toBe('VIS-HUM-900001-001');
    // Once the game holds the file, the picture state alone changes.
    expect(forgeRegistrationState(content.roster.characters[0], content, new Set(['VIS-HUM-900001-001'])).image).toBe('REGISTERED');
  });

  it('a monster is registered and not a life actor', () => {
    const content = adopt(EMPTY, asReal('normal-monster'), 'MOSS');
    expect(forgeRegistrationStates(content)[0]).toMatchObject({ character: 'REGISTERED', lifeEngine: 'NOT_ACTOR', image: 'NOT_REGISTERED', primaryAssetId: null });
  });
});

describe('a relationship FORGE names stays pending — never created from one side', () => {
  it('while the other character is not adopted', () => {
    const content = adopt(EMPTY, withSibling('HUM-000001', 'HUM-000005'), 'RIZEL');
    const [rel] = forgeRegistrationStates(content)[0].relationships;
    expect(rel).toMatchObject({
      relationshipId: 'REL-000001',
      counterpartCharacterId: 'HUM-000005',
      relationType: 'FAMILY_SIBLING',
      canonStatus: 'PROVISIONAL',
      counterpartAdopted: false,
      state: 'PENDING',
    });
  });

  it('and still, once the other is adopted, until the author confirms it', () => {
    const one = adopt(EMPTY, withSibling('HUM-000001', 'HUM-000005'), 'RIZEL');
    const both = adopt(one, withSibling('HUM-000005', 'HUM-000001'), 'SIBLING');
    const states = forgeRegistrationStates(both);
    expect(states.map((s) => [s.npcId, s.relationships[0].counterpartAdopted, s.relationships[0].state])).toEqual([
      ['RIZEL', true, 'PENDING'],
      ['SIBLING', true, 'PENDING'],
    ]);
    // Nothing relationship-like was written anywhere in the content.
    expect(JSON.stringify(both.roster)).not.toMatch(/FAMILY_SIBLING/);
  });
});
