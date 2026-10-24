// What Kaos actually does, and what she says while doing it.
//
// Four, and deliberately small ones. She is not a second party member
// with a turn — she is someone standing behind him who occasionally
// tips the odds and makes a remark about it. The lines carry that: she
// helps, and she is not sentimental about helping.
//
// Content only. The engine that picks between these knows none of it.

import {
  CHAOS_INTERVENTION_CONFIG,
  type ChaosInterventionDef,
} from '../../core/chaos/chaosIntervention';

const BLESSING: ChaosInterventionDef = {
  id: 'CHAOS_BLESSING',
  category: 'BUFF',
  name: 'ケイオスの加護',
  line: 'ちょっとだけ、手伝ってあげる。',
  effect: '攻撃力アップ',
  target: 'PLAYER',
  modifiers: { playerAttack: CHAOS_INTERVENTION_CONFIG.playerAttackUp },
};

const GUARD: ChaosInterventionDef = {
  id: 'CHAOS_GUARD',
  category: 'BUFF',
  name: 'ケイオスの守護',
  line: '少しくらい、守ってあげる。',
  effect: '受けるダメージ軽減',
  target: 'PLAYER',
  modifiers: { playerDamageTaken: CHAOS_INTERVENTION_CONFIG.playerDamageTakenDown },
};

const WEAKEN: ChaosInterventionDef = {
  id: 'CHAOS_WEAKEN',
  category: 'DEBUFF',
  name: 'ケイオスの弱体',
  line: 'この子、ちょっと弱くしよっか。',
  effect: '敵の攻撃力ダウン',
  target: 'ENEMY',
  modifiers: { enemyAttack: CHAOS_INTERVENTION_CONFIG.enemyAttackDown },
};

const BREAK: ChaosInterventionDef = {
  id: 'CHAOS_BREAK',
  category: 'DEBUFF',
  name: 'ケイオスの崩し',
  line: 'そこ、隙だらけだよ。',
  effect: '敵の防御力ダウン',
  target: 'ENEMY',
  modifiers: { enemyDamageTaken: CHAOS_INTERVENTION_CONFIG.enemyDamageTakenUp },
};

/**
 * Everything she can do today.
 *
 * When ARCANA arrives it is another entry with category 'ARCANA' — the
 * roll, the modifiers and the battle need no change to reach it.
 */
export const CHAOS_INTERVENTIONS: readonly ChaosInterventionDef[] = [
  BLESSING,
  GUARD,
  WEAKEN,
  BREAK,
];
