import { describe, expect, it } from 'vitest';
import type { PartyBeat, PartyTechnique } from '@mugen/game/battle/partyBattle';
import type { MagicDef } from '@mugen/core/magic/magic';
import { HIT_STOP_MAX_MS } from '../fx/screenShake';
import { KICK, sequenceTimes } from '../fx/camera';
import { HIT_STOPS, SPELL_KICK_AT, beatFx, counterFx, numberTier, type BeatContext } from './partyFx';

// What each blow of the party fight looks like (作者 2026-10-17: エフェクト強化 / CAMERA KICK / CAMERA DIRECTOR).

const beat = (b: Partial<PartyBeat>): PartyBeat => ({ actor: 'hero', kind: 'ATTACK', target: 'enemy', amount: 10, read: 'PLAIN', ...b });
const ctx = (c: Partial<BeatContext> = {}): BeatContext => ({ giant: false, targetMaxHp: 500, targetAt: 0.2, actorAt: 0.7, ...c });
const tech = (kind: PartyTechnique['kind']): PartyTechnique => ({ id: kind, name: kind, kind, mpCost: 0, target: kind === 'HEAVY' ? 'ENEMY' : 'SELF' });

describe('the hit-stops (作者: 軽 30〜50 / スキル 50〜80 / 重 80〜120 / 必殺 100〜150ms)', () => {
  it('each in its band, and none past the cap', () => {
    const bands = { light: [30, 50], skill: [50, 80], heavy: [80, 120], finisher: [100, 150] } as const;
    for (const [k, [lo, hi]] of Object.entries(bands)) {
      const v = HIT_STOPS[k as keyof typeof HIT_STOPS];
      expect(v).toBeGreaterThanOrEqual(lo);
      expect(v).toBeLessThanOrEqual(hi);
      expect(v).toBeLessThanOrEqual(HIT_STOP_MAX_MS);
    }
  });
});

describe('beatFx', () => {
  it('the ordinary blow: a small KICK toward the creatures (left), a white cut, a light hold', () => {
    const fx = beatFx(beat({}), ctx());
    expect(fx.camera).toEqual([{ kind: 'KICK', dir: 'left', strength: 'small' }]);
    expect(fx.flash).toEqual({ kind: 'slash', on: 'enemy' });
    expect(fx.hitStop).toBe(HIT_STOPS.light);
    expect(fx.shake).toBeUndefined();
    // 主人公 sharp: his tempo under 1.
    expect(fx.tempo).toBeLessThan(1);
  });

  it('a creature\'s blow kicks the other way (right), with red claws', () => {
    const fx = beatFx(beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero' }), ctx({ targetMaxHp: 100 }));
    expect(fx.camera?.[0]).toMatchObject({ kind: 'KICK', dir: 'right' });
    expect(fx.flash?.kind).toBe('claw');
  });

  it('重撃・豪断: a lean in first, a heavy hold at the blow, then the camera thrown back, a medium jolt, the creature sinking', () => {
    const fx = beatFx(beat({ actor: 'grave', kind: 'TECH', name: '重撃・豪断', amount: 30 }), ctx({ tech: tech('HEAVY') }));
    expect(fx.camera?.[0].kind).toBe('PUSH_IN');
    expect(fx.hitStop).toBe(HIT_STOPS.heavy);
    expect(fx.after?.kind).toBe('RECOIL');
    expect(fx.shake).toBe('medium');
    expect(fx.reel?.down).toBeGreaterThan(0);
    expect(fx.number).toBe('big');
    expect(fx.impact).toBeGreaterThan(fx.camera ? 100 : 0);
    // Breaking it: the BREAK is played after the hold — no shake of its own here.
    expect(beatFx(beat({ actor: 'grave', kind: 'TECH', broke: true }), ctx({ tech: tech('HEAVY') })).shake).toBeUndefined();
  });

  it('ヴァルシール barely moves for a small blow; a heavy one moves it a little', () => {
    expect(beatFx(beat({}), ctx({ giant: true })).reel).toBeUndefined();
    expect(beatFx(beat({ actor: 'grave', kind: 'TECH' }), ctx({ giant: true, tech: tech('HEAVY') })).reel?.px).toBeLessThanOrEqual(2);
  });

  it('ケイオス\'s spell: her circle first, a small KICK toward the creatures as it flies, the spell\'s own colour where it lands, a snap in', () => {
    const fire = { element: 'FIRE' } as MagicDef;
    const fx = beatFx(beat({ actor: 'kaos', kind: 'MAGIC', name: 'x' }), ctx({ spell: fire }));
    expect(fx.camera).toEqual([{ kind: 'KICK', dir: 'left', strength: 'small', wait: SPELL_KICK_AT }]);
    expect(fx.cast).toEqual({ on: 'kaos', colour: 'fire' });
    expect(fx.flash).toMatchObject({ kind: 'magic', colour: 'fire' });
    expect(fx.after?.kind).toBe('IMPACT_ZOOM');
    expect(fx.sfx).toContain('battle_magic_fire');
  });

  it('星癒の羽 and 月影の構え: no camera, no hold, no jolt — feathers; his moon arc (the hero\'s own)', () => {
    const feather = beatFx(beat({ actor: 'kaos', kind: 'TECH', target: 'grave', amount: 0 }), ctx({ tech: tech('REGEN') }));
    expect(feather.flash).toEqual({ kind: 'feather', on: 'grave' });
    expect(feather.camera).toBeUndefined();
    expect(feather.hitStop).toBe(0);
    const guard = beatFx(beat({ kind: 'TECH', target: 'hero', amount: 0 }), ctx({ tech: tech('MOON_GUARD'), skillId: 'moon_guard' }));
    expect(guard.special).toEqual([{ type: 'protagonist_counter_moon', on: 'hero', at: 0 }]);
    expect(guard.camera).toBeUndefined();
    expect(guard.shake).toBeUndefined();
    expect(guard.hitStop).toBe(0);
  });

  it('a giant\'s heavy blow: a small kick toward its own side, a gathering, a medium kick at the party; a large jolt', () => {
    const fx = beatFx(beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', name: 'コア照射' }), ctx({ giant: true, moves: { heavy: 'コア照射', sweep: '光翼の旋風' }, actorArt: 'valsheel' }));
    expect(fx.camera?.map((m) => [m.kind, 'dir' in m && m.dir, m.strength])).toEqual([
      ['KICK', 'left', 'small'],
      ['KICK', 'right', 'medium'],
    ]);
    expect(fx.camera?.[1].wait).toBeGreaterThan(0);
    expect(fx.shake).toBe('large');
    // ヴァルシール is slow.
    expect(fx.tempo).toBeGreaterThan(1);
    expect(beatFx(beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', name: '光翼の旋風' }), ctx({ giant: true, moves: { heavy: 'コア照射', sweep: '光翼の旋風' } })).shake).toBe('medium');
  });

  it('the counter: after the creature\'s blow, his waiting moon let go — a crescent cut on it, a hold, a kick toward it', () => {
    const fx = counterFx(beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', counter: 9 }), { giant: false });
    expect(fx.special).toEqual([
      { type: 'protagonist_counter_release', on: 'hero', at: 200 },
      { type: 'protagonist_counter_slash', on: 'enemy', at: 240 },
    ]);
    expect(fx.camera?.[0]).toMatchObject({ kind: 'KICK', dir: 'left' });
    expect(fx.hitStop).toBe(HIT_STOPS.skill);
  });
});

describe('numberTier', () => {
  it('WEAK and resisted say so; a big share of its health reads big; else plain', () => {
    expect(numberTier(beat({ read: 'WEAK' }), { targetMaxHp: 500 })).toBe('weak');
    expect(numberTier(beat({ read: 'RESISTED' }), { targetMaxHp: 500 })).toBe('resisted');
    expect(numberTier(beat({ amount: 80 }), { targetMaxHp: 500 })).toBe('big');
    expect(numberTier(beat({ amount: 10 }), { targetMaxHp: 500 })).toBeUndefined();
  });
});

describe('the characters\' own (作者 2026-10-17)', () => {
  it('グレイヴ\'s 重撃・豪断: the 重撃 falls (its own hold and medium jolt, the creature sinking), the blade gathers, the 豪断 cleaves (a longer hold, a large jolt, thrown aside); the next turn waits for it', () => {
    const fx = beatFx(beat({ actor: 'grave', kind: 'TECH', name: '重撃・豪断', amount: 30 }), ctx({ tech: tech('HEAVY'), skillId: 'goudan' }));
    expect(fx.special?.map((s) => [s.type, s.on])).toEqual([
      ['grave_juugeki', 'enemy'],
      ['grave_goudan_charge', 'grave'],
      ['grave_goudan', 'enemy'],
    ]);
    expect(fx.stages).toHaveLength(1);
    expect(fx.stages![0]).toMatchObject({ hitStop: HIT_STOPS.heavy, shake: 'medium' });
    expect(fx.stages![0].reel?.down).toBeGreaterThan(0);
    expect(fx.stages![0].at).toBeLessThan(fx.impact);
    expect(fx.hitStop).toBe(HIT_STOPS.goudan);
    expect(fx.hitStop).toBeGreaterThanOrEqual(100);
    expect(fx.hitStop).toBeLessThanOrEqual(140);
    expect(fx.shake).toBe('large');
    expect(fx.reel?.px).toBeGreaterThan(0);
    expect(fx.camera?.map((m) => m.kind)).toEqual(['PUSH_IN', 'KICK']);
    expect(fx.hold).toBeGreaterThan(0);
    // No common flash: his own effects only.
    expect(fx.flash).toBeUndefined();
    // ヴァルシール: barely moved.
    const giant = beatFx(beat({ actor: 'grave', kind: 'TECH', amount: 30 }), ctx({ tech: tech('HEAVY'), skillId: 'goudan', giant: true }));
    expect(giant.reel?.px).toBeLessThanOrEqual(2);
    expect(giant.stages![0].reel?.down).toBeLessThanOrEqual(2);
  });

  it('《瞬断》: the hero\'s red moon instead of the common cut; not グレイヴ\'s', () => {
    const fx = beatFx(beat({ kind: 'SKILL', name: '瞬断' }), ctx({ skillId: 'shundan' }));
    expect(fx.special).toEqual([{ type: 'protagonist_redmoon_slash', on: 'enemy', at: 0 }]);
    expect(fx.flash).toBeUndefined();
    expect(fx.hitStop).toBe(HIT_STOPS.skill);
  });

  it('月影の構え\'s dodge: his outline left behind', () => {
    const fx = beatFx(beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', missed: true, amount: 0 }), ctx());
    expect(fx.special?.[0]).toMatchObject({ type: 'protagonist_evade', on: 'hero' });
  });

  it('ケイオス\'s 彗星撃: the wings open behind her as she begins; her spell goes on as before', () => {
    const fx = beatFx(beat({ actor: 'kaos', kind: 'MAGIC', name: '彗星撃' }), ctx({ skillId: 'comet_strike', spell: { element: 'STAR' } as MagicDef }));
    expect(fx.special).toEqual([{ type: 'kaos_twin_wings', on: 'kaos', at: 0 }]);
    expect(fx.flash?.kind).toBe('magic');
    // A spell with no wings of its own: none.
    expect(beatFx(beat({ actor: 'kaos', kind: 'MAGIC' }), ctx({ skillId: 'not_flagged' })).special).toEqual([]);
  });
});

describe('CAMERA KICK, in its place (作者 TIGS「CAMERA KICK」: KICK → 技発動 → 命中 → HIT STOP → SHAKE)', () => {
  const ONE_FRAME = 1000 / 60;
  const giantCtx = ctx({ giant: true, moves: { heavy: 'コア照射', sweep: '光翼の旋風' }, actorArt: 'valsheel' });
  const plans = {
    'the ordinary blow': beatFx(beat({}), ctx()),
    '《瞬断》': beatFx(beat({ kind: 'SKILL', name: '瞬断' }), ctx({ skillId: 'shundan' })),
    'ケイオス\'s spell': beatFx(beat({ actor: 'kaos', kind: 'MAGIC', name: 'x' }), ctx({ spell: { element: 'FIRE' } as MagicDef })),
    '重撃・豪断': beatFx(beat({ actor: 'grave', kind: 'TECH', name: '重撃・豪断', amount: 30 }), ctx({ tech: tech('HEAVY'), skillId: 'goudan' })),
    'ヴァルシール\'s big blow': beatFx(beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', name: 'コア照射' }), giantCtx),
    'a creature\'s heavy blow': beatFx(beat({ actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero', name: 'コア照射' }), ctx({ moves: { heavy: 'コア照射' } })),
  };

  it.each(Object.entries(plans))('%s: the last KICK peaks before the blow lands — at ×1 and at ×2', (_name, fx) => {
    for (const speed of [1, 0.5]) {
      const times = sequenceTimes(fx.camera ?? [], fx.tempo * speed);
      const kicks = times.filter((t) => t.kind === 'KICK');
      expect(kicks.length).toBeGreaterThan(0);
      const last = kicks[kicks.length - 1];
      // KICK's peak is 30% in (camera.ts); the blow lands at `impact`, halved at ×2. A light blow
      // lands almost at once, so its kick (kept to KICK_MIN_MS at ×2) may peak with it — within a frame.
      expect(last.start + (last.end - last.start) * 0.3).toBeLessThanOrEqual(fx.impact * speed + ONE_FRAME);
    }
  });

  it('a blow that is about to BREAK the creature kicks harder (medium); one that is not, small', () => {
    expect(beatFx(beat({ broke: true }), ctx()).camera?.[0]).toMatchObject({ kind: 'KICK', strength: 'medium' });
    expect(beatFx(beat({ kind: 'SKILL', broke: true }), ctx()).camera?.[0]).toMatchObject({ kind: 'KICK', strength: 'medium' });
    expect(beatFx(beat({}), ctx()).camera?.[0]).toMatchObject({ kind: 'KICK', strength: 'small' });
  });

  it('feathers, 月影の構え and a heal never move the camera; nobody\'s ordinary blow kicks harder than small', () => {
    expect(beatFx(beat({ kind: 'MEND', target: 'grave' }), ctx()).camera).toBeUndefined();
    expect(beatFx(beat({ actor: 'kaos', kind: 'TECH', target: 'grave', amount: 0 }), ctx({ tech: tech('REGEN') })).camera).toBeUndefined();
    for (const actor of ['hero', 'grave', 'kaos']) {
      const m = beatFx(beat({ actor }), ctx()).camera?.[0];
      expect(m && 'strength' in m ? KICK[m.strength!].px : 0).toBeLessThanOrEqual(KICK.small.px);
    }
  });
});
