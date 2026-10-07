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
//   The swing is 8–12 at level one, +1 a level, and from 2026-10-07 he
//   has 《瞬断》 (twice a swing, every third turn) from the start, which
//   makes every fight about a quarter shorter. Measured over 2000 seeded
//   fights each, using 《瞬断》 whenever it is ready: the moss rabbit (124
//   health) takes about 9 turns at level two, Gald (220) about 16. The
//   brief's "5–8 turns" would make the first boss shorter than the
//   forest's ordinary creature, which reads as a let-down — so, as the
//   brief allows when the measured game says otherwise, it sits between
//   the two: 170 health, about 12 turns at level two.
//
//   It hits harder than either (4–7, against their 2–5 and 3–5), with a
//   heavier bite, a roared blow worth bracing for, and once a fight its
//   《氷晶咆哮》. At level two the player who uses 《瞬断》 wins every time
//   on about a third of their health; one who never does loses about one
//   fight in five. Bracing after the roar, mending or a herb wins at level
//   one as well — which is the point of them. Its toughness (FORGE gives it a high defence aptitude) is
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
  hp: 170,
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
    // 《氷晶咆哮》 — its one great move: the first of its turns once it is
    // down to half, with its own cut-in on the App's screen. Reaches both.
    signature: {
      name: '氷晶咆哮',
      atOrBelow: 0.5,
      power: 1.8,
      line: '凍てつく咆哮が、二人をまとめて呑みこんだ。',
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
