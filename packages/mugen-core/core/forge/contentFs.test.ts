import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  adoptOnDisk,
  ensureForgeContentDir,
  importVoidOnDisk,
  loadForgeContent,
  planOnDisk,
  rollbackOnDisk,
  setLifeActorOnDisk,
} from '../../scripts/forgeContentFs';
import { generateForgeIndex } from './content';
import { asReal, resent, sampleText } from './fixtures/load';

// The files on disk, as the command line and the dev server write them —
// always into a throwaway folder here, never the repository's content.

function freshDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'forge-content-test-'));
  ensureForgeContentDir(dir);
  return dir;
}

const text = (value: unknown) => JSON.stringify(value, null, 2);

describe('adopting into content files', () => {
  it('writes the definition, the ledger and the index; reading them back gives the same character', () => {
    const dir = freshDir();
    const file = text(asReal('human'));
    const plan = planOnDisk(dir, file, { npcId: 'SERA' });
    expect(plan.ready).toBe(true);
    const { written } = adoptOnDisk(dir, file, { npcId: 'SERA' }, { decision: plan.decision, payloadHash: plan.payloadHash });
    expect(written.sort()).toEqual(['characters/HUM-900001.json', 'index.generated.ts', 'roster.json']);
    const loaded = loadForgeContent(dir);
    expect(loaded.problems).toEqual([]);
    expect(loaded.content.roster.characters.map((e) => [e.characterId, e.npcId])).toEqual([['HUM-900001', 'SERA']]);
    expect(readFileSync(join(dir, 'index.generated.ts'), 'utf8')).toBe(generateForgeIndex(loaded.content.roster));
    // The same file again: nothing to write.
    expect(planOnDisk(dir, file, {}).decision).toBe('UNCHANGED');
  });

  it('refuses to write what the author did not review', () => {
    const dir = freshDir();
    const file = text(asReal('human'));
    const plan = planOnDisk(dir, file, { npcId: 'SERA' });
    adoptOnDisk(dir, file, { npcId: 'SERA' }, { decision: plan.decision, payloadHash: plan.payloadHash });
    // The screen still shows NEW; the files have moved on.
    expect(() => adoptOnDisk(dir, file, { npcId: 'SERA' }, { decision: 'NEW', payloadHash: plan.payloadHash })).toThrow(/変わりました/);
  });

  it('never writes a sample', () => {
    const dir = freshDir();
    const plan = planOnDisk(dir, sampleText('human'), { npcId: 'SERA' });
    expect(plan.decision).toBe('BLOCKED_SAMPLE_DATA');
    // Stopped by 事前検証 before anything else: an ERROR is never applied.
    expect(() => adoptOnDisk(dir, sampleText('human'), { npcId: 'SERA' }, { decision: plan.decision, payloadHash: plan.payloadHash })).toThrow(/事前検証が ERROR/);
    expect(existsSync(join(dir, 'characters', 'HUM-900001.json'))).toBe(false);
  });

  it('updates, keeps the previous definition for one rollback, and rolls back', () => {
    const dir = freshDir();
    const first = asReal('boss-monster');
    const adopt = (payload: unknown, npcId?: string) => {
      const plan = planOnDisk(dir, text(payload), { npcId });
      return adoptOnDisk(dir, text(payload), { npcId }, { decision: plan.decision, payloadHash: plan.payloadHash });
    };
    adopt(first, 'ROOTRING_WARDEN');
    adopt(resent(first, 2, (x) => ((x.bossEncounter as Record<string, unknown>).arena = '焼け跡の広場')));
    expect(existsSync(join(dir, 'previous', 'MON-900002.json'))).toBe(true);
    rollbackOnDisk(dir, 'MON-900002');
    expect(existsSync(join(dir, 'previous', 'MON-900002.json'))).toBe(false);
    const loaded = loadForgeContent(dir);
    expect(loaded.problems).toEqual([]);
    expect(loaded.content.baselines['MON-900002'].bossEncounter!.arena).toBe('吹雪で視界が変わる雪原');
    expect(loaded.content.roster.characters[0].history.map((h) => h.result)).toEqual(['NEW', 'UPDATED', 'ROLLED_BACK']);
  });

  it('notices a definition file edited by hand, and refuses to write over it', () => {
    const dir = freshDir();
    const file = text(asReal('human'));
    const plan = planOnDisk(dir, file, { npcId: 'SERA' });
    adoptOnDisk(dir, file, { npcId: 'SERA' }, { decision: plan.decision, payloadHash: plan.payloadHash });
    writeFileSync(join(dir, 'characters', 'HUM-900001.json'), text(asReal('human', (x) => (x.profile.notes = 'edited'))));
    const loaded = loadForgeContent(dir);
    expect(loaded.content.damaged).toEqual(['HUM-900001']);
    expect(planOnDisk(dir, text(resent(asReal('human'), 2)), {}).decision).toBe('BLOCKED_SAVE_DAMAGED');
  });

  it('takes FORGE’s export (official voidIds) into the ledger, and then refuses those ids', () => {
    const dir = freshDir();
    const exported = { schemaVersion: 1, exportedAt: '2026-09-27T03:00:00.000Z', characters: [], voidIds: [{ characterId: 'HUM-900001', status: 'VOID' }] };
    const { change } = importVoidOnDisk(dir, text(exported), 'forge-export.json');
    expect(change.added).toEqual(['HUM-900001']);
    expect(loadForgeContent(dir).content.voidIds).toEqual(['HUM-900001']);
    expect(planOnDisk(dir, text(asReal('human')), { npcId: 'SERA' }).decision).toBe('BLOCKED_RESERVED_ID');
    expect(() => importVoidOnDisk(dir, text({ schemaVersion: 1, characters: [], voidIds: [] }), 'x.json')).toThrow();
  });

  it('refuses, from an export, a character the same export retires — before the ledger has it', () => {
    const dir = freshDir();
    expect(planOnDisk(dir, text(asReal('human')), { npcId: 'SERA' }, ['HUM-900001']).decision).toBe('BLOCKED_RESERVED_ID');
  });

  it('switches WORLD LIFE ENGINE participation in the ledger only', () => {
    const dir = freshDir();
    const file = text(asReal('boss-monster'));
    const plan = planOnDisk(dir, file, { npcId: 'MON_ROOTRING' });
    adoptOnDisk(dir, file, { npcId: 'MON_ROOTRING' }, { decision: plan.decision, payloadHash: plan.payloadHash });
    const before = readFileSync(join(dir, 'characters', 'MON-900002.json'), 'utf8');
    const { written } = setLifeActorOnDisk(dir, 'MON-900002', true);
    expect(written).toEqual(['roster.json']);
    expect(loadForgeContent(dir).content.roster.characters[0].lifeActor).toBe(true);
    expect(readFileSync(join(dir, 'characters', 'MON-900002.json'), 'utf8')).toBe(before);
  });
});
