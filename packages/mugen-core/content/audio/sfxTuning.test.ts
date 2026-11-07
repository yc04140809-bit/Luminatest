import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SFX_IDS } from './sfx';
import { SFX_FAST_RING, SFX_TUNING, sfxRateFor, sfxRingMs, sfxSourceOf } from './sfxTuning';

const SE_DIR = join(dirname(fileURLToPath(import.meta.url)), '../../../mugen-assets/files/audio/se');
const delivered = new Set(readdirSync(SE_DIR).filter((n) => n.endsWith('.mp3')).map((n) => n.replace(/\.mp3$/, '')));

describe('how each sound is played', () => {
  it('every moment that borrows a file borrows one that was delivered', () => {
    for (const [id, t] of Object.entries(SFX_TUNING)) {
      expect(SFX_IDS, id).toContain(id);
      if (t?.source) expect(delivered.has(t.source), `${id} → ${t.source}`).toBe(true);
    }
  });

  it('loudness only turns down (a phone cannot play louder than the file); pitch drifts a little, never comically', () => {
    for (const [id, t] of Object.entries(SFX_TUNING)) {
      if (t?.gain !== undefined) {
        expect(t.gain, id).toBeGreaterThan(0);
        expect(t.gain, id).toBeLessThanOrEqual(1);
      }
      if (t?.pitch !== undefined) expect(t.pitch, id).toBeLessThanOrEqual(0.06);
      if (t?.rate !== undefined) {
        expect(t.rate, id).toBeGreaterThanOrEqual(0.85);
        expect(t.rate, id).toBeLessThanOrEqual(1.2);
      }
    }
  });

  it('a drift is one of three steps around 1', () => {
    const seen = new Set([0, 0.4, 0.8].map((r) => sfxRateFor('battle_attack_slash', () => r).toFixed(2)));
    expect([...seen].sort()).toEqual(['0.96', '1.00', '1.04']);
    expect(sfxRateFor('battle_skill_slash', () => 0)).toBe(0.9);
    expect(sfxRateFor('battle_finisher_hit', () => 0)).toBe(1);
  });

  it('the long magic sounds ring only so long — and shorter at ×2', () => {
    expect(sfxRingMs('magic_cast', 1)).toBe(1300);
    expect(sfxRingMs('magic_cast', 2)).toBe(Math.round(1300 * SFX_FAST_RING));
    expect(sfxRingMs('battle_attack_slash', 2)).toBeNull();
    for (const id of ['magic_cast', 'battle_cutin', 'battle_charge_aura', 'battle_magic_thunder', 'battle_magic_dark'] as const)
      expect(sfxRingMs(id, 1), id).not.toBeNull();
  });

  it('the ordinary hit is the short thump; a boss’s fall the special move’s weight', () => {
    expect(sfxSourceOf('battle_hit')).toBe('battle_attack_strike');
    expect(sfxSourceOf('battle_boss_defeat')).toBe('battle_finisher_hit');
    expect(sfxSourceOf('battle_attack_slash')).toBe('battle_attack_slash');
  });

  it('a special move is the most present: its landing louder than an ordinary hit', () => {
    expect(SFX_TUNING.battle_finisher_hit!.gain!).toBeGreaterThan(SFX_TUNING.battle_hit!.gain!);
    expect(SFX_TUNING.battle_hit_heavy!.gain!).toBeGreaterThan(SFX_TUNING.battle_hit!.gain!);
    expect(SFX_TUNING.battle_hit!.gain!).toBeGreaterThan(SFX_TUNING.battle_hit_light!.gain!);
  });
});
