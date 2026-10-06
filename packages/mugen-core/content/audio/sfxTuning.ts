// HOW EACH SOUND IS PLAYED IN THE APP — which file, how loud, how much
// its pitch may wander, and how long it may ring.
//
// THE FILES STAY AS THEY WERE DELIVERED. Everything a fight needs from
// them — a light hit and a boss's hit from the same thump, a long magic
// circle cut short at double speed — is decided here, by the name of the
// MOMENT, and never by editing a file.
//
//   source   the delivered file a moment borrows when it has none of its
//            own (battle_hit → the short thump of battle_attack_strike).
//   gain     loudness, set from the files' measured levels (2026-10-06):
//            the delivered files differ by ~9 dB, and an ordinary swing
//            is the reference. A special move is the most present — but
//            by its weight (low end, length, layering) as much as level.
//   pitch    the most a repeated sound may drift either way (0.04 picks
//            0.96 / 1.00 / 1.04), so a flurry is not one sample looped.
//            Small on purpose: more turns a sword comic.
//   rate     a fixed pitch instead: the hero's heavier swing is his own
//            slash, a shade lower.
//   maxMs    the longest it rings at ×1, then a short fade. Several of
//            the delivered magic sounds run 3–8 seconds; at ×2 this is
//            shortened again (SFX_FAST_RING), so they do not pile up.
//
// Read by the App only. The Artifact carries no sound effects at all.

import type { SfxId } from './sfx';

export interface SfxTuning {
  source?: SfxId;
  gain?: number;
  pitch?: number;
  rate?: number;
  maxMs?: number;
}

/** At ×2, a capped sound rings this share of its ×1 length. */
export const SFX_FAST_RING = 0.6;

export const SFX_TUNING: Partial<Record<SfxId, SfxTuning>> = {
  // ---- swings, by weapon (the reference level is the sword's) ----
  battle_attack_slash: { gain: 0.85, pitch: 0.04 },
  // Lighter and quicker than his sword: quieter, and a little more drift
  // so his flurries never sound mechanical.
  battle_attack_dagger: { gain: 0.48, pitch: 0.05 },
  battle_attack_thrust: { gain: 0.6, pitch: 0.04 },
  battle_attack_bow: { gain: 0.85, pitch: 0.03 },
  battle_attack_strike: { gain: 0.62, pitch: 0.04 },
  battle_attack_heavy_strike: { gain: 0.66, pitch: 0.03 },
  battle_attack_heavy_weapon: { gain: 0.6, maxMs: 700 },
  battle_attack_whip: { gain: 0.9, pitch: 0.03 },
  // His skill: the same blade, a step heavier.
  battle_skill_slash: { source: 'battle_attack_slash', gain: 0.95, rate: 0.9 },

  // ---- landing on the opponent ----
  battle_hit: { source: 'battle_attack_strike', gain: 0.5, pitch: 0.05 },
  battle_hit_light: { source: 'battle_attack_strike', gain: 0.36, pitch: 0.05 },
  battle_hit_heavy: { source: 'battle_attack_heavy_strike', gain: 0.68, pitch: 0.03 },
  battle_boss_hit: { source: 'battle_attack_heavy_strike', gain: 0.58, pitch: 0.04 },
  battle_bow_hit: { source: 'battle_attack_strike', gain: 0.45, pitch: 0.06 },
  // Not wired yet (no criticals in the fight): the accent laid OVER an
  // ordinary hit the day there are — the blade's ring, short and higher.
  battle_critical: { source: 'battle_attack_slash', gain: 0.55, rate: 1.15, maxMs: 300 },

  // ---- landing on the party ----
  battle_damage: { gain: 0.55, pitch: 0.04 },

  // ---- down ----
  battle_enemy_defeat: { source: 'battle_down', gain: 0.62 },
  // A boss goes down heavier: the special move's weight, not just louder.
  battle_boss_defeat: { source: 'battle_finisher_hit', gain: 0.8, maxMs: 1200 },
  battle_down: { gain: 0.62 },

  // ---- magic ----
  battle_cutin: { gain: 0.88, maxMs: 1600 },
  magic_cast: { gain: 0.78, maxMs: 1300 },
  battle_charge_aura: { gain: 0.8, maxMs: 900 },
  // Her star landing: a bright, crystalline burst — magic, not a blade.
  battle_magic_hit: { source: 'battle_magic_ice', gain: 0.7, pitch: 0.03, maxMs: 700 },
  battle_finisher_hit: { gain: 0.85 },
  battle_heal: { gain: 0.88, maxMs: 1400 },
  battle_buff: { source: 'battle_magic_holy', gain: 0.75, maxMs: 800 },
  battle_debuff: { source: 'battle_magic_dark', gain: 0.85, maxMs: 700 },
  battle_magic_fire: { gain: 0.7, maxMs: 1500 },
  battle_magic_ice: { gain: 0.75, maxMs: 1200 },
  battle_magic_thunder: { gain: 0.7, maxMs: 1500 },
  battle_magic_wind: { gain: 0.7, maxMs: 1000 },
  battle_magic_earth: { gain: 0.85, maxMs: 1500 },
  battle_magic_dark: { gain: 1, maxMs: 1500 },
  battle_magic_holy: { gain: 1, maxMs: 1500 },

  // ---- ready, not yet used by the fight ----
  battle_evade: { source: 'battle_attack_whip', gain: 0.6, maxMs: 400 },
};

/** The delivered file a moment plays. */
export function sfxSourceOf(id: SfxId): SfxId {
  return SFX_TUNING[id]?.source ?? id;
}

/** The pitch this playing of it takes: fixed, or a small drift (one of three steps). */
export function sfxRateFor(id: SfxId, rnd: () => number = Math.random): number {
  const t = SFX_TUNING[id];
  if (t?.rate) return t.rate;
  const v = t?.pitch ?? 0;
  if (v <= 0) return 1;
  const step = Math.floor(rnd() * 3) % 3; // 0, 1, 2
  return 1 + (step - 1) * v;
}

/** How long it may ring at this speed, in ms, or null for its own length. */
export function sfxRingMs(id: SfxId, speed: number): number | null {
  const max = SFX_TUNING[id]?.maxMs;
  if (!max) return null;
  return Math.round(speed > 1 ? max * SFX_FAST_RING : max);
}
