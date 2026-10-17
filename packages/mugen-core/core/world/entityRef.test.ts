import { describe, expect, it } from 'vitest';
import { entityRefOf } from './entityRef';
import { NPC_REGISTRY } from '../../content/people/registry';
import { ENEMY_SPECIES } from '../../content/enemies/species';
import { FUUMIMI_CHARACTER_ID, FUUMIMI_INDIVIDUAL_ID } from '../../content/enemies/fuumimi';
import { SEKIRYUGA_CHARACTER_ID } from '../../content/enemies/sekiryugaBattle';
import { FORGE_CONTENT } from '../../content/forge/forgeContent';

/** One way of naming what the world remembers, without replacing any ID (作者判断 2026-10-10). */

describe('the kind, read off the ID — the ID itself unchanged', () => {
  it('FORGE monster species and individuals, as FORGE wrote them', () => {
    expect(entityRefOf('MON-000008')).toEqual({ entityType: 'MONSTER_SPECIES', entityRef: 'MON-000008' });
    expect(entityRefOf('IND-2262C6F7')).toEqual({ entityType: 'MONSTER_INDIVIDUAL', entityRef: 'IND-2262C6F7' });
    expect(entityRefOf(FUUMIMI_CHARACTER_ID)?.entityType).toBe('MONSTER_SPECIES');
    expect(entityRefOf(FUUMIMI_INDIVIDUAL_ID)).toEqual({ entityType: 'MONSTER_INDIVIDUAL', entityRef: 'IND-43452DFD' });
    expect(entityRefOf(SEKIRYUGA_CHARACTER_ID)?.entityType).toBe('MONSTER_SPECIES');
  });

  it('MUGEN ZERO’s own species, and the individuals the game names', () => {
    for (const id of Object.keys(ENEMY_SPECIES)) expect(entityRefOf(id)?.entityType, id).toBe('MONSTER_SPECIES');
    expect(entityRefOf('moss_rabbit_001')).toEqual({ entityType: 'MONSTER_INDIVIDUAL', entityRef: 'moss_rabbit_001' });
  });

  it('every NPC_ID in the registry — people, the player, Kaos — and every one FORGE adopted', () => {
    for (const entry of NPC_REGISTRY) expect(entityRefOf(entry.npcId)?.entityType, entry.npcId).toBe('NPC');
    for (const c of FORGE_CONTENT.roster.characters) expect(entityRefOf(c.npcId)?.entityType, c.npcId).toBe('NPC');
    expect(entityRefOf('PLAYER')?.entityType).toBe('NPC');
  });

  it('never one taken for another; a human’s FORGE ID and anything unknown are not references', () => {
    expect(entityRefOf('HUM-000001')).toBeNull();
    for (const junk of ['', 'mon-000008', 'IND-2262c6f7', 'MON-8', 'IND-123', 'Gald', '1ABC', 'moss rabbit']) {
      expect(entityRefOf(junk), junk).toBeNull();
    }
  });
});
