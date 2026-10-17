import type { PartyBeat, PartyTechnique } from '@mugen/game/battle/partyBattle';
import type { MagicDef } from '@mugen/core/magic/magic';
import type { SfxId } from '@mugen/content/audio/sfx';
import type { CameraDir, CameraMove } from '../fx/camera';
import { CAMERA_COMBOS, personaOf } from '../fx/camera';
import type { ShakeLevel } from '../fx/screenShake';
import { MOMENT_SPECIAL_FX, specialFxOf, type SpecialEffectType } from '../fx/special/specialFx';

/**
 * WHAT EACH BLOW OF THE PARTY FIGHT LOOKS LIKE (作者「魔法・スキル・戦闘エフェクト強化」
 * 「CAMERA KICK」「CAMERA DIRECTOR」2026-10-17) — decided here, played by
 * PartyBattleScreen. One beat in, one plan out (pure, so it can be tested):
 *
 *   camera   what the camera does first (ui/fx/camera) — a KICK toward the one
 *            struck (the party strikes LEFT, a creature RIGHT), a lean in
 *            before a heavy blow, a draw back before a giant's
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
  /** The characters' own effects, each on someone (an id), from `at` ms. */
  special?: { type: SpecialEffectType; on: string; at: number }[];
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
}

/** The hit-stops (作者: 軽攻撃 30〜50 / スキル 50〜80 / 重攻撃 80〜120 / 必殺 100〜150ms; グレイヴ: 重撃 80〜120 / 豪断 100〜140). */
export const HIT_STOPS = { light: 40, skill: 65, heavy: 100, finisher: 130, goudan: 120 } as const;

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

export function beatFx(beat: PartyBeat, ctx: BeatContext): BeatFx {
  const persona = personaOf(ctx.actorArt ?? beat.actor);
  const tempo = persona.tempo;
  const none: BeatFx = { tempo, impact: 0, hitStop: 0, sfx: [] };
  const missed = !!beat.missed;
  // The party strikes toward the left of the screen (the creatures' side); a creature toward the right.
  const toward: CameraDir = beat.kind === 'ENEMY_ATTACK' ? 'right' : 'left';
  const kick = (strength: 'small' | 'medium' | 'large'): CameraMove & { wait?: number } =>
    persona.lead === 'SNAP' ? { kind: 'SNAP', from: ctx.actorAt, to: ctx.targetAt, strength } : { kind: 'KICK', dir: toward, strength };
  const reel = (px: number, down = 0) => (ctx.giant ? (px >= 6 ? { on: beat.target, px: 2, down: Math.min(down, 2) } : undefined) : { on: beat.target, px, down });

  switch (beat.kind) {
    case 'ATTACK':
      return {
        tempo,
        camera: [kick('small')],
        impact: 40,
        flash: { kind: 'slash', on: beat.target },
        hitStop: HIT_STOPS.light,
        sfx: ['battle_hit'],
        reel: reel(4),
        number: numberTier(beat, ctx),
      };
    case 'SKILL': {
      const own = specialFxOf(ctx.skillId);
      if (own.length > 0) {
        // 主人公's red moon (《瞬断》): the crescent cut instead of the common one.
        return {
          tempo,
          camera: [kick('small')],
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
        camera: [kick('small')],
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
      // ケイオス's way: the camera leans in on her as she casts, and snaps in at it landing.
      return {
        tempo,
        camera: [{ kind: 'PUSH_IN', strength: 'small', at: ctx.actorAt }],
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
        // A giant's big blow: the camera draws back, then is thrown at those it rushes.
        return {
          tempo,
          camera: CAMERA_COMBOS.PULL_RUSH('right'),
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
