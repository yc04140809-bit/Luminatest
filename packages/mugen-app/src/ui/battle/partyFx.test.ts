import { describe, expect, it } from 'vitest';
import type { PartyBeat, PartyTechnique } from '@mugen/game/battle/partyBattle';
import type { MagicDef } from '@mugen/core/magic/magic';
import { HIT_STOP_MAX_MS } from '../fx/screenShake';
import { KICK, KICK_PEAK_AT, sequenceTimes } from '../fx/camera';
import { COLLAPSE_FLOOR_MS, COLLAPSE_FX, COLLAPSE_JOLT, COLLAPSE_VIDEO, HIGANBANA_CUTS, HIGANBANA_FX, HIGANBANA_JOLT, HIT_STOPS, LUNGE_FLOOR_MS, BLOOM_FLOOR_MS, VANISH_FLOOR_MS, TRACE_FLOOR_MS, SHUNDAN_CUTS, SPELL_KICK_AT, beatFx, counterFx, numberTier, type BeatContext } from './partyFx';
import { MULTI_HIT_GAP_FLOOR_MS, MULTI_HIT_GAP_MS } from './multiHit';

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
    const fx = beatFx(beat({ actor: 'kaos' }), ctx());
    expect(fx.camera).toEqual([{ kind: 'KICK', dir: 'left', strength: 'small' }]);
    expect(fx.flash).toEqual({ kind: 'slash', on: 'enemy' });
    expect(fx.hitStop).toBe(HIT_STOPS.light);
    expect(fx.shake).toBeUndefined();
    // 主人公 sharp: his tempo under 1.
    expect(beatFx(beat({}), ctx()).tempo).toBeLessThan(1);
  });

  it('his swing (作者 2026-10-24 §23): he steps in at it, the blow as he arrives (its KICK with it), a breath, home — never a jump, ×2 included', () => {
    for (const speed of [1, 0.5]) {
      const fx = beatFx(beat({}), ctx({ speed }));
      const l = fx.lunge!;
      expect(l.out * speed).toBeGreaterThanOrEqual(LUNGE_FLOOR_MS);
      expect(l.home * speed).toBeGreaterThanOrEqual(LUNGE_FLOOR_MS);
      expect(fx.impact).toBeGreaterThan(l.out);
      expect(l.back).toBeGreaterThan(fx.impact + fx.hitStop);
      expect(fx.camera).toEqual([{ kind: 'KICK', dir: 'left', strength: 'small', wait: Math.round(l.out * speed) }]);
    }
    // Only his own sword: Grave's and Kaos's blows do not step.
    expect(beatFx(beat({ actor: 'grave' }), ctx()).lunge).toBeUndefined();
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

  it('《瞬断》 (作者 2026-10-24): two quick cuts of the hero\'s red moon, each tilted its own way (the second backhanded); he steps in deep and comes home; not グレイヴ\'s', () => {
    const fx = beatFx(beat({ kind: 'SKILL', name: '瞬断', amount: 40 }), ctx({ skillId: 'shundan' }));
    const at = [0, 1].map((i) => SHUNDAN_CUTS.lead + i * MULTI_HIT_GAP_MS);
    expect(fx.special).toEqual([
      { type: 'protagonist_redmoon_slash', on: 'enemy', at: at[0], turn: -16 },
      { type: 'protagonist_redmoon_slash', on: 'enemy', at: at[1], flip: true, turn: 18 },
    ]);
    expect(fx.stages?.map((st) => st.at)).toEqual([at[0] + SHUNDAN_CUTS.land]);
    expect(fx.stages?.every((st) => st.hitStop === HIT_STOPS.light)).toBe(true);
    expect(fx.impact).toBe(at[1] + SHUNDAN_CUTS.land);
    expect(fx.hitStop).toBe(HIT_STOPS.skill);
    expect(fx.split).toEqual([0.45, 0.55]);
    expect(fx.flash).toBeUndefined();
    expect(fx.lunge).toMatchObject({ deep: true });
    expect(fx.lunge!.out).toBeLessThan(at[0]);
    expect(fx.lunge!.back).toBeGreaterThan(fx.impact);
  });

  it('《彼岸花》 (最終仕様 §3–6): still, back and gone, a hush, there — two small quick cuts, a breath, a big near-upright third stepped into (a white flash, the long hold, a low heavy sound), the ground split, then the dark and the lilies; a number at each of the fight\'s three', () => {
    for (const speed of [1, 0.5]) {
      const fx = beatFx(beat({ kind: 'SKILL', name: '彼岸花', amount: 24, hits: [7, 7, 10], slowed: true }), ctx({ skillId: 'higanbana', speed }));
      const sp = fx.special!;
      expect(sp.map((x) => x.type)).toEqual(['protagonist_redmoon_slash', 'protagonist_redmoon_slash', 'protagonist_redmoon_slash']);
      expect(sp.map(({ turn, flip, scale }) => ({ turn, flip, scale }))).toEqual(HIGANBANA_CUTS.map((c) => ({ turn: c.turn, flip: 'flip' in c ? c.flip : undefined, scale: c.scale })));
      // The third is the big one, and comes after a breath.
      expect(sp[2].scale).toBeGreaterThan(sp[0].scale! * 1.5);
      expect(sp[2].at - sp[1].at).toBeGreaterThan(sp[1].at - sp[0].at);
      // Two quick cuts, never under the floor on screen.
      expect((sp[1].at - sp[0].at) * speed).toBeGreaterThanOrEqual(MULTI_HIT_GAP_FLOOR_MS);
      expect(fx.stages).toHaveLength(2);
      expect(fx.stages!.every((st) => st.hitStop === HIT_STOPS.light)).toBe(true);
      expect(fx.hitStop).toBe(HIT_STOPS.higanbana);
      expect(fx.hitStop).toBeGreaterThan(HIT_STOPS.finisher);
      expect(fx.flash).toEqual({ kind: 'heavy', on: 'enemy' });
      expect(fx.sfx).toEqual(['battle_finisher_hit', 'battle_hit_heavy']);
      expect(fx.amounts).toEqual([7, 7, 10]);
      // Still, then back and fading, then a hush — each seen at ×2 too — and only then there, before the first cut.
      const l = fx.lunge!;
      expect(l.vanish!.poise).toBeGreaterThan(0);
      expect((l.vanish!.fade - l.vanish!.poise) * speed).toBeGreaterThanOrEqual(VANISH_FLOOR_MS.fade);
      expect((l.out - l.vanish!.fade) * speed).toBeGreaterThanOrEqual(VANISH_FLOOR_MS.gone);
      expect(l.out).toBeLessThan(sp[0].at);
      // The one trace of him (仕上げ §2): after a hush, just before he is seen there, a flash — at ×2 too.
      expect(l.trace!.at).toBeGreaterThan(l.vanish!.fade);
      expect((l.trace!.at - l.vanish!.fade) * speed).toBeGreaterThanOrEqual(40);
      expect(l.trace!.at).toBeLessThan(l.out);
      expect(l.trace!.at + l.trace!.ms).toBeGreaterThan(l.out);
      expect(l.trace!.ms * speed).toBeGreaterThanOrEqual(TRACE_FLOOR_MS.ms);
      expect((l.out - l.trace!.at) * speed).toBeGreaterThanOrEqual(TRACE_FLOOR_MS.lead);
      // The third stepped into; the ground splits as it lands; the dark after it, long enough at ×2; home after.
      expect(l.stepAt).toBe(sp[2].at);
      expect(fx.crack!.at).toBe(fx.impact);
      expect(fx.bloom!.at).toBeGreaterThan(fx.crack!.at);
      expect(fx.bloom!.ms * speed).toBeGreaterThanOrEqual(BLOOM_FLOOR_MS);
      expect(l.back).toBeGreaterThan(fx.bloom!.at);
      // The next turn waits until he is home.
      expect(fx.hold! + 450).toBeGreaterThanOrEqual(l.back + l.home);
      expect(fx.also).toEqual([]);
    }
    // Brought down by the second: the second is the big one, and there is no third.
    const short = beatFx(beat({ kind: 'SKILL', name: '彼岸花', amount: 14, hits: [7, 7] }), ctx({ skillId: 'higanbana' }));
    expect(short.special).toHaveLength(2);
    expect(short.special![1].scale).toBe(HIGANBANA_CUTS[2].scale);
    expect(HIGANBANA_FX.breath).toBeGreaterThan(0);
  });

  it('《彼岸花》, its camera (作者 2026-10-26 最終 §4–6: シュッ、シュッ、ズバン): followed through all three cuts — the first two a light jolt, the third the heavy one; the third\'s cut the biggest', () => {
    const fx = beatFx(beat({ kind: 'SKILL', name: '彼岸花', amount: 24, hits: [7, 7, 10] }), ctx({ skillId: 'higanbana', cutIn: true }));
    const cam = fx.camera![0] as Extract<NonNullable<typeof fx.camera>[number], { kind: 'TRACK' }>;
    expect(cam.kind).toBe('TRACK');
    expect(cam.blows).toEqual([...fx.stages!.map((st) => st.at), fx.impact]);
    expect(cam.weights).toEqual([HIGANBANA_JOLT.first, HIGANBANA_JOLT.first, HIGANBANA_JOLT.last]);
    expect(HIGANBANA_JOLT.first).toBeLessThan(0.6);
    expect(HIGANBANA_JOLT.last).toBeGreaterThan(1);
    expect(HIGANBANA_CUTS[2].scale).toBeGreaterThan(HIGANBANA_CUTS[0].scale * 2);
    // Its longest hold, at the third cut: a moment still, at the ceiling a hold may be.
    expect(fx.hitStop).toBe(HIT_STOP_MAX_MS);
    // Another cut-in move of several cuts (《瞬断》) keeps the plain punches.
    const shundan = beatFx(beat({ kind: 'SKILL', name: '瞬断', amount: 9, split: [3, 3, 3] } as Partial<PartyBeat>), ctx({ skillId: 'shundan', cutIn: true }));
    expect((shundan.camera?.[0] as { weights?: unknown } | undefined)?.weights).toBeUndefined();
  });

  it('《彼岸花》 breaking them (作者 実機 2026-10-25: BREAKが早すぎて見れない): its BREAK after the bloom — the last cut lands as a cut, and the next turn waits the longer', () => {
    for (const speed of [1, 0.5]) {
      const plain = beatFx(beat({ kind: 'SKILL', name: '彼岸花', amount: 24, hits: [7, 7, 10] }), ctx({ skillId: 'higanbana', speed }));
      const broke = beatFx(beat({ kind: 'SKILL', name: '彼岸花', amount: 24, hits: [7, 7, 10], broke: true }), ctx({ skillId: 'higanbana', speed }));
      expect(plain.breakAt).toBeUndefined();
      // Not at the blow, nor in the dark: once the dark has lifted and the lilies are open.
      expect(broke.breakAt).toBe(broke.bloom!.at + broke.bloom!.ms);
      // The last cut still lands as a cut: its jolt and reeling.
      expect(broke.shake).toBe('medium');
      expect(broke.reel).toEqual(plain.reel);
      // Everything else the same; the next turn waits as much longer as the BREAK comes later.
      expect(broke.bloom).toEqual(plain.bloom);
      expect(broke.hold! - plain.hold!).toBe(broke.breakAt! - broke.impact);
    }
    // Any other move breaks them at its blow, as before.
    expect(beatFx(beat({ broke: true }), ctx()).breakAt).toBeUndefined();
  });

  it('《彼岸花》 at all of them: each cut on every one (the one aimed at first), the others flashed and reeling too; one that fell takes no more', () => {
    const spread = [
      { target: 'enemy-2', hits: [7, 7, 10], broke: false, slowed: true },
      { target: 'enemy', hits: [7, 7, 10], broke: false, slowed: true },
      { target: 'enemy-3', hits: [7, 7], broke: false, slowed: false },
    ];
    const fx = beatFx(beat({ kind: 'SKILL', name: '彼岸花', target: 'enemy-2', amount: 62, hits: [7, 7, 10], spread }), ctx({ skillId: 'higanbana' }));
    expect(fx.special).toHaveLength(8);
    expect(fx.special!.filter((x) => x.on === 'enemy-3')).toHaveLength(2);
    // The same three moments on each.
    const on = (id: string) => fx.special!.filter((x) => x.on === id).map((x) => x.at);
    expect(on('enemy')).toEqual(on('enemy-2'));
    expect(fx.stages).toHaveLength(2);
    expect(fx.flash).toEqual({ kind: 'heavy', on: 'enemy-2' });
    expect(fx.also).toEqual(['enemy', 'enemy-3']);
    expect(fx.amounts).toEqual([7, 7, 10]);
  });

  it('《瞬断》 at ×2: its cuts never closer than the floor on screen — three cuts, not one blur', () => {
    const fx = beatFx(beat({ kind: 'SKILL', name: '瞬断' }), ctx({ skillId: 'shundan', speed: 0.5 }));
    const blows = [...fx.stages!.map((st) => st.at), fx.impact];
    for (let i = 1; i < blows.length; i++) expect((blows[i] - blows[i - 1]) * 0.5).toBeGreaterThanOrEqual(MULTI_HIT_GAP_FLOOR_MS);
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
    'the ordinary blow': beatFx(beat({ actor: 'kaos' }), ctx()),
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
      // KICK's peak is KICK_PEAK_AT in (camera.ts); the blow lands at `impact`, halved at ×2. A light blow
      // lands almost at once, so its kick (kept to KICK_MIN_MS at ×2) may peak with it — within a frame.
      expect(last.start + (last.end - last.start) * KICK_PEAK_AT).toBeLessThanOrEqual(fx.impact * speed + ONE_FRAME);
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
      expect(m && 'strength' in m ? KICK[m.strength!].pct : 0).toBeLessThanOrEqual(KICK.small.pct);
    }
  });
});

describe('a cut-in move\'s camera follows it — TRACK (作者 2026-10-23, FF Resonance\'s way)', () => {
  const kaosSpell = beat({ actor: 'kaos', kind: 'MAGIC', name: 'x' });
  const fire = { element: 'FIRE' } as MagicDef;

  it('ケイオス\'s spell, 《瞬断》, 重撃・豪断 with a cut-in: one TRACK from the one acting to the one struck, timed to the blow, nothing after it', () => {
    const cases = [
      [kaosSpell, ctx({ spell: fire, cutIn: true }), 'medium'],
      [beat({ kind: 'SKILL', name: '瞬断' }), ctx({ skillId: 'shundan', cutIn: true }), 'medium'],
      [beat({ actor: 'grave', kind: 'TECH', name: '重撃・豪断', amount: 30 }), ctx({ tech: tech('HEAVY'), skillId: 'goudan', cutIn: true }), 'large'],
    ] as const;
    for (const [b, c, strength] of cases) {
      const fx = beatFx(b, c);
      // A move of several cuts (《瞬断》): there by the first, held through each (the last is the blow).
      const several = fx.split ? { impact: fx.stages![0].at, blows: [...fx.stages!.map((st) => st.at), fx.impact] } : { impact: fx.impact, blows: undefined };
      expect(fx.camera).toEqual([{ kind: 'TRACK', from: c.actorAt, to: c.targetAt, ...several, strength }]);
      expect(fx.after).toBeUndefined();
      // The rest of the plan as it was: the hold, the flash or its own effects, the jolt after.
      const plain = beatFx(b, { ...c, cutIn: false });
      expect(fx.hitStop).toBe(plain.hitStop);
      expect(fx.shake).toBe(plain.shake);
      expect(fx.special).toEqual(plain.special);
    }
  });

  it('without a cut-in, a plain attack, a miss or a heal: the camera as it was', () => {
    expect(beatFx(kaosSpell, ctx({ spell: fire })).camera?.[0].kind).toBe('KICK');
    expect(beatFx(beat({}), ctx({ cutIn: true })).camera?.[0].kind).toBe('KICK');
    expect(beatFx(beat({ kind: 'SKILL', missed: true }), ctx({ cutIn: true })).camera?.[0]?.kind).not.toBe('TRACK');
    expect(beatFx(beat({ actor: 'kaos', kind: 'MEND', target: 'grave' }), ctx({ cutIn: true })).camera).toBeUndefined();
  });
});

describe('ケイオス 《双極臨界 → 界核崩壊》: her two circles, the seal, the suction film, the stillness, the release (作者 2026-10-26, グレードアップ v2)', () => {
  const collapse = (speed: number, hits: number[] = [4, 5, 5, 9]) =>
    beatFx(beat({ actor: 'kaos', kind: 'SKILL', name: '双極臨界', amount: 23, hits, magicDown: true }), ctx({ skillId: 'soukyoku_rinkai', speed })).collapse!;

  it('×1: the white alone first (0.5s), then the black-purple, the two together (0.7s or more), pulled into the seal while they are still there', () => {
    const c = collapse(1);
    expect(c.purple - c.white).toBe(COLLAPSE_FX.alone);
    expect(c.purple - c.white).toBeGreaterThanOrEqual(500);
    expect(c.both - c.purple).toBe(COLLAPSE_FX.enter);
    // Both there (opened through pulled in) 0.7s or more (v2 §16); the hush before the seal 0.2–0.4s.
    expect(c.drained - c.both).toBeGreaterThanOrEqual(700);
    expect(c.core - c.both).toBeGreaterThanOrEqual(200);
    expect(c.core - c.both).toBeLessThanOrEqual(400);
    // The film begins while the circles are still being pulled in (no gap: the seal falls into it).
    expect(c.video).toBeLessThan(c.drained);
    expect(c.video).toBeGreaterThan(c.core);
  });

  it('the film to its point at its own speed, then the stillness (0.15–0.25s — 2026-10-30 F-2), then the release', () => {
    const c = collapse(1);
    const film = (ms: number) => Math.round(ms / COLLAPSE_VIDEO.rate);
    expect(c.rate).toBe(COLLAPSE_VIDEO.rate);
    expect(c.still).toBe(COLLAPSE_FX.still);
    expect(c.still).toBeGreaterThanOrEqual(150);
    expect(c.still).toBeLessThanOrEqual(250);
    expect(c.burst).toBe(c.video + film(COLLAPSE_VIDEO.pull) + c.still);
  });

  it('×2: the film quicker but not doubled (1.7), the circles and the stillness keeping their floors on screen (still ≥ 0.15s)', () => {
    const c = collapse(0.5);
    const screen = (ms: number) => ms * 0.5;
    expect(c.rate).toBe(COLLAPSE_VIDEO.rateFast);
    expect(screen(c.purple - c.white)).toBeGreaterThanOrEqual(COLLAPSE_FLOOR_MS.alone);
    expect(screen(c.core - c.both)).toBeGreaterThanOrEqual(COLLAPSE_FLOOR_MS.hush);
    expect(screen(c.drained - c.core)).toBeGreaterThanOrEqual(COLLAPSE_FLOOR_MS.drain);
    expect(screen(c.still)).toBeGreaterThanOrEqual(COLLAPSE_FLOOR_MS.still);
    expect(screen(c.still)).toBeGreaterThanOrEqual(150);
    // The pull on screen: its 2.4s at 1.7.
    expect(screen(c.burst - c.still - c.video)).toBeCloseTo(COLLAPSE_VIDEO.pull / COLLAPSE_VIDEO.rateFast, -1);
    expect(screen(c.burst)).toBeLessThan(collapse(1).burst);
  });

  it('nothing lands before the release (v2 §4–6): no strike before it — every number, COMBO and HP at it, with its hold', () => {
    const fx = beatFx(beat({ actor: 'kaos', kind: 'SKILL', name: '双極臨界', amount: 23, hits: [4, 5, 5, 9], magicDown: true }), ctx({ skillId: 'soukyoku_rinkai' }));
    expect(fx.stages ?? []).toEqual([]);
    expect(fx.impact).toBe(fx.collapse!.burst);
    expect(fx.amounts).toEqual([4, 5, 5, 9]);
    expect(fx.hitStop).toBe(HIT_STOPS.higanbana);
    // Brought down before the fourth: the same — shown at the release, the release whole.
    const early = beatFx(beat({ actor: 'kaos', kind: 'SKILL', name: '双極臨界', amount: 9, hits: [4, 5] }), ctx({ skillId: 'soukyoku_rinkai' }));
    expect(early.stages ?? []).toEqual([]);
    expect(early.impact).toBe(early.collapse!.burst);
    expect(early.hitStop).toBe(HIT_STOPS.higanbana);
  });

  it('the camera stays on her and her circles until the film takes over, then its one jolt at the release', () => {
    const fx = beatFx(beat({ actor: 'kaos', kind: 'SKILL', name: '双極臨界', amount: 23, hits: [4, 5, 5, 9] }), ctx({ skillId: 'soukyoku_rinkai', cutIn: true }));
    const track = fx.camera![0] as { kind: string; impact: number; blows?: number[]; weights?: number[] };
    expect(track.kind).toBe('TRACK');
    expect(track.impact).toBe(fx.collapse!.video);
    expect(track.blows).toEqual([fx.collapse!.burst]);
    expect(track.weights).toEqual([COLLAPSE_JOLT.last]);
  });
});
