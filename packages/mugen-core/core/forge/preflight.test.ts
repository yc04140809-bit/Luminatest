import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { preflightForgePackage } from './preflight';
import { EMPTY_ROSTER, applyForgeAdoption, planForgeAdoption } from './content';
import { canonicalJson } from './canonical';
import { asReal, resent, sampleText } from './fixtures/load';
import { forgeAdoptionView } from '../../content/forge/adoptionView';
import type { ForgeContent, ForgeDeployPackage } from './types';

// 事前検証 (preflight): PASS / WARNING / ERROR before any apply. ERROR means
// the file is never applied; WARNING means it may be previewed and, after
// a look, applied. Nothing is ever corrected — every case below also
// proves the package it was given is unchanged.

const EMPTY: ForgeContent = { roster: EMPTY_ROSTER, baselines: {}, previous: {}, voidIds: [], damaged: [] };

function holding(payload: ForgeDeployPackage, npcId: string): ForgeContent {
  const plan = planForgeAdoption(JSON.stringify(payload), forgeAdoptionView(EMPTY), { npcId });
  const change = applyForgeAdoption(plan, EMPTY, '2026-10-05T00:00:00.000Z');
  return { ...EMPTY, roster: change.roster, baselines: { [payload.characterId]: payload } };
}

const codes = (r: ReturnType<typeof preflightForgePackage>, level?: 'WARNING' | 'ERROR') =>
  r.items.filter((i) => !level || i.level === level).map((i) => i.code);

/** A v1.1 sample with nothing to say about it: placeholders gone, fields filled. */
function clean(name: 'human' | 'normal-monster' | 'boss-monster'): ForgeDeployPackage {
  return asReal(name, (p) => {
    const drop = (list: unknown) => (Array.isArray(list) ? list.filter((x) => x !== 'なし') : list);
    if (p.combat) {
      p.combat.uniqueSkillCandidates = drop(p.combat.uniqueSkillCandidates);
      p.combat.weaknesses = drop(p.combat.weaknesses);
    }
    const body = p.profile.body as Record<string, unknown> | undefined;
    if (body) body.specialParts = drop(body.specialParts);
    const visual = p.visualDiversity as Record<string, unknown> | null;
    if (visual) {
      visual.signatures = drop(visual.signatures);
      visual.skinLifeMarks = drop(visual.skinLifeMarks);
    }
    p.relationshipPotential = drop(p.relationshipPotential) as string[];
    p.profile.importance = p.profile.importance || '一般';
  });
}

describe('事前検証: PASS / WARNING / ERROR', () => {
  it('PASS when there is nothing to say, and the package is untouched', () => {
    for (const name of ['human', 'normal-monster', 'boss-monster'] as const) {
      const p = clean(name);
      const before = canonicalJson(p);
      const r = preflightForgePackage(p);
      expect(r.items, name).toEqual([]);
      expect(r).toMatchObject({ result: 'PASS', canApply: true });
      expect(canonicalJson(p)).toBe(before);
    }
    expect(preflightForgePackage(clean('boss-monster')).kind).toBe('BOSS');
    expect(preflightForgePackage(clean('normal-monster')).kind).toBe('MONSTER');
  });

  it('the real adopted packages: WARNING at most — never an ERROR, always appliable', () => {
    for (const id of ['HUM-000001', 'HUM-000002', 'MON-000001']) {
      const text = readFileSync(new URL(`../../content/forge/characters/${id}.json`, import.meta.url), 'utf8');
      const r = preflightForgePackage(text);
      expect(r.result, id).toBe('WARNING');
      expect(codes(r, 'ERROR'), id).toEqual([]);
      expect(r.canApply, id).toBe(true);
    }
  });

  it('ERROR: unreadable, a breach of the contract, a sample — never appliable', () => {
    expect(preflightForgePackage('{ broken').result).toBe('ERROR');
    const breach = preflightForgePackage(asReal('boss-monster', (p) => (p.bossEncounter = null)));
    expect(breach).toMatchObject({ result: 'ERROR', canApply: false });
    expect(preflightForgePackage(asReal('human', (p) => ((p.visualDirection as Record<string, unknown>).intensity = 'NORMAL'))).result).toBe('ERROR');
    expect(codes(preflightForgePackage(sampleText('human')), 'ERROR')).toContain('SAMPLE_ONLY');
    // ERRORs are listed before WARNINGs.
    const mixed = preflightForgePackage(sampleText('boss-monster'));
    expect(mixed.items[0].level).toBe('ERROR');
  });

  it('WARNING: a placeholder among real candidates, and a duplicate', () => {
    const r = preflightForgePackage(asReal('normal-monster', (p) => {
      p.combat!.uniqueSkillCandidates = ['硬質化', 'なし', '地中潜行'];
      p.combat!.weaknesses = ['光に弱い', '光に弱い'];
    }));
    expect(r.result).toBe('WARNING');
    const items = r.items.filter((i) => i.path.startsWith('combat.'));
    expect(items.map((i) => `${i.code}:${i.path}`)).toEqual(expect.arrayContaining(['PLACEHOLDER_IN_LIST:combat.uniqueSkillCandidates', 'DUPLICATE_IN_LIST:combat.weaknesses']));
    // A list that is only 「なし」 says "none" plainly: nothing to flag.
    const none = clean('normal-monster');
    none.combat!.weaknesses = ['なし'];
    expect(codes(preflightForgePackage(none))).not.toContain('PLACEHOLDER_IN_LIST');
  });

  it('WARNING: the package disagreeing with itself — FORGE’s own fields, never a table of ZERO’s', () => {
    const p = clean('boss-monster');
    (p.combat!.aptitude as Record<string, number>).physical = 0.99;
    p.profile.encounterRole = 'NORMAL';
    (p.visualDiversity as Record<string, unknown>).structureConflicts = ['二足なのに四足歩行'];
    (p.profile.element as Record<string, unknown>).affinity = 3;
    (p.profile.body as Record<string, unknown>).size = 7;
    p.profile.classification = '未設定';
    const r = preflightForgePackage(p);
    expect(r.result).toBe('WARNING');
    expect(codes(r)).toEqual(
      expect.arrayContaining(['COMBAT_APTITUDE_DISAGREES', 'ENCOUNTER_ROLE_DISAGREES', 'STRUCTURE_CONFLICTS', 'FIELD_TYPE', 'FIELD_UNSET']),
    );
    expect(r.items.find((i) => i.code === 'FIELD_UNSET')?.path).toBe('profile.classification');
  });

  it('WARNING: a human’s empty profile fields are named — and not filled in', () => {
    const p = clean('human');
    p.profile.age = '';
    p.profile.gender = '';
    const r = preflightForgePackage(p);
    expect(r.items.find((i) => i.code === 'FIELD_UNSET')?.message).toContain('age・gender');
    expect(p.profile.age).toBe('');
  });

  it('against what is held: VOID, another type, an older send are ERRORs; a changed role, name or version are WARNINGs', () => {
    const boss = clean('boss-monster');
    const held = holding(boss, 'ROOTRING');
    // The same file again is not a conflict.
    expect(preflightForgePackage(boss, held).result).toBe('PASS');
    expect(codes(preflightForgePackage(boss, { ...EMPTY, voidIds: [boss.characterId] }), 'ERROR')).toContain('RESERVED_ID');
    const older = resent(boss, 2, (p) => (p.deployment.deployedAt = '2026-01-01T00:00:00.000Z'));
    expect(codes(preflightForgePackage(older, held), 'ERROR')).toContain('DEPLOYMENT_CONFLICT');
    const asNormal = resent(boss, 2, (p) => {
      p.encounterRole = 'NORMAL';
      p.profile.encounterRole = 'NORMAL';
      p.bossEncounter = null;
      p.identity.speciesName = '別の名前';
      p.identity.name = '別の名前';
    });
    const changed = preflightForgePackage(asNormal, held);
    expect(changed.result).toBe('WARNING');
    expect(codes(changed)).toEqual(expect.arrayContaining(['ENCOUNTER_ROLE_CHANGED', 'NAME_CHANGED']));
    const backwards = resent(boss, 2, (p) => (p.deployment.deployedVersion = '0.1'));
    expect(codes(preflightForgePackage(backwards, held))).toContain('VERSION_NOT_NEWER');
    const human = clean('human');
    expect(codes(preflightForgePackage({ ...human, characterId: boss.characterId, characterType: 'human' }, held), 'ERROR')).toContain('ID_TYPE_CONFLICT');
  });
});
