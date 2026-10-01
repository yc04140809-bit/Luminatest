import { describe, expect, it } from 'vitest';
import { canonicalJson, payloadHash, sha256Hex } from './canonical';
import { parseDeployJson, validateDeployPackage } from './validate';
import { diffBaselines } from './diff';
import { forgeDisplayName, forgeHumanCurrentFacts, forgeKindOf } from './record';
import {
  EMPTY_ROSTER,
  EMPTY_VOID_LEDGER,
  applyForgeAdoption,
  applyForgeRollback,
  applyLifeActorChange,
  applyVoidExport,
  contentFromData,
  generateForgeIndex,
  isForgeExport,
  planForgeAdoption,
  readForgeExport,
  resultOfPlan,
  type ForgeAdoptionInput,
} from './content';
import type { ForgeContent, ForgeDeployPackage } from './types';
import { asReal, resent, sample, sampleText, TOOL_HASHES, type SampleName } from './fixtures/load';
import { forgeAdoptionView } from '../../content/forge/adoptionView';

// CHARACTER FORGE → MUGEN ZERO, the pure half: checking a deploy file
// and adopting it into the game's CONTENT (content/forge). Test names
// carry the bridge package's acceptance ids (ACCEPTANCE_TESTS.md).
//
// Every adopted character here lives in an in-memory content object
// made for the test. Nothing is written to the repository's content,
// and FORGE's samples (sampleOnly) are proved unadoptable.

const SAMPLES: SampleName[] = ['human', 'normal-monster', 'boss-monster'];
const AT = '2026-09-27T02:00:00.000Z';

const EMPTY: ForgeContent = { roster: EMPTY_ROSTER, baselines: {}, previous: {}, voidIds: [], damaged: [] };

const plan = (input: unknown, content: ForgeContent = EMPTY, choice: ForgeAdoptionInput = {}, extraVoidIds: string[] = []) =>
  planForgeAdoption(typeof input === 'string' ? input : JSON.stringify(input), forgeAdoptionView(content, extraVoidIds), choice);

/**
 * Adopts a payload into a content object, and reads the result back the
 * way the build does (through the files the change would write) — so
 * every test goes through the same path as a real adoption.
 */
function adopt(content: ForgeContent, payload: ForgeDeployPackage, choice: ForgeAdoptionInput, at = AT): ForgeContent {
  const p = plan(payload, content, choice);
  expect(p.ready, `${p.decision}: ${[...p.errors, ...p.npcErrors].map((e) => e.message).join(' / ')}`).toBe(true);
  return reread(content, applyForgeAdoption(p, content, at).files);
}

function reread(content: ForgeContent, files: Record<string, string | null>): ForgeContent {
  const baselines: Record<string, unknown> = { ...content.baselines };
  const previous: Record<string, unknown> = { ...content.previous };
  let roster: unknown = content.roster;
  for (const [path, text] of Object.entries(files)) {
    const value = text === null ? undefined : path.endsWith('.json') ? JSON.parse(text) : text;
    const [folder, name] = path.split('/');
    if (path === 'roster.json') roster = value;
    else if (folder === 'characters') baselines[name.replace(/\.json$/, '')] = value;
    else if (folder === 'previous') {
      if (value === undefined) delete previous[name.replace(/\.json$/, '')];
      else previous[name.replace(/\.json$/, '')] = value;
    }
  }
  const read = contentFromData(roster, { ...EMPTY_VOID_LEDGER, ids: [...content.voidIds] }, baselines, previous);
  expect(read.problems).toEqual([]);
  return read.content;
}

const entryOf = (content: ForgeContent, id: string) => content.roster.characters.find((e) => e.characterId === id)!;

describe('the fingerprint is the one FORGE computes', () => {
  it('is SHA-256, byte for byte', () => {
    expect(sha256Hex('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256Hex('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq')).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('matches the hash FORGE’s tool printed for each sample, whatever the key order', () => {
    for (const name of SAMPLES) expect(payloadHash(sample(name)), name).toBe(`sha256:${TOOL_HASHES[name]}`);
    const p = sample('human');
    expect(canonicalJson(Object.fromEntries(Object.entries(p).reverse()))).toBe(canonicalJson(p));
  });
});

describe('A. 構文・検証', () => {
  it('A1: the three sample files pass the schema', () => {
    for (const name of SAMPLES) expect(validateDeployPackage(sample(name)).errors, name).toEqual([]);
  });

  it('A2: broken JSON stops at the parser, with a Japanese message', () => {
    for (const text of ['{ "schemaVersion": "1.0", ', '', 'not json', sampleText('human').slice(0, 200)]) {
      expect(parseDeployJson(text).ok).toBe(false);
      const p = plan(text);
      expect(p.decision).toBe('BLOCKED_VALIDATION');
      expect(p.ready).toBe(false);
      expect(p.errors[0].code).toBe('JSON_PARSE');
      expect(p.errors[0].message).toMatch(/[ぁ-んァ-ン]/);
    }
  });

  it('A3: a wrong source or target is said out loud, not refused (known only from the old bridge package)', () => {
    for (const odd of [
      asReal('human', (p) => ((p as { source: string }).source = 'ELSEWHERE')),
      asReal('human', (p) => ((p.deployment as { target: string }).target = 'OTHER')),
    ]) {
      const p = plan(odd, EMPTY, { npcId: 'SERA' });
      expect(p.decision).toBe('NEW');
      expect(p.warnings.map((w) => w.code)).toContain('UNVERIFIED_CONTRACT');
    }
  });

  it('A4: schemaVersion must be there; "1.0" is FORGE’s, any other is read with a warning, never coerced', () => {
    for (const version of ['', null]) {
      const p = plan(asReal('human', (x) => ((x as { schemaVersion: unknown }).schemaVersion = version)));
      expect(p.decision, String(version)).toBe('BLOCKED_VALIDATION');
    }
    expect(plan(asReal('human', (x) => delete (x as { schemaVersion?: unknown }).schemaVersion)).decision).toBe('BLOCKED_VALIDATION');
    for (const version of ['2.0', '0.9', 'v1', 1]) {
      const p = plan(asReal('human', (x) => ((x as { schemaVersion: unknown }).schemaVersion = version)), EMPTY, { npcId: 'SERA' });
      expect(p.decision, String(version)).toBe('NEW');
      expect(p.warnings.map((w) => w.code)).toContain('UNKNOWN_SCHEMA_VERSION');
      // Kept exactly as sent.
      expect(p.payload!.schemaVersion).toBe(version);
    }
    const minor = plan(asReal('human', (x) => (x.schemaVersion = '1.1')), EMPTY, { npcId: 'SERA' });
    expect(minor.decision).toBe('NEW');
    expect(minor.warnings.map((w) => w.code)).toContain('NEWER_MINOR_VERSION');
  });

  it('A5: a HUM id on a monster (and a MON id on a human) is warned about; an id not in the HUM-/MON- form is refused', () => {
    expect(plan(asReal('normal-monster', (p) => (p.characterId = 'HUM-900001'))).warnings.map((e) => e.code)).toContain('ID_TYPE_MISMATCH');
    expect(plan(asReal('human', (p) => (p.characterId = 'MON-900001'))).warnings.map((e) => e.code)).toContain('ID_TYPE_MISMATCH');
    for (const bad of ['HUM-1', 'hum-000001', 'NPC-000001', 'HUM-00000A']) {
      expect(plan(asReal('human', (p) => (p.characterId = bad))).decision, bad).toBe('BLOCKED_VALIDATION');
    }
  });

  it('A6: a sample can never be adopted — not even with an NPC_ID', () => {
    for (const name of SAMPLES) {
      const p = plan(sampleText(name), EMPTY, { npcId: 'SAMPLE_PERSON' });
      expect(p.decision).toBe('BLOCKED_SAMPLE_DATA');
      expect(p.ready).toBe(false);
      expect(p.errors[0].code).toBe('SAMPLE_ONLY');
      expect(() => applyForgeAdoption(p, EMPTY, AT)).toThrow();
    }
  });
});

describe('B. 新規登録 — as content', () => {
  it('B1–B3: human, normal monster and boss are each NEW, and told apart', () => {
    const kinds = { human: 'HUMAN', 'normal-monster': 'MONSTER', 'boss-monster': 'BOSS' } as const;
    for (const name of SAMPLES) {
      const p = plan(asReal(name), EMPTY, { npcId: 'SOMEONE' });
      expect(p.decision, name).toBe('NEW');
      expect(p.kind, name).toBe(kinds[name]);
      expect(p.ready, name).toBe(true);
    }
  });

  it('asks for the NPC_ID before anything can be written', () => {
    const p = plan(asReal('human'));
    expect(p.decision).toBe('NEW');
    expect(p.canRegister).toBe(true);
    expect(p.ready).toBe(false);
    expect(p.npcErrors.map((e) => e.code)).toEqual(['NPC_ID_REQUIRED']);
    expect(() => applyForgeAdoption(p, EMPTY, AT)).toThrow();
  });

  it('B4–B6: writes the file verbatim under its own id, and the build reads it back', () => {
    const p = plan(asReal('boss-monster'), EMPTY, { npcId: 'ROOTRING_WARDEN' });
    const change = applyForgeAdoption(p, EMPTY, AT);
    expect(Object.keys(change.files).sort()).toEqual(['characters/MON-900002.json', 'index.generated.ts', 'roster.json']);
    expect(JSON.parse(change.files['characters/MON-900002.json']!)).toEqual(asReal('boss-monster'));
    expect(change.files['index.generated.ts']).toContain("import MON_900002 from './characters/MON-900002.json';");
    const content = reread(EMPTY, change.files);
    const entry = entryOf(content, 'MON-900002');
    expect(entry).toMatchObject({ characterId: 'MON-900002', npcId: 'ROOTRING_WARDEN', characterType: 'monster', encounterRole: 'BOSS' });
    expect(forgeKindOf(entry)).toBe('BOSS');
    expect(JSON.stringify(content.roster)).not.toMatch(/"characterType":\s*"boss"/i);
  });

  it('B7–B8: the ledger records the adoption — the content-side record of its arrival', () => {
    const p = plan(asReal('human'), EMPTY, { npcId: 'SERA', region: 'ALDEN' });
    const { entry, result } = applyForgeAdoption(p, EMPTY, AT);
    expect(entry).toMatchObject({
      characterId: 'HUM-900001',
      npcId: 'SERA',
      payloadHash: p.payloadHash,
      sourceSchemaVersion: '1.0',
      deployedVersion: '0.1',
      deployedAt: '2026-09-27T01:00:00.000Z',
      importedAt: AT,
      result: 'NEW',
      snapshotRef: null,
    });
    expect(entry.importId).toMatch(/^IMP-/);
    expect(result).toMatchObject({ schemaVersion: '1.0', result: 'NEW', npcId: 'SERA', rollback: { available: false, snapshotRef: null } });
  });
});

describe('C. 冪等性・更新', () => {
  const first = asReal('human');
  const held = adopt(EMPTY, first, { npcId: 'SERA' });

  it('C1: the same file again is UNCHANGED — nothing to write', () => {
    const p = plan(JSON.stringify(Object.fromEntries(Object.entries(first).reverse()), null, 2), held);
    expect(p.decision).toBe('UNCHANGED');
    expect(p.ready).toBe(false);
    expect(p.npcId).toBe('SERA');
    expect(resultOfPlan(p, AT)?.result).toBe('UNCHANGED');
  });

  it('C2–C3: a newer send is an UPDATE with the changed fields listed; planning writes nothing', () => {
    const r2 = resent(first, 2, (x) => (x.profile.occupation = '薬師'));
    const p = plan(r2, held);
    expect(p.decision).toBe('UPDATE');
    expect(p.ready).toBe(true);
    expect(p.npcId).toBe('SERA');
    expect(p.diff?.changed).toEqual(['profile.occupation']);
    expect(held.baselines['HUM-900001'].profile.occupation).toBe('薬草採集人');
  });

  it('C4–C5: an update replaces only the definition — the NPC_ID, placement and history stay', () => {
    const placed = adopt(EMPTY, first, { npcId: 'SERA', region: 'ALDEN' });
    const r2 = resent(first, 2, (x) => (x.profile.occupation = '薬師'));
    const after = adopt(placed, r2, {});
    const entry = entryOf(after, 'HUM-900001');
    expect(entry).toMatchObject({ npcId: 'SERA', region: 'ALDEN', deployedVersion: '0.1-r2' });
    expect(entry.adoptedAt).toBe(entryOf(placed, 'HUM-900001').adoptedAt);
    expect(entry.history.map((h) => h.result)).toEqual(['NEW', 'UPDATED']);
    expect(after.baselines['HUM-900001'].profile.occupation).toBe('薬師');
    // The NPC_ID cannot be changed by a re-send.
    const renamed = plan(resent(first, 3), after, { npcId: 'SERA_2' });
    expect(renamed.npcErrors.map((e) => e.code)).toEqual(['NPC_ID_CHANGE']);
    expect(renamed.ready).toBe(false);
  });

  it('C6: an update can be rolled back one step', () => {
    const r2 = resent(first, 2, (x) => (x.profile.occupation = '薬師'));
    const updated = adopt(held, r2, {});
    expect(entryOf(updated, 'HUM-900001').previous).not.toBeNull();
    const back = applyForgeRollback(updated, 'HUM-900001', '2026-09-27T04:00:00.000Z');
    expect(back.files['previous/HUM-900001.json']).toBeNull();
    const restored = reread(updated, back.files);
    const entry = entryOf(restored, 'HUM-900001');
    expect(restored.baselines['HUM-900001'].profile.occupation).toBe('薬草採集人');
    expect(entry.payloadHash).toBe(payloadHash(first));
    expect(entry.npcId).toBe('SERA');
    expect(entry.previous).toBeNull();
    expect(entry.history.map((h) => h.result)).toEqual(['NEW', 'UPDATED', 'ROLLED_BACK']);
    expect(() => applyForgeRollback(restored, 'HUM-900001', AT)).toThrow();
    // The rolled-back send can be taken again, and is said to be familiar.
    const again = plan(r2, restored);
    expect(again.decision).toBe('UPDATE');
    expect(again.warnings.map((w) => w.code)).toContain('PAYLOAD_SEEN_BEFORE');
  });

  it('C7: the same id as the other type is refused', () => {
    const odd: ForgeContent = {
      ...held,
      roster: { ...held.roster, characters: [{ ...entryOf(held, 'HUM-900001'), characterType: 'monster' }] },
    };
    expect(plan(first, odd).decision).toBe('BLOCKED_ID_TYPE_CONFLICT');
  });

  it('refuses a send older than the one held, or the same moment with other contents', () => {
    const state = adopt(held, resent(first, 3), {});
    expect(plan(resent(first, 2, (x) => (x.profile.notes = '古い')), state).decision).toBe('BLOCKED_DEPLOYMENT_CONFLICT');
    expect(plan(resent(first, 3, (x) => (x.profile.notes = '別')), state).decision).toBe('BLOCKED_DEPLOYMENT_CONFLICT');
  });

  it('refuses a character whose content file is missing or not what the ledger says', () => {
    const broken = contentFromData(held.roster, EMPTY_VOID_LEDGER, { 'HUM-900001': asReal('human', (x) => (x.profile.notes = 'tampered')) });
    expect(broken.content.damaged).toEqual(['HUM-900001']);
    expect(broken.problems[0]).toMatch(/hash と一致しません/);
    expect(plan(first, broken.content).decision).toBe('BLOCKED_SAVE_DAMAGED');
    expect(plan(asReal('normal-monster'), broken.content, { npcId: 'MOSS' }).ready).toBe(true);
  });
});

describe('the NPC_ID the author adopts them as', () => {
  it('must be a formal id, and one person only', () => {
    for (const bad of ['sera', 'Sera', 'SERA-1', '1SERA', 'alden_marta'])
      expect(plan(asReal('human'), EMPTY, { npcId: bad }).ready, bad).toBe(false);
    const held = adopt(EMPTY, asReal('human'), { npcId: 'SERA' });
    const taken = plan(asReal('normal-monster'), held, { npcId: 'SERA' });
    expect(taken.npcErrors.map((e) => e.code)).toContain('NPC_ID_TAKEN');
  });

  it('may be an existing person — whose id, name and home stay as they are', () => {
    const p = plan(asReal('human'), EMPTY, { npcId: 'LINA', region: 'PORT_TOWN' });
    expect(p.ready).toBe(true);
    expect(p.existingPerson?.npcId).toBe('LINA');
    expect(p.npcNotes.map((n) => n.code)).toEqual(['NPC_ID_EXISTING_PERSON', 'NPC_ID_NAME_DIFFERS']);
    expect(p.region).toBe('ALDEN');
    const content = adopt(EMPTY, asReal('human'), { npcId: 'LINA' });
    expect(entryOf(content, 'HUM-900001').npcId).toBe('LINA');
  });

  it('never makes the player, the companion, a place, the world — or a person out of a monster', () => {
    for (const id of ['PLAYER', 'KAOS', 'ALDEN_VILLAGE', 'WORLD'])
      expect(plan(asReal('human'), EMPTY, { npcId: id }).npcErrors.map((e) => e.code), id).toContain('NPC_ID_KIND_MISMATCH');
    expect(plan(asReal('boss-monster'), EMPTY, { npcId: 'GALD' }).npcErrors.map((e) => e.code)).toContain('NPC_ID_KIND_MISMATCH');
  });

  it('places them only in a region the game has; blank leaves them unplaced', () => {
    expect(plan(asReal('human'), EMPTY, { npcId: 'SERA', region: 'NOWHERE' }).npcErrors.map((e) => e.code)).toEqual(['REGION_UNKNOWN']);
    const unplaced = adopt(EMPTY, asReal('human'), { npcId: 'SERA' });
    expect(entryOf(unplaced, 'HUM-900001').region).toBeNull();
  });
});

describe('FORGE’s retired ids — the official export field `voidIds`', () => {
  const official = (voidIds: unknown[], characters: unknown[] = []) => ({
    schemaVersion: 1,
    exportedAt: '2026-09-27T03:00:00.000Z',
    characters,
    voidIds,
  });

  it('reads the official shape: { characterId, status: "VOID" }, extra fields allowed', () => {
    const read = readForgeExport(
      official([
        { characterId: 'HUM-000004', status: 'VOID' },
        { characterId: 'MON-000002', status: 'VOID', reason: '破棄', voidedAt: '2026-09-20T00:00:00.000Z' },
      ]),
    );
    expect(read.format).toBe('OFFICIAL');
    expect(read.voidIds).toEqual(['HUM-000004', 'MON-000002']);
    expect(read.issues).toEqual([]);
  });

  it('skips what is not VOID or not an id, and says so', () => {
    const read = readForgeExport(
      official([
        { characterId: 'HUM-000004', status: 'VOID' },
        { characterId: 'HUM-000005', status: 'ACTIVE' },
        { characterId: 'nonsense', status: 'VOID' },
        'HUM-000006',
      ]),
    );
    expect(read.voidIds).toEqual(['HUM-000004', 'HUM-000006']);
    expect(read.issues.map((i) => i.code)).toEqual(['EXPORT_FORMAT', 'EXPORT_FORMAT', 'EXPORT_LEGACY_FORMAT']);
  });

  it('refuses an export version it does not know, and reads older trial shapes as legacy', () => {
    expect(readForgeExport({ schemaVersion: 2, voidIds: [{ characterId: 'HUM-000004', status: 'VOID' }] }).voidIds).toEqual([]);
    const legacy = readForgeExport({ voidIds: ['HUM-000004'], discardedIds: ['HUM-000005'] });
    expect(legacy.format).toBe('LEGACY');
    expect(legacy.voidIds).toEqual(['HUM-000004', 'HUM-000005']);
    expect(legacy.issues[0].code).toBe('EXPORT_LEGACY_FORMAT');
  });

  it('tells an export from a single deploy file', () => {
    expect(isForgeExport(official([]))).toBe(true);
    expect(isForgeExport(asReal('human'))).toBe(false);
    expect(readForgeExport(official([], [asReal('human'), asReal('boss-monster')])).characters).toHaveLength(2);
  });

  it('a retired id is never adopted — from the ledger, or straight from the export it came in', () => {
    expect(plan(asReal('human'), { ...EMPTY, voidIds: ['HUM-900001'] }, { npcId: 'SERA' }).decision).toBe('BLOCKED_RESERVED_ID');
    const inExport = plan(asReal('human'), EMPTY, { npcId: 'SERA' }, ['HUM-900001']);
    expect(inExport.decision).toBe('BLOCKED_RESERVED_ID');
    expect(inExport.errors.at(-1)?.message).toMatch(/VOID/);
    // Not even as an existing person.
    expect(plan(asReal('human'), EMPTY, { npcId: 'LINA' }, ['HUM-900001']).ready).toBe(false);
  });

  it('the ledger only grows, and refuses — writing nothing — to retire somebody already adopted', () => {
    const one = applyVoidExport(EMPTY, EMPTY_VOID_LEDGER, ['HUM-000004'], AT, 'a.json');
    const two = applyVoidExport(EMPTY, one.ledger, ['HUM-000004', 'HUM-000009'], AT, 'b.json');
    expect(two.ledger.ids).toEqual(['HUM-000004', 'HUM-000009']);
    expect(two.added).toEqual(['HUM-000009']);
    const held = adopt(EMPTY, asReal('human'), { npcId: 'SERA' });
    expect(() => applyVoidExport(held, two.ledger, ['HUM-900001'], AT, 'c.json')).toThrow(/採用済み/);
  });
});

describe('ADOPTED is not "has a life": the WORLD LIFE ENGINE decision', () => {
  it('defaults to yes for a human and no for a monster — boss included', () => {
    expect(plan(asReal('human'), EMPTY, { npcId: 'SERA' }).lifeActor).toBe(true);
    expect(plan(asReal('normal-monster'), EMPTY, { npcId: 'MOSS' }).lifeActor).toBe(false);
    expect(plan(asReal('boss-monster'), EMPTY, { npcId: 'WARDEN' }).lifeActor).toBe(false);
  });

  it('is the author’s to decide at adoption — a background human out, a tracked creature in', () => {
    const mob = adopt(EMPTY, asReal('human'), { npcId: 'VILLAGER', lifeActor: false });
    expect(entryOf(mob, 'HUM-900001').lifeActor).toBe(false);
    const warden = adopt(EMPTY, asReal('boss-monster'), { npcId: 'MON_ROOTRING', lifeActor: true });
    expect(entryOf(warden, 'MON-900002').lifeActor).toBe(true);
  });

  it('is kept by a re-send, and changed only on purpose, with a line in the history', () => {
    const held = adopt(EMPTY, asReal('boss-monster'), { npcId: 'MON_ROOTRING' });
    const r2 = resent(asReal('boss-monster'), 2);
    expect(plan(r2, held, { lifeActor: true }).npcErrors.map((e) => e.code)).toEqual(['LIFE_ACTOR_FIXED']);
    const updated = adopt(held, r2, {});
    expect(entryOf(updated, 'MON-900002').lifeActor).toBe(false);
    const change = applyLifeActorChange(updated, 'MON-900002', true, AT);
    expect(Object.keys(change.files)).toEqual(['roster.json']);
    const after = reread(updated, change.files);
    expect(entryOf(after, 'MON-900002').lifeActor).toBe(true);
    expect(entryOf(after, 'MON-900002').history.at(-1)?.result).toBe('LIFE_ACTOR_CHANGED');
    expect(after.baselines['MON-900002']).toEqual(updated.baselines['MON-900002']);
    expect(() => applyLifeActorChange(after, 'MON-900002', true, AT)).toThrow();
  });
});

describe('D. HUMAN安全性', () => {
  it('D1–D3: a gifted but untrained human has no skill, no sword and no magic tool', () => {
    const p = asReal('human', (x) => {
      x.aptitudes.sword = 0.99;
      x.aptitudes.magic = 0.99;
    });
    const definition = adopt(EMPTY, p, { npcId: 'SERA' }).baselines['HUM-900001'];
    const facts = forgeHumanCurrentFacts(definition)!;
    expect(facts.skills).toEqual(p.currentSkills);
    expect(facts.skills.sword).toBe('UNLEARNED');
    expect(facts.skills.magic).toBe('UNLEARNED');
    expect(canonicalJson(definition.equipment)).toBe(canonicalJson(p.equipment));
    expect(definition.aptitudes).toEqual(p.aptitudes);
  });

  it('D4: equipment FORGE did not permit is refused', () => {
    const p = plan(asReal('human', (x) => ((x.equipment!.validation as { permitted: boolean }).permitted = false)), EMPTY, { npcId: 'SERA' });
    expect(p.decision).toBe('BLOCKED_VALIDATION');
    expect(p.errors.map((e) => e.code)).toContain('EQUIPMENT_NOT_PERMITTED');
  });

  it('D5–D6: a child’s future stays future — no marriage fact, no current job', () => {
    const child = asReal('human', (x) => {
      x.profile.occupation = '騎士';
      x.lifeStage = { visualAge: 'child', adultAxisMode: 'FUTURE_TENDENCY', occupationMode: 'FUTURE_ASPIRATION' };
    });
    const p = plan(child, EMPTY, { npcId: 'SERA' });
    expect(p.warnings.map((w) => w.code)).toEqual(expect.arrayContaining(['FUTURE_TENDENCY_KEPT', 'FUTURE_ASPIRATION_KEPT']));
    const facts = forgeHumanCurrentFacts(adopt(EMPTY, child, { npcId: 'SERA' }).baselines['HUM-900001'])!;
    expect(facts.occupation).toBeNull();
    expect(facts.aspiration).toBe('騎士');
    expect(Object.keys(facts).sort()).toEqual(['aspiration', 'occupation', 'skills']);
    expect(forgeHumanCurrentFacts(asReal('human'))!.occupation).toBe('薬草採集人');
  });
});

describe('E. MONSTER / BOSS安全性', () => {
  it('E1–E2: species and individual names are separate, and a missing name stays missing', () => {
    const definition = adopt(EMPTY, asReal('normal-monster'), { npcId: 'MOSS_ROLLER' }).baselines['MON-900001'];
    expect(definition.identity.speciesName).toBe('苔綿ころがし');
    expect(definition.identity.individualName).toBeNull();
    expect(forgeDisplayName(definition)).toBe('苔綿ころがし');
  });

  it('E3–E6: the definition is the file, exactly — nothing dropped, nothing invented', () => {
    for (const name of ['normal-monster', 'boss-monster'] as const) {
      const p = asReal(name);
      const content = adopt(EMPTY, p, { npcId: 'CREATURE_X' });
      expect(canonicalJson(Object.values(content.baselines)[0])).toBe(canonicalJson(p));
    }
    expect(adopt(EMPTY, asReal('normal-monster'), { npcId: 'M' }).baselines['MON-900001'].bossEncounter).toBeNull();
    expect(adopt(EMPTY, asReal('boss-monster'), { npcId: 'B' }).baselines['MON-900002'].bossEncounter).toEqual(sample('boss-monster').bossEncounter);
  });

  it('refuses a normal monster with an encounter design (verified); a boss’s missing design is only warned about (old package)', () => {
    expect(plan(asReal('normal-monster', (p) => (p.bossEncounter = sample('boss-monster').bossEncounter))).decision).toBe('BLOCKED_VALIDATION');
    const thin = plan(asReal('boss-monster', (p) => ((p.bossEncounter as Record<string, unknown>).coreMechanic = '未設定')), EMPTY, { npcId: 'MON_ROOTRING' });
    expect(thin.ready).toBe(true);
    expect(thin.warnings.find((w) => w.path === 'bossEncounter.coreMechanic')?.code).toBe('UNVERIFIED_CONTRACT');
  });
});

describe('F. 参照・アセット', () => {
  it('F1–F2: unresolved relationship ids warn, and the character still comes in with no relationship made', () => {
    const p = plan(asReal('human'), EMPTY, { npcId: 'SERA' });
    expect(p.ready).toBe(true);
    expect(p.warnings.filter((w) => w.code === 'UNRESOLVED_REFERENCE')).toHaveLength(1);
    const content = adopt(EMPTY, asReal('human'), { npcId: 'SERA' });
    expect(content.baselines['HUM-900001'].relationshipRefs).toEqual(['REL-900001']);
    expect(content.roster.characters).toHaveLength(1);
  });

  it('F3: a wished-for place that does not exist is left unplaced, never invented', () => {
    expect(plan(asReal('boss-monster')).warnings.map((w) => `${w.code}:${w.path}`)).toContain('WORLD_ASSIGNMENT_UNRESOLVED:worldAssignment.region');
    expect(plan(asReal('human')).warnings.map((w) => `${w.code}:${w.path}`)).toContain('WORLD_ASSIGNMENT_NAME_MATCH:worldAssignment.settlement');
  });

  it('F4–F5: asset metadata is kept; a missing picture file is a warning', () => {
    const p = plan(asReal('human'), EMPTY, { npcId: 'SERA' });
    expect(p.ready).toBe(true);
    expect(p.warnings.map((w) => w.code)).toContain('MISSING_ASSET');
    expect(adopt(EMPTY, asReal('human'), { npcId: 'SERA' }).baselines['HUM-900001'].assets).toEqual(sample('human').assets);
  });

  it('refuses a picture smuggled in as a data URL', () => {
    expect(plan(asReal('human', (x) => (x.assets[0].imageStorageKey = 'data:image/png;base64,AAAA'))).decision).toBe('BLOCKED_VALIDATION');
  });
});

describe('the rest of the contract', () => {
  it('keeps unknown fields of the same major, with a warning', () => {
    const p = asReal('human', (x) => {
      x.futureField = { a: 1 };
      x.identity.nickname = 'セラちゃん';
    });
    const planned = plan(p, EMPTY, { npcId: 'SERA' });
    expect(planned.warnings.filter((w) => w.code === 'UNKNOWN_FIELD').map((w) => w.path)).toEqual(
      expect.arrayContaining(['futureField', 'identity.nickname']),
    );
    expect(adopt(EMPTY, p, { npcId: 'SERA' }).baselines['HUM-900001'].futureField).toEqual({ a: 1 });
  });

  it('makes a result in the shape of mugen-zero-import-result 1.0', () => {
    const { result } = applyForgeAdoption(plan(asReal('human'), EMPTY, { npcId: 'SERA' }), EMPTY, AT);
    for (const key of ['schemaVersion', 'importId', 'characterId', 'result', 'importedAt', 'sourceDeployment', 'warnings', 'errors', 'diffSummary', 'rollback'])
      expect(result, key).toHaveProperty(key);
    expect(result.characterId).toMatch(/^(HUM|MON)-[0-9]{6,}$/);
    expect(result.sourceDeployment).toEqual({ deployedVersion: '0.1', deployedAt: '2026-09-27T01:00:00.000Z' });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
    expect(resultOfPlan(plan(sampleText('human')), AT)?.result).toBe('BLOCKED');
    expect(resultOfPlan(plan('nope'), AT)).toBeNull();
  });

  it('diffs two levels deep and compares arrays whole', () => {
    const a = asReal('human');
    const b = resent(a, 2, (p) => {
      p.seeds.push('新しい種');
      p.profile.core = { ...(p.profile.core as object), weakness: '変わった' };
    });
    expect(diffBaselines(a, b).changed).toEqual(expect.arrayContaining(['seeds', 'profile.core']));
  });

  it('generates the build’s index from the roster, one import per adopted character', () => {
    const content = adopt(adopt(EMPTY, asReal('human'), { npcId: 'SERA' }), asReal('boss-monster'), { npcId: 'WARDEN' });
    const index = generateForgeIndex(content.roster);
    expect(index).toContain("import HUM_900001 from './characters/HUM-900001.json';");
    expect(index).toContain("  'MON-900002': MON_900002,");
    expect(index).not.toContain('previous/');
  });
});

// SOURCE VERIFIED 2026-10-02 (docs/FORGE_IMPORT.md): what FORGE's own
// implementation guarantees is checked as an error; what only the old
// bridge package v1.0 said is a warning. The old samples are LEGACY TEST
// FIXTURES — the cases below change them in memory to stand for both.
describe('SOURCE VERIFIED 2026-10-02: verified rules refuse, old-package rules only warn', () => {
  const refused = (p: ForgeDeployPackage) => plan(p, EMPTY, { npcId: 'SOMEONE' }).decision === 'BLOCKED_VALIDATION';

  it('refuses what FORGE itself never sends', () => {
    const cases: [string, ForgeDeployPackage][] = [
      ['status not CANONIZED', asReal('human', (p) => ((p as { status: string }).status = 'DEPLOYED'))],
      ['characterType npc', asReal('human', (p) => ((p as { characterType: string }).characterType = 'npc'))],
      ['characterType boss', asReal('boss-monster', (p) => ((p as { characterType: string }).characterType = 'boss'))],
      ['human with an encounterRole', asReal('human', (p) => ((p as { encounterRole: string }).encounterRole = 'BOSS'))],
      ['monster without one', asReal('normal-monster', (p) => ((p as { encounterRole: null }).encounterRole = null))],
      ['human name not settled', asReal('human', (p) => (p.identity.nameStatus = 'AUTO_CANDIDATE'))],
      ['monster species name missing', asReal('normal-monster', (p) => (p.identity.speciesName = ''))],
      ['visual review REVISION_REQUIRED', asReal('human', (p) => (p.visualReviewStatus = 'REVISION_REQUIRED'))],
      ['impermissible equipment evidence', asReal('human', (p) => (((p.equipment as Record<string, unknown>).validation as Record<string, unknown>).permitted = false))],
      ['a picture inside the package', asReal('human', (p) => ((p.assets[0] as unknown as Record<string, unknown>).memo = 'data:image/png;base64,AAAA'))],
      ['no characterId', asReal('human', (p) => delete (p as { characterId?: string }).characterId)],
    ];
    for (const [what, p] of cases) expect(refused(p), what).toBe(true);
    const revision = plan(asReal('human', (p) => (p.visualReviewStatus = 'REVISION_REQUIRED')));
    expect(revision.errors.map((e) => e.code)).toContain('VISUAL_REVISION_REQUIRED');
  });

  it('only warns about what the old bridge package alone said — the character still comes in', () => {
    const cases: [string, ForgeDeployPackage][] = [
      ['an asset type not in the old list', asReal('human', (p) => ((p.assets[0] as unknown as Record<string, unknown>).assetType = 'PORTRAIT'))],
      ['a skill level not in the old list', asReal('human', (p) => ((p.currentSkills as Record<string, string>).magic = 'NOVICE'))],
      ['a visual review value not in the old list', asReal('human', (p) => ((p as { visualReviewStatus: string }).visualReviewStatus = 'PENDING'))],
      ['another aptitudeSemantics', asReal('human', (p) => ((p as { aptitudeSemantics: string }).aptitudeSemantics = 'POTENTIAL'))],
      ['a relationship id in another form', asReal('human', (p) => (p.relationshipRefs = ['R-1']))],
      ['a human with ecology', asReal('human', (p) => (p.ecology = { desire: '平穏' }))],
      ['a human without lifeAxis', asReal('human', (p) => delete (p as { lifeAxis?: unknown }).lifeAxis)],
      ['a human without currentSkills', asReal('human', (p) => delete (p as { currentSkills?: unknown }).currentSkills)],
      ['a monster with a lifeStage', asReal('normal-monster', (p) => (p.lifeStage = { stage: 'ADULT' }))],
      ['a boss with a thin encounter design', asReal('boss-monster', (p) => delete (p.bossEncounter as Record<string, unknown>).arena)],
      ['a boss with no encounter design', asReal('boss-monster', (p) => (p.bossEncounter = null))],
      ['no assets list', asReal('human', (p) => delete (p as { assets?: unknown }).assets)],
    ];
    for (const [what, p] of cases) {
      const result = plan(p, EMPTY, { npcId: 'SOMEONE' });
      expect(result.errors, what).toEqual([]);
      expect(result.ready, what).toBe(true);
      expect(result.warnings.map((w) => w.code), what).toContain('UNVERIFIED_CONTRACT');
    }
  });

  it('tells a boss by encounterRole, never by characterType', () => {
    expect(forgeKindOf(asReal('boss-monster'))).toBe('BOSS');
    expect(asReal('boss-monster').characterType).toBe('monster');
    expect(forgeKindOf(asReal('normal-monster'))).toBe('MONSTER');
    expect(forgeKindOf(asReal('human'))).toBe('HUMAN');
  });

  it('keeps unknown strings exactly as FORGE wrote them — no normalising', () => {
    const odd = asReal('human', (p) => {
      p.profile.core = { personality: ['未知の性格', '頑固', '頑固'], values: ['  余白つき  '], desires: [] };
      p.profile.importance = '最重要';
      p.visualDiversity = { ...(p.visualDiversity as object), ageGroup: 'middle_aged' };
      p.visualDirection = { overallImpression: 'CUTE', intensity: 'SUBTLE', customInstruction: '' };
    });
    const content = adopt(EMPTY, odd, { npcId: 'SERA' });
    expect(canonicalJson(content.baselines['HUM-900001'])).toBe(canonicalJson(odd));
  });

  it('A2: the occupation is current when FORGE says CURRENT_OR_AGE_APPROPRIATE; FORGE’s lifeStage is read, never recomputed', () => {
    const at = (mode: string) =>
      asReal('human', (p) => {
        p.profile.occupation = '薬草採集人';
        p.lifeStage = { ...(p.lifeStage as object), occupationMode: mode };
      });
    expect(forgeHumanCurrentFacts(at('CURRENT_OR_AGE_APPROPRIATE'))).toMatchObject({ occupation: '薬草採集人', aspiration: null });
    expect(forgeHumanCurrentFacts(at('FUTURE_ASPIRATION'))).toMatchObject({ occupation: null, aspiration: '薬草採集人' });
    expect(forgeHumanCurrentFacts(at('UNSET'))).toMatchObject({ occupation: null, aspiration: null });
    // LEGACY: the old samples' CURRENT_FACT still reads, so the old fixtures keep working. Never written.
    expect(forgeHumanCurrentFacts(at('CURRENT_FACT'))).toMatchObject({ occupation: '薬草採集人' });
    const p = at('CURRENT_OR_AGE_APPROPRIATE');
    const before = canonicalJson(p);
    forgeHumanCurrentFacts(p);
    expect(canonicalJson(p)).toBe(before);
    // Potential never stands in for skills, even when currentSkills is missing.
    const noSkills = asReal('human', (x) => delete (x as { currentSkills?: unknown }).currentSkills);
    expect(forgeHumanCurrentFacts(noSkills)!.skills).toEqual({});
  });
});
