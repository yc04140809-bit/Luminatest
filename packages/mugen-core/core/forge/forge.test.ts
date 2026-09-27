import { describe, expect, it } from 'vitest';
import { canonicalJson, payloadHash, sha256Hex } from './canonical';
import { parseDeployJson, validateDeployPackage } from './validate';
import { planForgeImport, type ForgeWorldView } from './plan';
import { applyForgePlan, applyForgeRollback, resultOfPlan } from './commit';
import { diffBaselines } from './diff';
import {
  EMPTY_FORGE_STATE,
  forgeDisplayName,
  forgeHumanCurrentFacts,
  forgeKindOf,
  readForgeRows,
  type ForgeState,
} from './record';
import { asReal, resent, sample, sampleText, TOOL_HASHES, type SampleName } from './fixtures/load';
import type { ForgeCharacterRecord, ForgeDeployPackage } from './types';

const SAMPLES: SampleName[] = ['human', 'normal-monster', 'boss-monster'];
const CLOCK = { worldYear: 1, worldDay: 1 };
const AT = '2026-09-27T02:00:00.000Z';

function view(state: ForgeState = EMPTY_FORGE_STATE, over: Partial<ForgeWorldView> = {}): ForgeWorldView {
  return {
    state,
    reservedIds: new Set(),
    locations: { ALDEN_VILLAGE: 'アルデン村', MOONLIGHT_TAVERN: '月灯りの酒場' },
    knownAssetIds: new Set(),
    ...over,
  };
}

/** Registers a payload into a state, as the World would, and returns the new state. */
function register(state: ForgeState, payload: ForgeDeployPackage, at = AT): ForgeState {
  const plan = planForgeImport(JSON.stringify(payload), view(state));
  expect(plan.canRegister, `${plan.decision} ${JSON.stringify(plan.errors)}`).toBe(true);
  const done = applyForgePlan(plan, state, at, CLOCK, () => false);
  return readForgeRows([
    ...Object.entries(state.records).map(([id, value]) => ({ key: `forge_character_${id}`, value })),
    ...Object.entries(state.histories).map(([id, value]) => ({ key: `forge_history_${id}`, value })),
    ...Object.entries(state.snapshots).map(([id, value]) => ({ key: `forge_snapshot_${id}`, value })),
    ...done.rows,
  ]);
}

describe('the fingerprint is the one FORGE computes', () => {
  it('is SHA-256, byte for byte, on Japanese text and at the block edges', () => {
    // Known vectors (FIPS 180-2).
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('matches the hash FORGE’s tool printed for each sample', () => {
    for (const name of SAMPLES) expect(payloadHash(sample(name)), name).toBe(`sha256:${TOOL_HASHES[name]}`);
  });

  it('does not care what order the keys came in', () => {
    const p = sample('human');
    const shuffled = Object.fromEntries(Object.entries(p).reverse());
    expect(canonicalJson(shuffled)).toBe(canonicalJson(p));
    expect(payloadHash(shuffled)).toBe(payloadHash(p));
  });
});

describe('A. 構文・検証', () => {
  it('A1: the three sample files pass the schema', () => {
    for (const name of SAMPLES) {
      const v = validateDeployPackage(sample(name));
      expect(v.errors, name).toEqual([]);
      expect(v.payload, name).not.toBeNull();
    }
  });

  it('A2: broken JSON stops at the parser, with a Japanese message', () => {
    for (const text of ['{ "schemaVersion": "1.0", ', '', 'not json', sampleText('human').slice(0, 200)]) {
      const parsed = parseDeployJson(text);
      expect(parsed.ok).toBe(false);
      const plan = planForgeImport(text, view());
      expect(plan.decision).toBe('BLOCKED_VALIDATION');
      expect(plan.canRegister).toBe(false);
      expect(plan.errors[0].code).toBe('JSON_PARSE');
      expect(plan.errors[0].message).toMatch(/JSON/);
      expect(plan.errors[0].message).toMatch(/[ぁ-んァ-ン]/);
    }
  });

  it('A3: a wrong source is refused', () => {
    const plan = planForgeImport(asReal('human', (p) => ((p as { source: string }).source = 'SOMEWHERE_ELSE')), view());
    expect(plan.decision).toBe('BLOCKED_VALIDATION');
    expect(plan.errors.map((e) => e.path)).toContain('source');
    const wrongDeploy = planForgeImport(asReal('human', (p) => ((p.deployment as { target: string }).target = 'OTHER')), view());
    expect(wrongDeploy.decision).toBe('BLOCKED_VALIDATION');
  });

  it('A4: an unsupported schemaVersion is refused; a newer minor is read with a warning', () => {
    for (const version of ['2.0', '0.9', '', 'v1']) {
      const plan = planForgeImport(asReal('human', (p) => (p.schemaVersion = version)), view());
      expect(plan.decision, version).toBe('BLOCKED_VALIDATION');
      expect(plan.errors[0].code).toBe('UNSUPPORTED_SCHEMA_VERSION');
    }
    const minor = planForgeImport(asReal('human', (p) => (p.schemaVersion = '1.1')), view());
    expect(minor.decision).toBe('NEW');
    expect(minor.warnings.map((w) => w.code)).toContain('NEWER_MINOR_VERSION');
  });

  it('A5: a HUM id on a monster (and a MON id on a human) is refused', () => {
    const a = planForgeImport(asReal('normal-monster', (p) => (p.characterId = 'HUM-900001')), view());
    expect(a.decision).toBe('BLOCKED_VALIDATION');
    expect(a.errors.map((e) => e.code)).toContain('ID_TYPE_MISMATCH');
    const b = planForgeImport(asReal('human', (p) => (p.characterId = 'MON-900001')), view());
    expect(b.errors.map((e) => e.code)).toContain('ID_TYPE_MISMATCH');
    for (const bad of ['HUM-1', 'hum-000001', 'NPC-000001', 'HUM-00000A']) {
      expect(planForgeImport(asReal('human', (p) => (p.characterId = bad)), view()).decision, bad).toBe('BLOCKED_VALIDATION');
    }
  });

  it('A6: a sample can never be registered', () => {
    for (const name of SAMPLES) {
      const plan = planForgeImport(sampleText(name), view());
      expect(plan.decision).toBe('BLOCKED_SAMPLE_DATA');
      expect(plan.canRegister).toBe(false);
      expect(plan.errors[0].code).toBe('SAMPLE_ONLY');
      expect(() => applyForgePlan(plan, EMPTY_FORGE_STATE, AT, CLOCK, () => false)).toThrow();
    }
  });
});

describe('B. 新規登録 (the pure half; persistence is in world/forgeImport.test.ts)', () => {
  it('B1–B3: human, normal monster and boss are each NEW, and told apart', () => {
    const kinds = { human: 'HUMAN', 'normal-monster': 'MONSTER', 'boss-monster': 'BOSS' } as const;
    for (const name of SAMPLES) {
      const plan = planForgeImport(asReal(name), view());
      expect(plan.decision, name).toBe('NEW');
      expect(plan.kind, name).toBe(kinds[name]);
    }
  });

  it('B4–B5: a boss stays a monster with role BOSS, under the id it came with', () => {
    const state = register(EMPTY_FORGE_STATE, asReal('boss-monster'));
    const record = state.records['MON-900002'];
    expect(record.characterId).toBe('MON-900002');
    expect(record.characterType).toBe('monster');
    expect(record.encounterRole).toBe('BOSS');
    expect(forgeKindOf(record)).toBe('BOSS');
    expect(JSON.stringify(record)).not.toMatch(/"characterType":"boss"/i);
  });

  it('B7–B8: a registration makes one arrival event and one history entry', () => {
    const plan = planForgeImport(asReal('human'), view());
    const done = applyForgePlan(plan, EMPTY_FORGE_STATE, AT, CLOCK, () => false);
    expect(done.event?.type).toBe('CHARACTER_IMPORTED_FROM_FORGE');
    expect(done.event?.id).toBe('evt_forge_import_HUM-900001');
    expect(done.event?.actors).toEqual(['HUM-900001']);
    expect(done.event?.forge).toMatchObject({
      source: 'MUGEN_CHARACTER_FORGE',
      characterId: 'HUM-900001',
      deployedVersion: '0.1',
      canonStatus: 'CANON',
    });
    expect(done.entry).toMatchObject({
      characterId: 'HUM-900001',
      payloadHash: plan.payloadHash,
      sourceSchemaVersion: '1.0',
      deployedVersion: '0.1',
      deployedAt: '2026-09-27T01:00:00.000Z',
      importedAt: AT,
      result: 'NEW',
      snapshotRef: null,
    });
    expect(done.entry.importId).toMatch(/^IMP-/);
    // Arrival is once per character, ever: an arrival already on record is not written twice.
    const again = applyForgePlan(plan, EMPTY_FORGE_STATE, AT, CLOCK, (id) => id === 'evt_forge_import_HUM-900001');
    expect(again.event).toBeNull();
  });
});

describe('C. 冪等性・更新', () => {
  const first = asReal('human');
  const held = register(EMPTY_FORGE_STATE, first);

  it('C1: the same file again is UNCHANGED — key order and spacing do not matter', () => {
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(first).reverse()), null, 2);
    const plan = planForgeImport(reordered, view(held));
    expect(plan.decision).toBe('UNCHANGED');
    expect(plan.canRegister).toBe(false);
    expect(resultOfPlan(plan, AT)?.result).toBe('UNCHANGED');
  });

  it('C2: a newer send is an UPDATE with the changed fields listed', () => {
    const r2 = resent(first, 2, (p) => (p.profile.occupation = '薬師'));
    const plan = planForgeImport(r2, view(held));
    expect(plan.decision).toBe('UPDATE');
    expect(plan.diff?.changed).toEqual(['profile.occupation']);
    expect(plan.diff?.preserved).toContain('identity.name');
    expect(plan.diff?.changed).not.toContain('deployment');
  });

  it('C6: an update can be rolled back one step, keeping what the game made of them', () => {
    const r2 = resent(first, 2, (p) => (p.profile.occupation = '薬師'));
    let state = register(held, r2, '2026-09-27T03:00:00.000Z');
    expect(state.snapshots['HUM-900001']).toBeDefined();
    // The game has since written its own state for them.
    state = {
      ...state,
      records: {
        ...state.records,
        'HUM-900001': { ...state.records['HUM-900001'], runtimeState: { location: 'ALDEN_VILLAGE' }, npcId: null },
      },
    };
    const back = applyForgeRollback(state, 'HUM-900001', '2026-09-27T04:00:00.000Z');
    expect(back.record.forgeBaseline.profile.occupation).toBe('薬草採集人');
    expect(back.record.importMetadata.payloadHash).toBe(payloadHash(first));
    expect(back.record.runtimeState).toEqual({ location: 'ALDEN_VILLAGE' });
    expect(back.entry.result).toBe('ROLLED_BACK');
    expect(back.rows.find((r) => r.key === 'forge_snapshot_HUM-900001')?.value).toBeNull();
  });

  it('C7: the same id as the other type is refused', () => {
    // Held as a monster under a HUM id — only a damaged or foreign save
    // could hold this, and the importer must not "fix" it by replacing.
    const odd: ForgeCharacterRecord = { ...held.records['HUM-900001'], characterType: 'monster' };
    const plan = planForgeImport(first, view({ ...held, records: { 'HUM-900001': odd } }));
    expect(plan.decision).toBe('BLOCKED_ID_TYPE_CONFLICT');
  });

  it('refuses a send older than the one held, or the same moment with other contents', () => {
    const r3 = resent(first, 3);
    const state = register(held, r3);
    const older = resent(first, 2, (p) => (p.profile.occupation = '古い設定'));
    expect(planForgeImport(older, view(state)).decision).toBe('BLOCKED_DEPLOYMENT_CONFLICT');
    const sameMoment = resent(first, 3, (p) => (p.profile.notes = '別の内容'));
    expect(planForgeImport(sameMoment, view(state)).decision).toBe('BLOCKED_DEPLOYMENT_CONFLICT');
  });
});

describe('D. HUMAN安全性', () => {
  it('D1–D3: a gifted but untrained human has no skill, no sword and no magic tool', () => {
    const p = asReal('human', (x) => {
      x.aptitudes.sword = 0.99;
      x.aptitudes.magic = 0.99;
    });
    const state = register(EMPTY_FORGE_STATE, p);
    const record = state.records['HUM-900001'];
    const facts = forgeHumanCurrentFacts(record.forgeBaseline)!;
    expect(facts.skills).toEqual(p.currentSkills);
    expect(facts.skills.sword).toBe('UNLEARNED');
    expect(facts.skills.magic).toBe('UNLEARNED');
    // Equipment is exactly what FORGE justified — nothing added from potential.
    expect(canonicalJson(record.forgeBaseline.equipment)).toBe(canonicalJson(p.equipment));
    expect(JSON.stringify(record.forgeBaseline.equipment)).not.toMatch(/剣|杖|魔法具/);
    // Potential and skill are separate fields, both kept as sent.
    expect(record.forgeBaseline.aptitudes).toEqual(p.aptitudes);
    expect(record.runtimeState).toEqual({});
  });

  it('D4: equipment FORGE did not permit is refused, not registered quietly', () => {
    const plan = planForgeImport(
      asReal('human', (x) => ((x.equipment!.validation as { permitted: boolean }).permitted = false)),
      view(),
    );
    expect(plan.decision).toBe('BLOCKED_VALIDATION');
    expect(plan.errors.map((e) => e.code)).toContain('EQUIPMENT_NOT_PERMITTED');
  });

  it('D5–D6: a child’s future stays future — no marriage fact, no current job', () => {
    const child = asReal('human', (x) => {
      x.profile.age = '9';
      x.profile.occupation = '騎士';
      x.lifeStage = { visualAge: 'child', adultAxisMode: 'FUTURE_TENDENCY', occupationMode: 'FUTURE_ASPIRATION' };
    });
    const plan = planForgeImport(child, view());
    expect(plan.decision).toBe('NEW');
    expect(plan.warnings.map((w) => w.code)).toEqual(
      expect.arrayContaining(['FUTURE_TENDENCY_KEPT', 'FUTURE_ASPIRATION_KEPT']),
    );
    const record = register(EMPTY_FORGE_STATE, child).records['HUM-900001'];
    const facts = forgeHumanCurrentFacts(record.forgeBaseline)!;
    expect(facts.occupation).toBeNull();
    expect(facts.aspiration).toBe('騎士');
    expect(Object.keys(facts)).not.toEqual(expect.arrayContaining(['spouse', 'marriage', 'romance']));
    expect(record.runtimeState).toEqual({});
    // Adult's current job is a current fact.
    expect(forgeHumanCurrentFacts(asReal('human'))!.occupation).toBe('薬草採集人');
  });
});

describe('E. MONSTER / BOSS安全性', () => {
  it('E1–E2: species and individual names are separate, and a missing name stays missing', () => {
    const record = register(EMPTY_FORGE_STATE, asReal('normal-monster')).records['MON-900001'];
    expect(record.forgeBaseline.identity.speciesName).toBe('苔綿ころがし');
    expect(record.forgeBaseline.identity.individualName).toBeNull();
    // Called by its species on a screen; the record is not filled in.
    expect(forgeDisplayName(record.forgeBaseline)).toBe('苔綿ころがし');
  });

  it('E3–E6: nothing is dropped, nothing is invented', () => {
    for (const name of ['normal-monster', 'boss-monster'] as const) {
      const p = asReal(name);
      const record = Object.values(register(EMPTY_FORGE_STATE, p).records)[0];
      // The baseline is the file, exactly: no organ, stat or name was added or lost.
      expect(canonicalJson(record.forgeBaseline)).toBe(canonicalJson(p));
      expect(record.runtimeState).toEqual({});
    }
    const normal = register(EMPTY_FORGE_STATE, asReal('normal-monster')).records['MON-900001'];
    expect(normal.forgeBaseline.bossEncounter).toBeNull();
    const boss = register(EMPTY_FORGE_STATE, asReal('boss-monster')).records['MON-900002'];
    expect(Object.keys(boss.forgeBaseline.bossEncounter!).sort()).toEqual(
      Object.keys(sample('boss-monster').bossEncounter!).sort(),
    );
    expect(boss.forgeBaseline.bossEncounter).toEqual(sample('boss-monster').bossEncounter);
  });

  it('refuses a boss without its encounter design, and a normal monster with one', () => {
    const emptyBoss = asReal('boss-monster', (p) => ((p.bossEncounter as Record<string, unknown>).coreMechanic = '未設定'));
    expect(planForgeImport(emptyBoss, view()).decision).toBe('BLOCKED_VALIDATION');
    const normalWithBoss = asReal('normal-monster', (p) => (p.bossEncounter = sample('boss-monster').bossEncounter));
    expect(planForgeImport(normalWithBoss, view()).decision).toBe('BLOCKED_VALIDATION');
    const humanBoss = asReal('human', (p) => ((p as { encounterRole: string }).encounterRole = 'BOSS'));
    expect(planForgeImport(humanBoss, view()).decision).toBe('BLOCKED_VALIDATION');
  });
});

describe('F. 参照・アセット', () => {
  it('F1–F2: unresolved relationship ids warn, and the character still comes in with no relationship made', () => {
    const plan = planForgeImport(asReal('human'), view());
    expect(plan.decision).toBe('NEW');
    expect(plan.warnings.filter((w) => w.code === 'UNRESOLVED_REFERENCE')).toHaveLength(1);
    const record = register(EMPTY_FORGE_STATE, asReal('human')).records['HUM-900001'];
    expect(record.forgeBaseline.relationshipRefs).toEqual(['REL-900001']);
    expect(record.runtimeState).toEqual({});
  });

  it('F3: a wished-for place that does not exist is left unplaced, never invented', () => {
    const plan = planForgeImport(asReal('boss-monster'), view());
    const codes = plan.warnings.map((w) => `${w.code}:${w.path}`);
    expect(codes).toContain('WORLD_ASSIGNMENT_UNRESOLVED:worldAssignment.region');
    const human = planForgeImport(asReal('human'), view());
    // アルデン村 exists by name — said, not acted on.
    expect(human.warnings.map((w) => `${w.code}:${w.path}`)).toContain(
      'WORLD_ASSIGNMENT_NAME_MATCH:worldAssignment.settlement',
    );
  });

  it('F4–F5: asset metadata is kept; a missing picture file is a warning, not a refusal', () => {
    const plan = planForgeImport(asReal('human'), view());
    expect(plan.decision).toBe('NEW');
    expect(plan.warnings.map((w) => w.code)).toContain('MISSING_ASSET');
    const record = register(EMPTY_FORGE_STATE, asReal('human')).records['HUM-900001'];
    expect(record.forgeBaseline.assets).toEqual(sample('human').assets);
    expect(record.forgeBaseline.assets[0].primary).toBe(true);
    const held = planForgeImport(asReal('human'), view(EMPTY_FORGE_STATE, { knownAssetIds: new Set(['VIS-HUM-900001-001']) }));
    expect(held.warnings.map((w) => w.code)).not.toContain('MISSING_ASSET');
  });

  it('refuses a picture smuggled in as a data URL', () => {
    const p = asReal('human', (x) => (x.assets[0].imageStorageKey = 'data:image/png;base64,AAAA'));
    expect(planForgeImport(p, view()).decision).toBe('BLOCKED_VALIDATION');
  });
});

describe('the rest of the contract', () => {
  it('keeps unknown fields of the same major, with a warning', () => {
    const p = asReal('human', (x) => {
      x.futureField = { a: 1 };
      x.identity.nickname = 'セラちゃん';
    });
    const plan = planForgeImport(p, view());
    expect(plan.decision).toBe('NEW');
    expect(plan.warnings.filter((w) => w.code === 'UNKNOWN_FIELD').map((w) => w.path)).toEqual(
      expect.arrayContaining(['futureField', 'identity.nickname']),
    );
    const record = register(EMPTY_FORGE_STATE, p).records['HUM-900001'];
    expect(record.forgeBaseline.futureField).toEqual({ a: 1 });
  });

  it('refuses an id the game already uses or FORGE retired', () => {
    const plan = planForgeImport(asReal('human'), view(EMPTY_FORGE_STATE, { reservedIds: new Set(['HUM-900001']) }));
    expect(plan.decision).toBe('BLOCKED_RESERVED_ID');
  });

  it('refuses a character whose saved record could not be read', () => {
    const state = readForgeRows([{ key: 'forge_character_HUM-900001', value: 'garbage' }]);
    expect(state.damaged).toEqual(['HUM-900001']);
    expect(planForgeImport(asReal('human'), view(state)).decision).toBe('BLOCKED_SAVE_DAMAGED');
    // Somebody else is unaffected.
    expect(planForgeImport(asReal('normal-monster'), view(state)).decision).toBe('NEW');
  });

  it('makes a result in the shape of mugen-zero-import-result 1.0', () => {
    const plan = planForgeImport(asReal('human'), view());
    const { result } = applyForgePlan(plan, EMPTY_FORGE_STATE, AT, CLOCK, () => false);
    for (const key of ['schemaVersion', 'importId', 'characterId', 'result', 'importedAt', 'sourceDeployment', 'warnings', 'errors', 'diffSummary', 'rollback']) {
      expect(result, key).toHaveProperty(key);
    }
    expect(result.schemaVersion).toBe('1.0');
    expect(result.characterId).toMatch(/^(HUM|MON)-[0-9]{6,}$/);
    expect(['NEW', 'UPDATED', 'UNCHANGED', 'BLOCKED']).toContain(result.result);
    expect(result.sourceDeployment).toEqual({ deployedVersion: '0.1', deployedAt: '2026-09-27T01:00:00.000Z' });
    expect(result.rollback).toEqual({ available: false, snapshotRef: null });
    expect(result.diffSummary.added).toContain('identity');
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    // A blocked file with an id still gets a result; one without an id cannot.
    expect(resultOfPlan(planForgeImport(sampleText('human'), view()), AT)?.result).toBe('BLOCKED');
    expect(resultOfPlan(planForgeImport('nope', view()), AT)).toBeNull();
  });

  it('diffs two levels deep and compares arrays whole', () => {
    const a = asReal('human');
    const b = resent(a, 2, (p) => {
      p.seeds.push('新しい種');
      p.profile.core = { ...(p.profile.core as object), weakness: '変わった' };
    });
    const diff = diffBaselines(a, b);
    expect(diff.changed).toEqual(expect.arrayContaining(['seeds', 'profile.core']));
    expect(diff.changed).not.toContain('deployment');
  });
});
