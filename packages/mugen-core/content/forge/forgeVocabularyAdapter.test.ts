import { describe, expect, it } from 'vitest';
import { FORGE_VOCABULARY, adaptForgeVocabulary, unmappedIssues, zeroCharacterDefinition } from './forgeVocabularyAdapter';
import { asReal } from '../../core/forge/fixtures/load';
import { MUGEN_WORLD_RULES } from '../world/mugenWorld';
import { LOCATIONS } from '../locations/alden';

// THE FORGE → MUGEN ZERO ADAPTER: explicit tables, nothing guessed,
// nothing unknown passed through, the game's own words never renamed.

const engineWords = () => {
  const words = new Set<string>();
  for (const core of MUGEN_WORLD_RULES.cores) {
    for (const w of [...core.traits, ...core.values, ...core.desires, ...Object.keys(core.aptitudes)]) words.add(w);
  }
  for (const kind of MUGEN_WORLD_RULES.kinds) {
    const r = kind.resonates;
    for (const w of [...(r.traits ?? []), ...(r.values ?? []), ...(r.desires ?? []), ...(r.aptitude ? [r.aptitude] : [])]) words.add(w);
  }
  return words;
};

describe('the tables', () => {
  it('only ever produce words the game already has', () => {
    const known = engineWords();
    for (const table of [FORGE_VOCABULARY.aptitude, FORGE_VOCABULARY.trait, FORGE_VOCABULARY.value, FORGE_VOCABULARY.desire]) {
      for (const [forge, zero] of Object.entries(table)) expect(known.has(zero), `${forge} → ${zero}`).toBe(true);
    }
    expect(Object.values(FORGE_VOCABULARY.characterType).sort()).toEqual(['CREATURE', 'PERSON']);
  });
});

describe('a human', () => {
  const adapted = adaptForgeVocabulary(asReal('human'));

  it('maps what a table covers — type, importance, the aptitudes the engine knows', () => {
    expect(adapted.entityType).toBe('PERSON');
    expect(adapted.standing).toBe('ORDINARY');
    expect(adapted.life.aptitudes).toEqual({ MAGIC: 0.78, SWORD: 0.21, HEALING: 0.74 });
  });

  it('reports the rest as UNMAPPED and passes none of it on — no guessing, no invented aptitude', () => {
    expect(adapted.life.traits).toEqual([]);
    expect(adapted.life.values).toEqual([]);
    expect(adapted.life.desires).toEqual([]);
    expect(adapted.life.aptitudes).not.toHaveProperty('COMMERCE');
    expect(adapted.life.aptitudes).not.toHaveProperty('SOCIAL');
    const fields = adapted.unmapped.map((u) => `${u.field}:${u.value}`);
    expect(fields).toEqual(
      expect.arrayContaining([
        'profile.core.personality:慎重',
        'profile.core.values:家族第一',
        'profile.core.desires:外の世界を見たい',
        'aptitudes:commerce',
        'aptitudes:social',
      ]),
    );
    expect(adapted.unmapped.every((u) => u.reason === 'NOT_IN_TABLE')).toBe(true);
  });
});

describe('a monster', () => {
  const adapted = adaptForgeVocabulary(asReal('boss-monster'));

  it('is a CREATURE; its species is kept by name, and only matched to one the game has', () => {
    expect(adapted.entityType).toBe('CREATURE');
    expect(adapted.species).toEqual({ name: '根環の森守', speciesId: null });
  });

  it('keeps combat potential out of life aptitudes', () => {
    expect(adapted.life.aptitudes).toEqual({});
  });

  it('says which fields the game has no vocabulary for yet, and which values no table covers', () => {
    const byField = Object.fromEntries(adapted.unmapped.map((u) => [u.field, u]));
    expect(byField['profile.classification（種族分類）']).toMatchObject({ value: '植物', reason: 'NO_GAME_VOCABULARY' });
    expect(byField['profile.activityTime（活動時間）']).toMatchObject({ value: '常時', reason: 'NO_GAME_VOCABULARY' });
    // 「森」 is a kind of place, not a place: not matched to GREENWOOD_FOREST.
    expect(byField['profile.habitat']).toMatchObject({ value: '森', reason: 'NOT_IN_TABLE' });
    expect(adapted.habitat).toBeNull();
    expect(byField['profile.importance']).toMatchObject({ value: '地域BOSS' });
    expect(adapted.standing).toBeNull();
    expect(byField['ecology.desire']).toMatchObject({ value: '巣の防衛' });
  });

  it('matches a habitat only by a place’s exact official name', () => {
    const inGreenwood = adaptForgeVocabulary(asReal('normal-monster', (p) => (p.profile.habitat = 'グリーンウッドの森')));
    expect(inGreenwood.habitat).toBe('GREENWOOD_FOREST');
    expect(LOCATIONS.find((l) => l.id === 'GREENWOOD_FOREST')?.name).toBe('グリーンウッドの森');
  });
});

describe('the MUGEN ZERO definition and its report', () => {
  it('joins the adapted values with the ledger’s decisions', () => {
    const def = zeroCharacterDefinition(asReal('human'), {
      characterId: 'HUM-900001',
      npcId: 'SERA',
      region: 'ALDEN',
      lifeActor: true,
      encounterRole: null,
    });
    expect(def).toMatchObject({ npcId: 'SERA', entityType: 'PERSON', displayName: 'セラ', lifeActor: true, region: 'ALDEN' });
  });

  it('turns every UNMAPPED value into a warning, never an error', () => {
    const issues = unmappedIssues(asReal('boss-monster'));
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.every((i) => i.code === 'UNMAPPED_VOCABULARY' && i.message.startsWith('UNMAPPED'))).toBe(true);
  });
});
