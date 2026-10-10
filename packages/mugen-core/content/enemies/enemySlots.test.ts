import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ENEMY_SLOTS, affinityFieldsFor } from './enemySlots';
import { ENEMY_SPECIES, MOSS_RABBIT } from './species';

/** Three ordinary enemies to come (作者判断 2026-10-10): roles only — FORGE names them. */

describe('the three slots', () => {
  it('a guardian in the ruins, a shell and a swift one in the forest', () => {
    expect(ENEMY_SLOTS.map((s) => [s.slotId, s.habitat, s.from])).toEqual([
      ['RUINS_GUARDIAN', 'ANCIENT_RUINS', 'SETTLED'],
      ['FOREST_SHELL', 'GREENWOOD_FOREST', 'ALWAYS'],
      ['FOREST_SWIFT', 'GREENWOOD_FOREST', 'ALWAYS'],
    ]);
  });

  it('nothing named, nothing given an ID: those are FORGE’s', () => {
    for (const s of ENEMY_SLOTS) {
      expect(s.name).toBeNull();
      expect(s.forgeId).toBeNull();
    }
  });

  it('each role in the battle’s own terms', () => {
    const [guardian, shell, swift] = ENEMY_SLOTS;
    // A: high defence — resists both, hard footing, a told blow. Not alive: no four answers.
    expect(affinityFieldsFor(guardian)).toEqual(['physicalResistance', 'magicResistance']);
    expect([guardian.poise, guardian.tellsItsBlow, guardian.fourAnswers]).toEqual(['HIGHER', true, false]);
    // B: a shell — swords glance off, a spell goes in.
    expect(affinityFieldsFor(shell)).toEqual(['physicalResistance', 'magicWeakness']);
    // C: swift — less health; what it asks of the battle that the battle cannot do yet, said plainly.
    expect(swift.health).toBe('LOWER');
    expect(swift.needs).toEqual(['EVASION', 'SPEED', 'GROUP']);
    expect(guardian.needs).toEqual([]);
    expect(shell.needs).toEqual([]);
  });

  it('none is fought yet: no species stands in a slot (フウミミ MON-000002 and ヒョウレイ MON-000008 are FORGE’s own creatures, not the three)', () => {
    expect(Object.keys(ENEMY_SPECIES)).toEqual(['moss_rabbit', 'fuumimi', 'hyourei']);
    for (const s of ENEMY_SLOTS) {
      expect(Object.keys(ENEMY_SPECIES)).not.toContain(s.slotId.toLowerCase());
      expect(s.name).toBeNull();
    }
    expect(MOSS_RABBIT.speciesId).toBe('moss_rabbit');
  });

  it('nothing written into content/forge for them', () => {
    const forge = join(__dirname, '..', 'forge');
    const all = readdirSync(forge, { recursive: true })
      .map(String)
      .filter((f) => /\.(ts|json)$/.test(f))
      .map((f) => readFileSync(join(forge, f), 'utf8'))
      .join('\n');
    for (const s of ENEMY_SLOTS) expect(all).not.toContain(s.slotId);
  });
});
