// A species' definition, as the numbers a battle fights with.
//
// One function, in one place, because there were two of it: the old
// battle screen and the prototype each kept their own copy, and the
// moment a species grew a field that only one of them copied, the same
// creature fought differently depending on which screen you met it on.

import type { EnemySpeciesDef } from '../../content/enemies/species';
import type { EnemySpec } from './battleLogic';

export function specOf(species: EnemySpeciesDef): EnemySpec {
  return {
    name: species.name,
    hp: species.hp,
    attackMin: species.attackMin,
    attackMax: species.attackMax,
    attackName: species.attackName,
    skill: species.skill,
    appearLine: species.appearLine,
    poise: species.poise,
    phases: species.phases,
    affinity: species.affinity,
  };
}
