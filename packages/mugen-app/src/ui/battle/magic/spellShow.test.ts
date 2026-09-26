import { describe, expect, it } from 'vitest';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { castMagic, createBattle } from '@mugen/game/battle/battleLogic';
import { specOf } from '@mugen/game/battle/enemySpec';
import { MOSS_RABBIT } from '@mugen/content/enemies/species';
import { statsForLevels } from '@mugen/core/progression/levelStats';
import { BATTLE_SPEEDS } from '@mugen/game/battle/battleSpeed';
import { SPELL_FLOOR_MS, SPELL_MS, spellDamage, spellShowOf, spellStepMs } from './spellShow';
import { SPELL_CUT_INS, spellCutIn } from './spellCutIn';

const byId = (id: string) => MAGIC_DEFS.find((d) => d.id === id)!;
/** A fight she can cast in, with the dice fixed so the numbers repeat. */
const fight = (hp?: number) =>
  createBattle(specOf(MOSS_RABBIT), undefined, {
    stats: statsForLevels(1, 1),
    magicUnlocked: true,
    condition: hp ? { hp, mp: statsForLevels(1, 1).maxMp } : undefined,
  });
const dice = () => 0.5;

describe('how each of her spells is shown', () => {
  it('covers the five spells the game has — by their data, not their names', () => {
    expect(MAGIC_DEFS.map((d) => spellShowOf(d).kind)).toEqual([
      'BOLT',
      'COMET',
      'MEND',
      'WARD',
      'HAZE',
    ]);
  });

  it('lands the two that hurt and the haze on the creature, the others on the party', () => {
    expect(spellShowOf(byId('starlight_bolt'))).toMatchObject({ lands: 'enemy', hurts: true });
    expect(spellShowOf(byId('comet_strike'))).toMatchObject({ lands: 'enemy', hurts: true });
    expect(spellShowOf(byId('star_haze'))).toMatchObject({ lands: 'enemy', hurts: false });
    expect(spellShowOf(byId('mending_light'))).toMatchObject({ lands: 'party', hurts: false });
    expect(spellShowOf(byId('star_shield'))).toMatchObject({ lands: 'party', hurts: false });
  });

  it('holds the comet — her big one — as a finisher, the rest as ordinary skills', () => {
    expect(MAGIC_DEFS.map((d) => spellShowOf(d).tier)).toEqual([
      'SKILL',
      'FINISHER',
      'SKILL',
      'SKILL',
      'SKILL',
    ]);
  });

  it("puts the spell's own name and line on her cut-in", () => {
    for (const def of MAGIC_DEFS) {
      const cut = spellCutIn(def)!;
      expect(cut.name).toBe(def.name);
      expect(cut.sub).toBe(def.line);
      expect(cut.theme).toBe('chaos');
      expect(cut.tier).toBe(spellShowOf(def).tier);
    }
  });

  it('has a cut-in for exactly the five spells the game has — and none for any other', () => {
    expect(Object.keys(SPELL_CUT_INS).sort()).toEqual(MAGIC_DEFS.map((d) => d.id).sort());
    // A spell the table does not know is 未接続: no cut-in, nobody's picture borrowed.
    expect(
      spellCutIn({ ...byId('starlight_bolt'), id: 'not_a_spell_yet', name: '未定' }),
    ).toBeNull();
  });
});

describe('the one number a spell shows', () => {
  it('is exactly the health the core took off, for the two that hurt', () => {
    for (const id of ['starlight_bolt', 'comet_strike']) {
      const before = fight();
      const next = castMagic(before, byId(id), dice);
      const shown = spellDamage(before, next, spellShowOf(byId(id)));
      expect(shown).toBeGreaterThan(0);
      expect(shown).toBe(before.enemyHp - next.enemyHp);
    }
  });

  it('is nothing at all for the three that do not hurt — no made-up number', () => {
    for (const id of ['mending_light', 'star_shield', 'star_haze']) {
      const before = fight(40);
      const next = castMagic(before, byId(id), dice);
      expect(spellDamage(before, next, spellShowOf(byId(id)))).toBe(0);
      // And the core agrees nothing was struck.
      expect(next.enemyHp).toBe(before.enemyHp);
    }
  });
});

describe('the steps after her cut-in', () => {
  it('shorten at ×2 and never below their floors', () => {
    for (const step of ['CHANNEL', 'IMPACT'] as const) {
      expect(spellStepMs(step, 1)).toBe(SPELL_MS[step]);
      expect(spellStepMs(step, 2)).toBeLessThan(spellStepMs(step, 1));
      for (const speed of BATTLE_SPEEDS)
        expect(spellStepMs(step, speed)).toBeGreaterThanOrEqual(SPELL_FLOOR_MS[step]);
    }
  });
});
