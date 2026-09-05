import { describe, it, expect } from 'vitest';
import { artCoverage } from './artCoverage';
import { ENEMY_ART_STATES } from './enemyArt';
import { PARTY_ART_STATES } from './partyArt';

describe('art coverage', () => {
  const rows = artCoverage();
  const byId = Object.fromEntries(rows.map((r) => [r.id, r]));

  it('counts every state exactly once for every character', () => {
    for (const row of rows) {
      const all = row.side === 'ENEMY' ? ENEMY_ART_STATES : PARTY_ART_STATES;
      expect([...row.present, ...row.missing].sort()).toEqual([...all].sort());
    }
  });

  it('knows the moss rabbit has two of its ten pictures', () => {
    // This is the number a report quotes. If somebody draws one more,
    // this test is the thing that says the report is now out of date.
    expect(byId.moss_rabbit.present).toEqual(['front', 'down']);
    expect(byId.moss_rabbit.missing).toContain('attack');
    expect(byId.moss_rabbit.missing).toContain('damage');
  });

  it('knows the party is standing in exploration sprites', () => {
    expect(byId.hero.present).toContain('battle_idle');
    expect(byId.hero.missing).toContain('battle_attack');
    expect(byId.kaos.present).toContain('battle_idle');
    expect(byId.kaos.present).toContain('portrait');
  });

  it('has nobody with nothing at all', () => {
    // A character in the registry with no pictures would be a
    // placeholder on the battlefield; that must be a decision, not a
    // typo nobody noticed.
    for (const row of rows) expect(row.present.length).toBeGreaterThan(0);
  });
});
