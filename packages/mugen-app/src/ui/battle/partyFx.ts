import type { PartyBeat, PartyTechnique } from '@mugen/game/battle/partyBattle';
import type { MagicDef } from '@mugen/core/magic/magic';
import type { SfxId } from '@mugen/content/audio/sfx';
import type { CameraDir, CameraMove, CameraStrength } from '../fx/camera';
import { personaOf } from '../fx/camera';
import type { ShakeLevel } from '../fx/screenShake';
import { MOMENT_SPECIAL_FX, specialFxOf, type SpecialEffectType } from '../fx/special/specialFx';
import { multiHitGap, multiHitOf } from './multiHit';

/**
 * WHAT EACH BLOW OF THE PARTY FIGHT LOOKS LIKE (作者「魔法・スキル・戦闘エフェクト強化」
 * 「CAMERA KICK」「CAMERA DIRECTOR」2026-10-17) — decided here, played by
 * PartyBattleScreen. One beat in, one plan out (pure, so it can be tested):
 *
 *   camera   what the camera does first (ui/fx/camera) — a KICK toward the one
 *            struck (the party strikes LEFT, a creature RIGHT), a lean in
 *            before a heavy blow, a giant's drawn in and then thrown (TIGS)
 *   impact   when the blow lands (ms after the beat), for the flash, the
 *            hit-stop, the layered sound and the shake to wait for
 *   flash    what flashes where it lands (white slash, heavy burst, a spell's
 *            colour, a soft heal, 星癒の羽's feathers, 月影's aura, the counter)
 *   hitStop  how long the field holds at the blow — light 40, a skill 65,
 *            heavy 100, a finisher's 130 (作者: 30〜50 / 50〜80 / 80〜120 / 100〜150)
 *   shake    the SCREEN SHAKE after the hold, for the heavy ones
 *   after    the camera's answer at the blow (RECOIL after 豪断, an IMPACT ZOOM on a spell)
 *   reel     how the one struck moves (a creature the size of ヴァルシール barely)
 *   number   how the damage number reads (big, WEAK, resisted)
 *
 * Order (作者): KICK → the blow → HIT STOP → SHAKE. Everything is fire-and-
 * forget: the fight's turns never wait on it, and at ×2 it is all halved.
 * A BREAK is played by the screen itself after the blow's hold (hit → stop →
 * SE → shake → BREAK!! → it reels), so a breaking blow has no shake here.
 *
 * THE CHARACTERS' OWN (作者 2026-10-17; ui/fx/special): a skill flagged in
 * SKILL_SPECIAL_FX plays its own effects (`special`) instead of the common
 * flash — グレイヴ's 重撃・豪断 as two blows (the downward 重撃, a hold and
 * a jolt — `stages` — then the cleave of 豪断), 主人公's red moon on 《瞬断》,
 * 月影の構え, its dodge and its counter, ケイオス's wings behind her. A long
 * one asks the next turn to wait a little (`hold`), so it is seen whole.
 */

export type HitFlash = 'slash' | 'skill' | 'heavy' | 'magic' | 'mend' | 'feather' | 'guard' | 'counter' | 'claw' | 'crush';
export type NumberTier = 'big' | 'weak' | 'resisted';
export type MagicColour = 'star' | 'fire' | 'ice' | 'thunder' | 'plain';

/** A blow before the last one (重撃 before 豪断): its own hold, jolt and reeling. */
export interface FxStage {
  at: number;
  hitStop: number;
  shake?: ShakeLevel;
  reel?: { on: string; px: number; down: number };
}

export interface BeatFx {
  camera?: (CameraMove & { wait?: number })[];
  /** The characters' own effects, each on someone (an id), from `at` ms — turned the other way, tilted (deg), bigger or smaller. */
  special?: { type: SpecialEffectType; on: string; at: number; flip?: boolean; turn?: number; scale?: number }[];
  /** Blows before the last (`impact` is the last). */
  stages?: FxStage[];
  /** How much longer (ms) the next turn waits, for a long one to be seen whole. */
  hold?: number;
  tempo: number;
  impact: number;
  flash?: { kind: HitFlash; on: string; colour?: MagicColour };
  /** A spell's circle at the feet of the one casting (from the beat on). */
  cast?: { on: string; colour: MagicColour };
  hitStop: number;
  sfx: SfxId[];
  shake?: ShakeLevel;
  after?: CameraMove;
  reel?: { on: string; px: number; down: number };
  number?: NumberTier;
  /**
   * A move of several cuts (multiHit.ts — 《瞬断》 three): each cut's share of the amount. Its blows are
   * the stages and the last (`impact`); the screen shows a number at each.
   */
  split?: readonly number[];
  /** A move of several strikes of its own (《彼岸花》): what each landed — a number at each. */
  amounts?: readonly number[];
  /**
   * HE STEPS IN (作者 2026-10-24 §23 — a long sword: into the creature's reach, the blow, back): out to
   * it by `out` ms, home again from `back`, taking `home`. Only the hero, only his own sword.
   */
  lunge?: {
    out: number;
    back: number;
    home: number;
    deep?: boolean;
    /**
     * 《彼岸花》 (最終仕様 §3–4): before going in he is still until `poise`, then slides BACK and fades, gone
     * by `fade`; unseen until `out`, when he is there — too fast to follow, not a spell's teleport.
     */
    vanish?: { poise: number; fade: number };
    /** The last blow stepped into, further in, from this moment. */
    stepAt?: number;
    /**
     * 《彼岸花》 (仕上げ §1–2): the one trace of him while he is gone — a thin red line where he ran and his
     * blade's glint at the creature's front, from `at` for `ms`, just before he is seen there.
     */
    trace?: { at: number; ms: number };
  };
  /** 《彼岸花》: the ground under them splits at `at`, red light running in the cracks. */
  crack?: { at: number };
  /** 《彼岸花》: the world goes still (dark) from `at` for `ms`, and red spider lilies open out of the cracks. */
  bloom?: { at: number; ms: number };
  /**
   * When its BREAK is played, if not at the blow (作者 実機 2026-10-25: BREAKの表示が早すぎて彼岸花のエフェクトが
   * 見れない): 《彼岸花》 breaking them plays its BREAK once the bloom's dark has lifted and the lilies are open
   * — the last cut lands as a cut (its hold, jolt and reeling), and the next turn waits the longer.
   */
  breakAt?: number;
  /** A move at all of them (《彼岸花》): the others struck besides `flash.on` — the last blow's flash and reeling on each. */
  also?: readonly string[];
}

/** The hit-stops (作者: 軽攻撃 30〜50 / スキル 50〜80 / 重攻撃 80〜120 / 必殺 100〜150ms; グレイヴ: 重撃 80〜120 / 豪断 100〜140). */
export const HIT_STOPS = { light: 40, skill: 65, heavy: 100, finisher: 130, goudan: 120, higanbana: 150 } as const;

/** ケイオス's spell: how long (ms) her circle shows before the camera kicks with the spell. */
export const SPELL_KICK_AT = 60;

/** A giant's big blow: drawn in a little, a gathering, then thrown at the party. Not light — ヴァルシール is slow. */
export const GIANT_WINDUP: (CameraMove & { wait?: number })[] = [
  { kind: 'KICK', dir: 'left', strength: 'small' },
  { kind: 'KICK', dir: 'right', strength: 'medium', wait: 80 },
];

/**
 * 主人公's 《瞬断》, two quick cuts (作者 2026-10-24 — three until 《彼岸花》 took the three): the first cut
 * starts this long into the beat — after its cut-in the camera wants that long to get there, and he
 * is in at the creature by then — then the next a multiHitGap later; each is his red moon, tilted its
 * own way (the second backhanded), landing at the moon's own moment (protagonist_redmoon_slash, 110ms).
 */
export const SHUNDAN_CUTS = { lead: 260, land: 110, turns: [{ turn: -16 }, { flip: true, turn: 18 }, { turn: 40 }] } as const;

/**
 * HIS STEP IN (作者 2026-10-24 §23): the swing quick — in, the blow, a breath, home; 《瞬断》 quicker and
 * deeper; 《彼岸花》 the fastest. Never closer than LUNGE_FLOOR_MS on screen (×2 included), so it is a
 * step and not a jump.
 */
export const LUNGE = {
  attack: { out: 170, linger: 90, home: 190 },
  shundan: { out: 140, linger: 80, home: 180 },
  // 《彼岸花》: in unseen (HIGANBANA_FX — he vanishes and is there); only his way home is a step.
  higanbana: { home: 240 },
} as const;
export const LUNGE_FLOOR_MS = 120;

/**
 * 《彼岸花》 in time (ms, at ×1 — 作者 2026-10-24 最終仕様 §3): still a moment (`poise`); slides back, fading
 * (`fade`); gone, a hush (`gone`); there among them — two quick cuts (`quick` apart, never under the
 * multi-hit floor on screen), a breath, the big third stepped into; the ground splits (`crack` before
 * the dark); the world dark for `dark`, lilies opening out of the cracks, petals over everything; home.
 * Each cut lands at the moon's own moment (`land`). On screen never shorter than the floors (×2).
 */
export const HIGANBANA_FX = { poise: 110, fade: 250, gone: 170, quick: 170, breath: 90, land: 110, crack: 170, dark: 640 } as const;
export const BLOOM_FLOOR_MS = 380;
/** His slide back and the hush after it, on screen at least (×2 too): seen, not skipped. */
export const VANISH_FLOOR_MS = { fade: 160, gone: 110 } as const;
/**
 * The trace of him in the hush (仕上げ §2): it comes `lead` before he is seen and lasts `ms` — on screen
 * never under the floors, so at ×2 it is still a flash and not nothing; the hush before it is kept.
 */
export const TRACE_MS = { lead: 90, ms: 160 } as const;
export const TRACE_FLOOR_MS = { lead: 60, ms: 100 } as const;
/** The three cuts' looks: small and nearly flat; the other way and steeper; big and near upright. */
export const HIGANBANA_CUTS = [
  { turn: -10, scale: 0.8 },
  { flip: true, turn: 24, scale: 0.85 },
  { turn: 80, scale: 1.55 },
] as const;

/** グレイヴ's 重撃・豪断, in time (ms from the beat): the 重撃 falls, the blade gathers, the 豪断 cleaves. */
export const GRAVE_CHAIN = { juugeki: 120, charge: 300, goudan: 460, hold: 450 } as const;

export interface BeatContext {
  /** The id of the skill, technique or spell used (the flag's key — SKILL_SPECIAL_FX). */
  skillId?: string;
  tech?: PartyTechnique;
  spell?: MagicDef;
  /** A creature as big as the screen (ヴァルシール): it barely moves for a small blow. */
  giant: boolean;
  /** The one struck's whole health, for how big the number reads. */
  targetMaxHp: number;
  /** The creature's named blows. */
  moves?: { heavy?: string; sweep?: string };
  /** Where the one struck stands, across the screen (0 left – 1 right). */
  targetAt: number;
  /** Where the one acting stands. */
  actorAt: number;
  /** The creature acting (its own camera way), when it is a creature. */
  actorArt?: string;
  /** The move played a cut-in first (cutin/skillCutIn, magic/spellCutIn): its camera follows it — TRACK. */
  cutIn?: boolean;
  /** The fight's speed: 1, or 0.5 at ×2 — so a move of several cuts keeps them apart (multiHitGap). */
  speed?: number;
}

const COLOUR: Record<string, MagicColour> = { STAR: 'star', FIRE: 'fire', ICE: 'ice', THUNDER: 'thunder' };
const MAGIC_SFX: Record<MagicColour, SfxId> = {
  star: 'battle_magic_holy',
  fire: 'battle_magic_fire',
  ice: 'battle_magic_ice',
  thunder: 'battle_magic_thunder',
  plain: 'battle_magic_hit',
};

/** How the number reads: WEAK and resisted say so; a big share of its health reads big. */
export function numberTier(beat: PartyBeat, ctx: Pick<BeatContext, 'targetMaxHp'>, heavy = false): NumberTier | undefined {
  if (beat.read === 'WEAK') return 'weak';
  if (beat.read === 'RESISTED') return 'resisted';
  if (heavy || (ctx.targetMaxHp > 0 && beat.amount >= ctx.targetMaxHp * 0.15)) return 'big';
  return undefined;
}

/** How hard the camera follows each kind of cut-in move (TRACK). */
const TRACK_STRENGTH: Partial<Record<PartyBeat['kind'], CameraStrength>> = { MAGIC: 'medium', SKILL: 'medium', TECH: 'large' };

/**
 * A move that played a cut-in has its camera FOLLOW it (作者 2026-10-23 — FF Resonance's way, for the
 * cut-in moves only): lean in on the one acting, swing at the one struck, held, the KICK at the blow,
 * back to the wide picture (ui/fx/camera TRACK). It stands for the move's whole camera — the lean and
 * kick it had, and the snap in after (which would cancel it) — the rest of the plan as it was.
 */
export function beatFx(beat: PartyBeat, ctx: BeatContext): BeatFx {
  const plan = plainBeatFx(beat, ctx);
  const strength = TRACK_STRENGTH[beat.kind];
  if (!ctx.cutIn || !strength || beat.missed || !plan.camera) return plan;
  // A move of several cuts: there before the first, held through every one of them.
  const several = !!(plan.split || plan.amounts);
  const first = several ? plan.stages?.[0]?.at : undefined;
  const blows = first === undefined ? undefined : [...(plan.stages ?? []).map((st) => st.at), plan.impact];
  // 《彼岸花》, a finisher: the camera follows it hardest.
  const how: CameraStrength = plan.amounts ? 'large' : strength;
  return { ...plan, camera: [{ kind: 'TRACK', from: ctx.actorAt, to: ctx.targetAt, impact: first ?? plan.impact, blows, strength: how }], after: undefined };
}

function plainBeatFx(beat: PartyBeat, ctx: BeatContext): BeatFx {
  const persona = personaOf(ctx.actorArt ?? beat.actor);
  const tempo = persona.tempo;
  const none: BeatFx = { tempo, impact: 0, hitStop: 0, sfx: [] };
  const missed = !!beat.missed;
  // The party strikes toward the left of the screen (the creatures' side); a creature toward the right.
  const toward: CameraDir = beat.kind === 'ENEMY_ATTACK' ? 'right' : 'left';
  const kick = (strength: 'small' | 'medium' | 'large'): CameraMove & { wait?: number } =>
    persona.lead === 'SNAP' ? { kind: 'SNAP', from: ctx.actorAt, to: ctx.targetAt, strength } : { kind: 'KICK', dir: toward, strength };
  // A blow that is about to BREAK the creature kicks harder (作者 TIGS「CAMERA KICK」: BREAK直前の強攻撃).
  const lead = beat.broke ? 'medium' : 'small';
  const reel = (px: number, down = 0) => (ctx.giant ? (px >= 6 ? { on: beat.target, px: 2, down: Math.min(down, 2) } : undefined) : { on: beat.target, px, down });

  /** At this speed, never shorter on screen than `floor`. */
  const atLeast = (ms: number, floor: number) => Math.max(ms, floor / (ctx.speed ?? 1));
  const hero = beat.actor === 'hero';

  switch (beat.kind) {
    case 'ATTACK':
      if (hero) {
        // His swing: in at it, the blow, a breath, home (§23).
        const l = LUNGE.attack;
        const out = Math.round(atLeast(l.out, LUNGE_FLOOR_MS));
        const impact = out + 40;
        const back = impact + HIT_STOPS.light + l.linger;
        return {
          tempo,
          // The KICK as he arrives (a sequence's wait is in screen time: the speed is applied here).
          camera: [{ ...kick(lead), wait: Math.round(out * (ctx.speed ?? 1)) }],
          impact,
          flash: { kind: 'slash', on: beat.target },
          hitStop: HIT_STOPS.light,
          sfx: ['battle_hit'],
          reel: reel(4),
          number: numberTier(beat, ctx),
          lunge: { out, back, home: Math.round(atLeast(l.home, LUNGE_FLOOR_MS)) },
          hold: 120,
        };
      }
      return {
        tempo,
        camera: [kick(lead)],
        impact: 40,
        flash: { kind: 'slash', on: beat.target },
        hitStop: HIT_STOPS.light,
        sfx: ['battle_hit'],
        reel: reel(4),
        number: numberTier(beat, ctx),
      };
    case 'SKILL': {
      const own = specialFxOf(ctx.skillId);
      const shares = multiHitOf(ctx.skillId);
      if (beat.hits && beat.hits.length > 0 && ctx.skillId === 'higanbana') return higanbanaFx(beat, ctx, tempo, lead, kick, reel);
      if (own.length > 0 && shares) {
        // 《瞬断》, three cuts: his red moon each time, tilted its own way; a light hold and a small reel at
        // the first two, the skill's hold at the last. One amount, shown as three (multiHit.ts).
        const speed = ctx.speed ?? 1;
        const gap = multiHitGap(speed) / speed;
        const c = SHUNDAN_CUTS;
        const cuts = shares.map((_, i) => Math.round(c.lead + i * gap));
        const impact = cuts[cuts.length - 1] + c.land;
        const l = LUNGE.shundan;
        return {
          tempo,
          camera: [kick(lead)],
          special: cuts.map((at, i) => ({ type: own[0], on: beat.target, at, ...c.turns[i % c.turns.length] })),
          stages: cuts.slice(0, -1).map((at) => ({ at: at + c.land, hitStop: HIT_STOPS.light, reel: reel(4) })),
          impact,
          hitStop: HIT_STOPS.skill,
          sfx: [],
          reel: reel(7),
          number: numberTier(beat, ctx),
          split: shares,
          // In deeper and quicker than his swing, the cuts, home (§23).
          lunge: hero
            ? { out: Math.round(atLeast(l.out, LUNGE_FLOOR_MS)), back: impact + HIT_STOPS.skill + l.linger, home: Math.round(atLeast(l.home, LUNGE_FLOOR_MS)), deep: true }
            : undefined,
          hold: cuts[cuts.length - 1] - cuts[0] + 150,
        };
      }
      if (own.length > 0) {
        // 主人公's red moon (《瞬断》): the crescent cut instead of the common one.
        return {
          tempo,
          camera: [kick(lead)],
          special: own.map((type) => ({ type, on: beat.target, at: 0 })),
          impact: 110,
          hitStop: HIT_STOPS.skill,
          sfx: [],
          reel: reel(6),
          number: numberTier(beat, ctx),
        };
      }
      return {
        tempo,
        camera: [kick(lead)],
        impact: 50,
        flash: { kind: 'skill', on: beat.target },
        hitStop: HIT_STOPS.skill,
        sfx: ['battle_hit'],
        reel: reel(6),
        number: numberTier(beat, ctx),
      };
    }
    case 'MAGIC': {
      const colour = COLOUR[ctx.spell?.element ?? ''] ?? 'plain';
      // ケイオス's spell (作者 TIGS「CAMERA KICK」: 魔法陣 → KICK SMALL → 発射 → 着弾 → SHAKE): her circle
      // first, then the camera kicks as it flies, and snaps in at it landing.
      return {
        tempo,
        camera: [{ kind: 'KICK', dir: toward, strength: 'small', wait: SPELL_KICK_AT }],
        cast: { on: beat.actor, colour },
        // ケイオス's wings, for the spells that have them, open behind her as she begins.
        special: specialFxOf(ctx.skillId).map((type) => ({ type, on: beat.actor, at: 0 })),
        impact: 260,
        flash: { kind: 'magic', on: beat.target, colour },
        hitStop: HIT_STOPS.skill,
        sfx: [MAGIC_SFX[colour]],
        after: { kind: 'IMPACT_ZOOM', strength: 'small', at: ctx.targetAt },
        shake: beat.broke ? undefined : 'small',
        reel: reel(5),
        number: numberTier(beat, ctx),
      };
    }
    case 'MEND':
      return { ...none, flash: { kind: 'mend', on: beat.target }, cast: { on: beat.actor, colour: 'star' } };
    case 'TECH': {
      const kind = ctx.tech?.kind;
      // 月影の構え: the moon arc behind him, his blade's line held — quiet, but not nothing.
      if (kind === 'MOON_GUARD') return { ...none, special: specialFxOf(ctx.skillId ?? 'moon_guard').map((type) => ({ type, on: beat.target, at: 0 })) };
      // 星癒の羽: soft, no jolt, no hold — feathers.
      if (kind === 'REGEN') return { ...none, flash: { kind: 'feather', on: beat.target } };
      const own = specialFxOf(ctx.skillId);
      if (own.includes('grave_juugeki') && own.includes('grave_goudan')) {
        // グレイヴ's 重撃・豪断: the camera leans in; the 重撃 falls straight down (a hold, a jolt, the
        // creature sinks); the blade gathers its lightning, the camera kicks, the 豪断 cleaves
        // across (a longer hold, the snap in, a large jolt, the creature thrown a little aside).
        const c = GRAVE_CHAIN;
        return {
          tempo,
          camera: [
            { kind: 'PUSH_IN', strength: 'small', at: ctx.actorAt },
            { kind: 'KICK', dir: 'left', strength: 'medium' },
          ],
          special: [
            { type: 'grave_juugeki', on: beat.target, at: c.juugeki },
            { type: 'grave_goudan_charge', on: beat.actor, at: c.charge },
            { type: 'grave_goudan', on: beat.target, at: c.goudan },
          ],
          stages: [{ at: c.juugeki + 60, hitStop: HIT_STOPS.heavy, shake: 'medium', reel: { on: beat.target, px: 0, down: ctx.giant ? 2 : 6 } }],
          impact: c.goudan + 50,
          hitStop: HIT_STOPS.goudan,
          sfx: [],
          after: { kind: 'IMPACT_ZOOM', strength: 'small', at: ctx.targetAt },
          shake: beat.broke ? undefined : 'large',
          reel: ctx.giant ? { on: beat.target, px: 2, down: 0 } : { on: beat.target, px: 8, down: 0 },
          number: numberTier(beat, ctx, true),
          hold: c.hold,
        };
      }
      // 重撃・豪断: the camera leans in (the wind-up), the blow lands, the field holds, then the
      // camera is thrown back, the field jolts, the creature sinks.
      return {
        tempo,
        camera: [{ kind: 'PUSH_IN', strength: 'small', at: ctx.actorAt }],
        impact: 220,
        flash: { kind: 'heavy', on: beat.target },
        hitStop: HIT_STOPS.heavy,
        sfx: ['battle_hit_heavy'],
        after: { kind: 'RECOIL', dir: 'left', strength: 'medium' },
        shake: beat.broke ? undefined : 'medium',
        reel: reel(8, 6),
        number: numberTier(beat, ctx, true),
      };
    }
    case 'ENEMY_ATTACK': {
      // 月影の構え's dodge: his outline left where he was.
      if (missed) return { ...none, camera: [kick('small')], special: MOMENT_SPECIAL_FX.evade.map((type) => ({ type, on: beat.target, at: 40 })) };
      const heavy = !!beat.name && beat.name === ctx.moves?.heavy;
      const sweep = !!beat.name && beat.name === ctx.moves?.sweep;
      if (heavy && ctx.giant) {
        // A giant's big blow (作者 TIGS「CAMERA KICK」 ヴァルシール): a small kick toward its own side (drawn
        // in), the gathering, then a medium kick at those it rushes — both before the blow lands.
        return {
          tempo,
          camera: GIANT_WINDUP,
          impact: 420,
          flash: { kind: 'crush', on: beat.target },
          hitStop: HIT_STOPS.heavy,
          sfx: ['battle_boss_hit'],
          shake: 'large',
          number: 'big',
        };
      }
      if (heavy || sweep) {
        return {
          tempo,
          camera: [{ kind: 'KICK', dir: 'right', strength: 'medium' }],
          impact: 90,
          flash: { kind: 'crush', on: beat.target },
          hitStop: HIT_STOPS.heavy,
          sfx: ['battle_hit_heavy'],
          shake: 'medium',
          number: 'big',
        };
      }
      return {
        tempo,
        camera: [kick('small')],
        impact: 50,
        flash: { kind: 'claw', on: beat.target },
        hitStop: HIT_STOPS.light,
        sfx: [],
        number: numberTier(beat, ctx),
      };
    }
    default:
      return none;
  }
}

/** 月影の構え's counter: after the creature's blow, his answer — a white cut, a hold, a kick toward it. */
export function counterFx(beat: PartyBeat, ctx: Pick<BeatContext, 'giant'>): BeatFx {
  // His waiting moon let go (behind him), flying at the creature as a crescent cut.
  const [release, slash] = MOMENT_SPECIAL_FX.counter;
  return {
    tempo: personaOf('hero').tempo,
    camera: [{ kind: 'KICK', dir: 'left', strength: 'small', wait: 260 }],
    special: [
      { type: release, on: beat.target, at: 200 },
      { type: slash, on: beat.actor, at: 240 },
    ],
    impact: 330,
    hitStop: HIT_STOPS.skill,
    sfx: ['battle_hit'],
    reel: ctx.giant ? undefined : { on: beat.actor, px: 5, down: 0 },
  };
}

/**
 * 《彼岸花》 (作者 2026-10-24, 最終仕様 §3–9): a moment still; he slides back and fades out; a hush; he is
 * among them — two quick cuts (small and flat, then the other way: a light hold each), a breath, the big
 * third stepped into (near upright, a white flash, the long hold, a low heavy sound, the field jolted);
 * the ground under them splits, red light in the cracks; dark, and red spider lilies open out of the
 * cracks, petals over the whole screen; home. At all of them: each cut on every one standing.
 * A number at each cut (`amounts` — the fight's own; the others' from the beat's `spread`).
 */
function higanbanaFx(
  beat: PartyBeat,
  ctx: BeatContext,
  tempo: number,
  lead: CameraStrength,
  kick: (strength: CameraStrength) => CameraMove & { wait?: number },
  reel: (px: number, down?: number) => { on: string; px: number; down: number } | undefined,
): BeatFx {
  const speed = ctx.speed ?? 1;
  const atLeast = (ms: number, floor: number) => Math.max(ms, floor / speed);
  const h = HIGANBANA_FX;
  const fade = h.poise + Math.round(atLeast(h.fade, VANISH_FLOOR_MS.fade));
  const out = fade + Math.round(atLeast(h.gone, VANISH_FLOOR_MS.gone));
  const trace = { at: out - Math.round(atLeast(TRACE_MS.lead, TRACE_FLOOR_MS.lead)), ms: Math.round(atLeast(TRACE_MS.ms, TRACE_FLOOR_MS.ms)) };
  const quick = Math.round(Math.max(h.quick, multiHitGap(speed) / speed));
  const first = out + 10;
  const all = beat.hits ?? [beat.amount];
  const struck = beat.spread ?? [{ target: beat.target, hits: all }];
  // The cuts that landed (one that brought them all down ends it): the last of them is the big one.
  const n = Math.max(...struck.map((x) => x.hits.length));
  const cuts = Array.from({ length: n }, (_, i) => (i < n - 1 ? first + i * quick : first + (n - 1) * quick + (n > 1 ? h.breath : 0)));
  const looks = cuts.map((_, i) => (i === n - 1 ? HIGANBANA_CUTS[2] : HIGANBANA_CUTS[i % 2]));
  const impact = cuts[n - 1] + h.land;
  const dark = Math.round(atLeast(h.dark, BLOOM_FLOOR_MS));
  const bloomAt = impact + Math.round(atLeast(h.crack, 100));
  const back = bloomAt + Math.round(dark * 0.7);
  const home = Math.round(atLeast(LUNGE.higanbana.home, LUNGE_FLOOR_MS));
  // Its BREAK after the bloom, never over it: the dark lifted, the lilies open.
  const breakAt = beat.broke ? bloomAt + dark : undefined;
  return {
    tempo,
    camera: [kick(lead)],
    special: struck.flatMap((x) => x.hits.map((_, i) => ({ type: 'protagonist_redmoon_slash' as const, on: x.target, at: cuts[i], ...looks[i] }))),
    stages: cuts.slice(0, -1).map((at) => ({ at: at + h.land, hitStop: HIT_STOPS.light, reel: reel(3) })),
    impact,
    flash: { kind: 'heavy', on: beat.target },
    hitStop: HIT_STOPS.higanbana,
    sfx: ['battle_finisher_hit', 'battle_hit_heavy'],
    shake: 'medium',
    reel: reel(8),
    number: numberTier(beat, ctx, true),
    amounts: all,
    lunge: { out, back, home, deep: true, vanish: { poise: h.poise, fade }, stepAt: cuts[n - 1], trace },
    crack: { at: impact },
    bloom: { at: bloomAt, ms: dark },
    also: struck.filter((x) => x.target !== beat.target && x.hits.length > 0).map((x) => x.target),
    ...(breakAt !== undefined ? { breakAt } : {}),
    // The next turn waits for him to be home (its own wait, 450–700ms, already counted) — and, when it
    // breaks them, as much longer as its BREAK comes later than a blow's would.
    hold: back + home + 250 - 450 + (breakAt !== undefined ? breakAt - impact : 0),
  };
}
