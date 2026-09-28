import { describe, expect, it } from 'vitest';
import {
  FORGE_AGE_GROUP_BANDS,
  FORGE_VOCABULARY,
  adaptForgeVocabulary,
  consistencyIssues,
  sourceOnlyFields,
  unmappedIssues,
  zeroCharacterDefinition,
} from './forgeVocabularyAdapter';
import { canonicalJson } from '../../core/forge/canonical';
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

describe('decided 2026-09-27: what is mapped today, and what waits for the author', () => {
  it('importance: only 一般NPC → ORDINARY', () => {
    expect(FORGE_VOCABULARY.importance).toEqual({ 一般NPC: 'ORDINARY' });
  });

  it('every other importance — 重要人物, 主要人物, 特殊NPC … — is UNMAPPED, never guessed', () => {
    for (const importance of ['重要人物', '主要人物', '特殊NPC', '主要NPC', '一般', 'ORDINARY', '一般NPC ']) {
      const adapted = adaptForgeVocabulary(asReal('human', (p) => (p.profile.importance = importance)));
      if (importance.trim() === '一般NPC') {
        expect(adapted.standing, importance).toBe('ORDINARY');
      } else {
        expect(adapted.standing, importance).toBeNull();
        expect(adapted.unmapped.map((u) => u.field), importance).toContain('profile.importance');
      }
    }
  });

  it('personality, values and desires: the tables stay empty until FORGE’s official word lists are seen', () => {
    // If this fails, an entry was added. That needs the author's formal
    // decision (docs/FORGE_IMPORT.md §0) before it may ship.
    expect(FORGE_VOCABULARY.trait).toEqual({});
    expect(FORGE_VOCABULARY.value).toEqual({});
    expect(FORGE_VOCABULARY.desire).toEqual({});
  });

  it('so today FORGE’s personality, values and desires reach no seed: the life engine gets none of them', () => {
    const noisy = asReal('human', (p) => {
      p.profile.core = { personality: ['好奇心旺盛', '優しい', '臆病'], values: ['家族', '驚き'], desires: ['魔法を学びたい'] };
    });
    const life = adaptForgeVocabulary(noisy).life;
    expect([life.traits, life.values, life.desires]).toEqual([[], [], []]);
    // Even words that look like translations of the engine's own (CURIOUS, GENTLE, TIMID, FAMILY, WONDER).
    expect(adaptForgeVocabulary(noisy).unmapped.filter((u) => u.field.startsWith('profile.core')).map((u) => u.value)).toEqual([
      '好奇心旺盛',
      '優しい',
      '臆病',
      '家族',
      '驚き',
      '魔法を学びたい',
    ]);
  });

  it('a table entry added later maps the value — and FORGE’s original value is still there, untouched', () => {
    const forge = asReal('human');
    const before = canonicalJson(forge);
    // A pairing decided in the future, tried here without touching the real table.
    const later = { ...FORGE_VOCABULARY, trait: { 慎重: 'CAUTIOUS' }, importance: { ...FORGE_VOCABULARY.importance } };
    const adapted = adaptForgeVocabulary(forge, later);
    expect(adapted.life.traits).toEqual(['CAUTIOUS']);
    // Words still without a pairing stay UNMAPPED.
    expect(adapted.unmapped.map((u) => u.value)).toContain('世話焼き');
    // The FORGE file is not changed by mapping it; its own words are all still in it.
    expect(canonicalJson(forge)).toBe(before);
    expect((forge.profile.core as { personality: string[] }).personality).toEqual(['慎重', '世話焼き', '負けず嫌い']);
    // And the real table is as it was.
    expect(FORGE_VOCABULARY.trait).toEqual({});
  });
});

describe('visualDiversity and the other source-only fields: preserved, never used', () => {
  it('are listed as SOURCE DATA PRESERVED / GAME MAPPING = UNUSED', () => {
    const fields = sourceOnlyFields(asReal('human')).map((f) => f.field);
    expect(fields).toEqual(expect.arrayContaining(['visualDiversity', 'lifeAxis', 'worldViewAxis', 'seeds']));
  });

  it('change nothing the game reads: any visualDiversity gives the same definition', () => {
    const young = asReal('human');
    const odd = asReal('human', (p) => {
      p.visualDiversity = { ageGroup: 'older_adult', bodyBuild: 'heavy', heightImpression: 'very_tall', hair: { color: 'salt_and_pepper', length: 'very_short' } };
    });
    expect(adaptForgeVocabulary(odd)).toEqual(adaptForgeVocabulary(young));
    expect(unmappedIssues(odd)).toEqual(unmappedIssues(young));
    // And the odd values are kept exactly as sent.
    expect(odd.visualDiversity).toEqual({ ageGroup: 'older_adult', bodyBuild: 'heavy', heightImpression: 'very_tall', hair: { color: 'salt_and_pepper', length: 'very_short' } });
  });
});

describe('decided 2026-09-28: profile.age is the age; ageGroup is a picture aid — warn, never correct', () => {
  const withAge = (age: unknown, ageGroup: unknown) =>
    asReal('human', (p) => {
      p.profile.age = age;
      p.visualDiversity = { ...(p.visualDiversity as object), ageGroup };
    });

  it('uses the author’s bands, for this warning only', () => {
    expect(FORGE_AGE_GROUP_BANDS).toEqual({
      child: { min: 0, max: 12 },
      teen: { min: 13, max: 17 },
      young_adult: { min: 18, max: 29 },
      adult: { min: 30, max: 49 },
      older_adult: { min: 50, max: Number.POSITIVE_INFINITY },
    });
  });

  it('warns AGE / VISUAL AGE GROUP MISMATCH — the RIZEL case — and changes nothing', () => {
    const p = withAge('20', 'older_adult');
    const before = canonicalJson(p);
    const issues = consistencyIssues(p);
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe('AGE_VISUAL_GROUP_MISMATCH');
    for (const part of ['AGE / VISUAL AGE GROUP MISMATCH', 'SOURCE AGE: 20', 'VISUAL AGE GROUP: older_adult', 'SOURCE DATA PRESERVED', 'GAME DATA NOT AUTO-CORRECTED'])
      expect(issues[0].message).toContain(part);
    expect(canonicalJson(p)).toBe(before);
    expect(p.profile.age).toBe('20');
    expect((p.visualDiversity as { ageGroup: string }).ageGroup).toBe('older_adult');
  });

  it('stays quiet when they agree, at every band edge', () => {
    for (const [age, group] of [['0', 'child'], ['12', 'child'], ['13', 'teen'], ['17', 'teen'], ['18', 'young_adult'], ['29', 'young_adult'], ['30', 'adult'], ['49', 'adult'], ['50', 'older_adult'], ['90', 'older_adult'], [20, 'young_adult']] as const)
      expect(consistencyIssues(withAge(age, group)), `${age} ${group}`).toEqual([]);
    for (const [age, group] of [['12', 'teen'], ['18', 'teen'], ['29', 'adult'], ['50', 'adult'], ['49', 'older_adult']] as const)
      expect(consistencyIssues(withAge(age, group)).map((i) => i.code), `${age} ${group}`).toEqual(['AGE_VISUAL_GROUP_MISMATCH']);
  });

  it('an ageGroup outside the five is UNMAPPED and not compared; an age that is not a number is not compared', () => {
    const odd = consistencyIssues(withAge('20', 'middle_aged'));
    expect(odd.map((i) => i.code)).toEqual(['UNMAPPED_VOCABULARY']);
    expect(odd[0].message).toContain('middle_aged');
    expect(consistencyIssues(withAge('二十歳', 'older_adult'))).toEqual([]);
    expect(consistencyIssues(withAge('', 'older_adult'))).toEqual([]);
    // No visual age group at all (monsters): nothing to say.
    expect(consistencyIssues(asReal('boss-monster'))).toEqual([]);
  });

  it('is a warning at adoption, never a refusal', async () => {
    const { planForgeAdoption, EMPTY_ROSTER } = await import('../../core/forge/content');
    const { forgeAdoptionView } = await import('./adoptionView');
    const content = { roster: EMPTY_ROSTER, baselines: {}, previous: {}, voidIds: [], damaged: [] };
    const plan = planForgeAdoption(JSON.stringify(withAge('20', 'older_adult')), forgeAdoptionView(content), { npcId: 'SOMEONE' });
    expect(plan.ready).toBe(true);
    expect(plan.consistency.map((i) => i.code)).toEqual(['AGE_VISUAL_GROUP_MISMATCH']);
    expect(plan.errors).toEqual([]);
  });
});
