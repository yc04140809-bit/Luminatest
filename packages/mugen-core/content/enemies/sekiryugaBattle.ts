// セキリュウガ — THE NUMBERS OF THE FIRST BOSS, and nothing else about it.
//
// WHO IT IS IS NOT HERE. セキリュウガ is FORGE's MON-000007, and FORGE
// keeps the original: its body, its kind, its element, its life. This
// file REFERS to it by id and holds only what a fight in this game needs
// — health, blows, moves, the lines said in the fight, how it goes down.
// Nothing is copied out of the FORGE record, nothing is imported from it
// and nothing is written into content/forge. When the official package is
// deployed, MON-000007 arrives through the ordinary FORGE route and this
// file goes on pointing at the same id.
//
// THE LINES DECIDE NOTHING ABOUT HOW IT LOOKS. No size, no colour, no
// build, no species: what is said is what it does (it lunges, it bites,
// it roars, the air grows hot, frost runs over the stone — the last two
// because FORGE's canon gives it fire and ice), never what it is shaped
// like. What it is protecting is not said, here or anywhere in this fight.
//
// IT IS NOT KILLED. At nought it stops — the battle's own "膝をついた" —
// and what follows is `SEKIRYUGA_AFTERMATH` (content/story/sekiryugaArc).
//
// THE NUMBERS, AND WHY (measured — see sekiryugaBattle.test.ts):
//
//   The swing is 8–12 at level one, +1 a level. Measured over 2000
//   seeded fights each: the moss rabbit (124 health) takes 12–13 turns at
//   level one to two, Gald (220) 21–23. The brief's "5–8 turns" would make
//   the first boss SHORTER than the forest's ordinary creature, which reads
//   as a let-down rather than a boss — so, as the brief allows when the
//   measured game says otherwise, the length is set between the two: 150
//   health, about fourteen turns at level two (12–13 at level three).
//
//   It hits harder than either (4–7, against their 2–5 and 3–5), with a
//   heavier bite and a roared blow worth bracing for. Attack-only at level
//   one it wins about one fight in four; at level two the player wins but
//   ends on about a quarter of their health. Bracing after the roar,
//   mending or a herb wins every time — which is the point of them. Its toughness (FORGE gives it a high defence aptitude) is
//   carried by health and footing — the battle has no defence number for
//   creatures, and the formula is not changed for it.

import type { EnemySpec } from '../../game/battle/battleLogic';
import { starAffinity } from '../../game/battle/damageType';

/** FORGE's id for セキリュウガ. A reference — the record itself stays in FORGE. */
export const SEKIRYUGA_CHARACTER_ID = 'MON-000007';
/** Its name, as FORGE canon gives it. */
export const SEKIRYUGA_NAME = 'セキリュウガ';

export const SEKIRYUGA_BATTLE: EnemySpec = {
  name: SEKIRYUGA_NAME,
  hp: 150,
  // 爪撃 — its ordinary blow.
  attackMin: 4,
  attackMax: 7,
  attackName: '爪撃',
  appearLine: `${SEKIRYUGA_NAME}が、低く身構えた。`,
  moves: {
    // 裂牙 — the harder one.
    heavy: { name: '裂牙', power: 1.6, chance: 0.25 },
    // 咆哮 → the next turn, the blow it roared for.
    charge: {
      name: '咆哮',
      line: `${SEKIRYUGA_NAME}の咆哮！ 遺跡の空気が震える……次の一撃が来る！`,
      chance: 0.3,
      cooldown: 3,
      firstAfter: 2,
      release: { name: '渾身の裂牙', power: 2.2 },
    },
  },
  /**
   * Footing: every eighth blow or so it is thrown off for a turn and
   * takes more. Something to aim at in a long fight; a roar it was
   * gathering waits until it has its feet again.
   */
  poise: {
    max: 8,
    perHit: 1,
    perGuardedHit: 1,
    staggerTurns: 1,
    staggerDamageTaken: 1.4,
    breakLine: `${SEKIRYUGA_NAME}の体勢が崩れた！`,
    recoverLine: `${SEKIRYUGA_NAME}は、ふたたび低く身構えた。`,
  },
  // Neither her star nor his sword is the answer: no weakness chart.
  affinity: starAffinity('NORMAL'),
  phases: [
    {
      id: 'HEAT',
      atOrBelow: 0.5,
      line: `${SEKIRYUGA_NAME}の息が熱を帯びた。足もとの石に、白い霜が走る。`,
      attack: 1.15,
      // Roars more often once it is hurt.
      skillChance: 0.4,
    },
  ],
};
