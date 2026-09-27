import { describe, expect, it } from 'vitest';
import {
  LINK_FORMAT,
  LINK_SCHEMA_VERSION,
  type LinkDocument,
  type LinkDocumentKind,
  type LinkPayloads,
} from './types';
import { SAVE_VERSION } from '../world/saveSchema';

/**
 * The link's types are a contract between programs that do not share
 * code, so what matters is that every kind of document is plain data:
 * it survives a trip through JSON unchanged. One sample of each kind.
 */
const SAMPLES: { [K in LinkDocumentKind]: LinkPayloads[K] } = {
  PERSON_DEFINITIONS: {
    npcId: 'LINA',
    displayName: 'リナ',
    kind: 'PERSON',
    region: 'ALDEN',
    standing: 'PRINCIPAL',
    artId: 'LINA',
    nature: { traits: ['CURIOUS'], values: ['WONDER'], desires: [], aptitudes: { MAGIC: 0.6 } },
    basics: { age: 14, lifePhase: 'CHILD', occupation: 'BAKERY_HELPER', home: 'ALDEN_VILLAGE' },
    family: null,
    canon: 'CANON',
  },
  PERSON_STATES: {
    npcId: 'GALD',
    at: { worldYear: 4, worldDay: 10 },
    current: {
      age: null,
      location: 'ALDEN_VILLAGE',
      alive: true,
      occupation: 'BAKER',
      lifePhase: 'ADULT',
      region: 'ALDEN',
    },
    reading: {
      lifeStage: 'BLOOM',
      feelings: ['GALD_REDEMPTION'],
      aims: [],
      seeds: [{ type: 'GALD_REDEMPTION', status: 'ROOTED', visibility: 'SPOKEN' }],
    },
  },
  RELATIONSHIPS: {
    from: 'ALDEN_GUARD',
    to: 'GALD',
    kind: 'CONFLICT',
    value: 0.2,
    source: 'SEED',
    becauseOf: ['canon:evt_gald_first_encounter_life_choice'],
  },
  EVENT_CANDIDATES: {
    candidateId: 'LINA_PRACTISES_ALONE',
    npcIds: ['LINA'],
    location: 'ALDEN_VILLAGE',
    priority: 10,
    exclusiveGroup: null,
    conditions: [
      { kind: 'BLOOM_CANDIDATE', bloomId: 'LINA_PRACTISES_ALONE' },
      { kind: 'SEED_AT_LEAST', npcId: 'LINA', type: 'MAGIC_DREAM', status: 'GROWING' },
    ],
    realizes: null,
  },
  CONVERSATION_CANDIDATES: {
    candidateId: 'GRAVE_GREETS',
    speaker: 'GRAVE',
    listener: 'PLAYER',
    location: 'MOONLIGHT_TAVERN',
    kind: 'DAILY',
    conditions: [{ kind: 'NOT_SEEN', id: 'GRAVE_GREETS' }],
    priority: 5,
    linesRef: 'aldenExperience#GRAVE_GREETS',
  },
};

function documentOf<K extends LinkDocumentKind>(kind: K): LinkDocument<K> {
  return {
    format: LINK_FORMAT,
    kind,
    schemaVersion: LINK_SCHEMA_VERSION,
    producedBy: { tool: 'HAND' },
    producedAt: '2026-09-27T00:00:00.000Z',
    items: [SAMPLES[kind]],
  };
}

describe('the link documents', () => {
  it('are plain data: every kind survives JSON unchanged', () => {
    for (const kind of Object.keys(SAMPLES) as LinkDocumentKind[]) {
      const doc = documentOf(kind);
      expect(JSON.parse(JSON.stringify(doc)), kind).toEqual(doc);
    }
  });

  it('name themselves and carry their own version, separate from the save', () => {
    const doc = documentOf('PERSON_DEFINITIONS');
    expect(doc.format).toBe('mugen-zero.link');
    expect(doc.schemaVersion).toBe(1);
    // The link has its own version; the save's stays where it is.
    expect(SAVE_VERSION).toBe(3);
  });
});
