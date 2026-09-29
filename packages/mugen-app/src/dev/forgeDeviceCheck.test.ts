import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';

// THE DEVICE CHECK, FOR WHOEVER IS CHOSEN — in a build with more than one
// adopted character. The generated index is replaced for this file only:
// the real adopted characters (RIZEL, EDDA: real files and ledger) plus the bridge's own
// examples made non-sample IN MEMORY (test fixtures, never content) — a
// human life actor and a common monster that is not one — and a VOID id.
// Nothing here is a FORGE character that exists; nothing is written.

vi.mock('@mugen/content/forge/index.generated', async () => {
  const { applyForgeAdoption, planForgeAdoption } = await import('@mugen/core/forge/content');
  const { forgeAdoptionView } = await import('@mugen/content/forge/adoptionView');
  const { asReal } = await import('@mugen/core/forge/fixtures/load');
  const realRoster = (await import('@mugen/content/forge/roster.json')).default;
  const rizel = (await import('@mugen/content/forge/characters/HUM-000001.json')).default;
  const edda = (await import('@mugen/content/forge/characters/HUM-000002.json')).default;
  let roster: unknown = realRoster;
  const baselines: Record<string, unknown> = { 'HUM-000001': rizel, 'HUM-000002': edda };
  const list = [
    [asReal('human'), { npcId: 'SERA', region: 'ALDEN' }],
    [asReal('normal-monster'), { npcId: 'MOSS_ROLLER' }],
  ] as const;
  for (const [payload, choice] of list) {
    const content = { roster: roster as never, baselines: baselines as never, previous: {}, voidIds: [], damaged: [] };
    const plan = planForgeAdoption(JSON.stringify(payload), forgeAdoptionView(content), choice);
    roster = applyForgeAdoption(plan, content, '2026-09-29T02:00:00.000Z').roster;
    baselines[payload.characterId] = payload;
  }
  return {
    FORGE_ROSTER_DATA: roster,
    FORGE_VOID_DATA: { format: 'mugen-zero.forge-void', version: 1, ids: ['HUM-000004'], sources: [] },
    FORGE_BASELINE_DATA: baselines,
  };
});

const { forgeDeviceCheckTargets, evaluateForgeDeviceCheck, readDeviceSave } = await import('./forgeDeviceCheck');
type Save = Awaited<ReturnType<typeof readDeviceSave>>;

const EMPTY: Save = { events: [], stateRows: [], storedVersion: undefined, error: null };
const PLAYED: Save = {
  events: [],
  stateRows: [
    { key: 'hero_name', value: '主人公' },
    { key: 'unlocked_battle_bgm', value: [] },
  ],
  storedVersion: 3,
  error: null,
};
const ITEMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'];
const states = (rows: { id: string; state: string }[]) => Object.fromEntries(rows.map((r) => [r.id, r.state]));

describe('実機確認 for any adopted character', () => {
  it('offers only the characters adopted in this build — never a VOID id, never one not adopted', () => {
    const targets = forgeDeviceCheckTargets();
    expect(targets.map((t) => [t.characterId, t.npcId, t.lifeActor])).toEqual([
      ['HUM-000001', 'RIZEL', true],
      ['HUM-000002', 'EDDA', true],
      ['HUM-900001', 'SERA', true],
      ['MON-900001', 'MOSS_ROLLER', false],
    ]);
    expect(targets.find((t) => t.characterId === 'HUM-000001')?.name).toBe('リゼル');
    expect(targets.find((t) => t.characterId === 'HUM-000002')?.name).toBe('エッダ');
    expect(targets.map((t) => t.characterId)).not.toContain('HUM-000004');
    expect(targets.map((t) => t.characterId)).not.toContain('HUM-000005');
  });

  it('asks the same 11 items of each, from that character’s own files', () => {
    for (const { characterId, npcId } of forgeDeviceCheckTargets()) {
      const rows = evaluateForgeDeviceCheck(characterId, PLAYED);
      expect(rows.map((r) => r.id)).toEqual([...ITEMS, '状態']);
      // A played save: every item is judged except 6, which needs a wiped one.
      expect(states(rows), npcId).toEqual({
        ...Object.fromEntries(ITEMS.map((id) => [id, 'PASS'])),
        '6': 'UNCHECKED',
        状態: 'INFO',
      });
      expect(rows.find((r) => r.id === '1')!.label).toContain(`${characterId} → ${npcId}`);
      expect(rows.find((r) => r.id === '5')!.label).toContain(npcId);
    }
  });

  it('RIZEL: the items the phone passed on 2026-09-29 still pass, with the same PASS / 未確認 on each save', () => {
    const empty = states(evaluateForgeDeviceCheck('HUM-000001', EMPTY));
    expect(empty).toMatchObject({ '1': 'PASS', '2': 'PASS', '3': 'PASS', '4': 'PASS', '5': 'UNCHECKED', '6': 'PASS', '7': 'PASS', '8': 'PASS', '9': 'PASS', '10': 'PASS', '11': 'PASS' });
    const rows = evaluateForgeDeviceCheck('HUM-000001', PLAYED);
    expect(rows.find((r) => r.id === '4')!.label).toBe('一覧に「Life Engine 対象」（lifeActor = true）');
    expect(rows.find((r) => r.id === '10')!.detail).toContain('WARNING 1 件');
    expect(rows.find((r) => r.id === '状態')!.detail).toContain('関係 REL-000001 保留');
  });

  it('EDDA: the same 11 items as RIZEL, from her own files — no age warning (no age was sent), nothing made from her words', () => {
    expect(states(evaluateForgeDeviceCheck('HUM-000002', EMPTY))).toMatchObject({ '1': 'PASS', '2': 'PASS', '3': 'PASS', '4': 'PASS', '5': 'UNCHECKED', '6': 'PASS', '7': 'PASS', '8': 'PASS', '9': 'PASS', '10': 'PASS', '11': 'PASS' });
    const rows = evaluateForgeDeviceCheck('HUM-000002', PLAYED);
    expect(rows.find((r) => r.id === '1')!.label).toBe('採用済み一覧に HUM-000002 → EDDA がある');
    expect(rows.find((r) => r.id === '10')!.detail).toContain('WARNING 0 件');
    expect(rows.find((r) => r.id === '状態')!.detail).not.toContain('関係');
  });

  it('a character who is not a life actor is checked as one: not in the Life Engine, and that passes', () => {
    const rows = evaluateForgeDeviceCheck('MON-900001', PLAYED);
    expect(rows.find((r) => r.id === '4')).toMatchObject({ state: 'PASS', label: '一覧に「Life Engine 対象外」（lifeActor = false）' });
  });

  it('never passes what it cannot judge, or someone not adopted', () => {
    const missing = states(evaluateForgeDeviceCheck('HUM-000005', PLAYED));
    for (const id of ['1', '2', '3', '4', '5', '7', '10', '11']) expect(missing[id], id).toBe('FAIL');
    const broken = states(evaluateForgeDeviceCheck('HUM-000001', { ...EMPTY, error: 'blocked' }));
    for (const id of ['5', '6', '9']) expect(broken[id], id).toBe('FAIL');
  });

  it('finds FORGE data in a save, whoever is chosen', () => {
    const leaked: Save = { ...PLAYED, stateRows: [...PLAYED.stateRows, { key: 'note', value: 'HUM-900001' }] };
    expect(states(evaluateForgeDeviceCheck('HUM-000001', leaked))['9']).toBe('FAIL');
    expect(states(evaluateForgeDeviceCheck('HUM-900001', leaked))['9']).toBe('FAIL');
  });

  it('reads the save without writing to it: a missing save stays missing', async () => {
    const name = 'forge-device-check-test';
    const save = await readDeviceSave(name);
    expect(save).toMatchObject({ events: [], stateRows: [], error: null });
    const again = await readDeviceSave(name);
    expect(again.stateRows).toEqual([]);
    expect(again.events).toEqual([]);
  });
});
