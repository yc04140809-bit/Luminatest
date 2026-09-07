import { describe, it, expect } from 'vitest';
import {
  AWAKENING_RECORD,
  GUARD_MP_GAIN,
  PLAYER_MAX_MP,
  castMagic,
  clearAwakeningLines,
  createBattle,
  playerAttack,
  playerDefend,
  type BattleState,
  type EnemySpec,
} from './battleLogic';
import {
  COMET_STRIKE,
  MAGIC_DEFS,
  MENDING_LIGHT,
  STARLIGHT_BOLT,
  STAR_SHIELD,
} from '../../content/magic/magicDefs';
import { starAffinity, starAffinityOf, type StarAffinity } from './damageType';
import { GALD_BATTLE } from '../../content/enemies/galdBattle';
import { MOSS_RABBIT } from '../../content/enemies/species';
import { specOf } from './enemySpec';

import {
  AUTO_MEND_AT,
  AUTO_WARD_AT,
  decideTurn,
  magicBlocked,
  suggestAction,
  weighMagic,
} from './magicChoice';
import {
  availableMagic,
  canCast,
  harmsEnemy,
  isMending,
  isWarding,
  magicAvailable,
  type MagicDef,
} from '../../core/magic/magic';

const rngMid = () => 0.5;

const PLAIN: EnemySpec = { name: 'かかし', hp: 200, attackMin: 3, attackMax: 5 };

const AWAKENS: EnemySpec = {
  ...PLAIN,
  awakening: {
    afterTurns: 3,
    atOrBelowHp: 0.5,
    lines: [{ speaker: 'ケイオス', text: '……そこまで。' }],
  },
};

function unlocked(spec: EnemySpec = PLAIN): BattleState {
  return createBattle(spec, undefined, { magicUnlocked: true });
}

describe('one action a turn', () => {
  it('casting is the turn: the hero does not also swing', () => {
    // The rule the whole feature is built around. If this ever fails,
    // two characters have become one character with two attacks.
    const before = unlocked();
    const after = castMagic(before, STARLIGHT_BOLT, rngMid);
    const swung = playerAttack(before, rngMid);
    const magicDealt = before.enemyHp - after.enemyHp;
    const swingDealt = before.enemyHp - swung.enemyHp;
    // One lot of damage, not two, and not the sum of both.
    expect(magicDealt).toBeGreaterThan(0);
    expect(magicDealt).toBeLessThan(magicDealt + swingDealt);
    expect(magicDealt).toBeLessThanOrEqual(STARLIGHT_BOLT.power * 2);
  });

  it('the creature still gets its turn after a spell, exactly as after a blow', () => {
    const after = castMagic(unlocked(), STARLIGHT_BOLT, rngMid, 'ATTACK');
    expect(after.playerHp).toBeLessThan(after.playerMaxHp);
    expect(after.lastEnemyAction).toBe('ATTACK');
  });

  it('counts one turn taken, whichever of the three it was', () => {
    expect(playerAttack(unlocked(), rngMid).turnsTaken).toBe(1);
    expect(castMagic(unlocked(), STARLIGHT_BOLT, rngMid).turnsTaken).toBe(1);
    expect(playerDefend(unlocked(), rngMid).turnsTaken).toBe(1);
  });
});

describe('what a spell costs', () => {
  it('takes its price out of her power', () => {
    const after = castMagic(unlocked(), STARLIGHT_BOLT, rngMid);
    expect(after.playerMp).toBe(PLAYER_MAX_MP - STARLIGHT_BOLT.mpCost);
  });

  it('cannot be cast without the power for it, and changes nothing when tried', () => {
    const broke: BattleState = { ...unlocked(), playerMp: STARLIGHT_BOLT.mpCost - 1 };
    expect(castMagic(broke, STARLIGHT_BOLT, rngMid)).toBe(broke);
  });

  it('cannot be cast before she can do it at all', () => {
    const locked = createBattle(PLAIN);
    expect(locked.magicUnlocked).toBe(false);
    expect(castMagic(locked, STARLIGHT_BOLT, rngMid)).toBe(locked);
  });

  it('cannot reopen a fight that is over', () => {
    const won: BattleState = { ...unlocked(), outcome: 'VICTORY' };
    expect(castMagic(won, STARLIGHT_BOLT, rngMid)).toBe(won);
  });

  it('comes back only by bracing, and never over full', () => {
    const spent: BattleState = { ...unlocked(), playerMp: 2 };
    const braced = playerDefend(spent, rngMid);
    expect(braced.playerMp).toBe(2 + GUARD_MP_GAIN);
    const full = playerDefend(unlocked(), rngMid);
    expect(full.playerMp).toBe(PLAYER_MAX_MP);
    expect(full.log.some((l) => l.includes('MPが'))).toBe(false);
  });
});

describe('what a creature thinks of it', () => {
  const armoured: EnemySpec = {
    ...PLAIN,
    affinity: { physicalResistance: 0.5, magicWeakness: 0.5 },
  };

  it('lands harder on something soft against magic', () => {
    const plain = createBattle(PLAIN, undefined, { magicUnlocked: true });
    const soft = createBattle(armoured, undefined, { magicUnlocked: true });
    const dealtPlain = plain.enemyHp - castMagic(plain, STARLIGHT_BOLT, rngMid).enemyHp;
    const dealtSoft = soft.enemyHp - castMagic(soft, STARLIGHT_BOLT, rngMid).enemyHp;
    expect(dealtSoft).toBeGreaterThan(dealtPlain);
  });

  it('lands softer with a sword on something armoured', () => {
    const plain = createBattle(PLAIN, undefined, { magicUnlocked: true });
    const tough = createBattle(armoured, undefined, { magicUnlocked: true });
    const dealtPlain = plain.enemyHp - playerAttack(plain, rngMid).enemyHp;
    const dealtTough = tough.enemyHp - playerAttack(tough, rngMid).enemyHp;
    expect(dealtTough).toBeLessThan(dealtPlain);
  });

  it('says so in the log, so the player learns it by reading', () => {
    const soft = createBattle(armoured, undefined, { magicUnlocked: true });
    const after = castMagic(soft, STARLIGHT_BOLT, rngMid);
    expect(after.lastHitRead).toBe('WEAK');
    expect(after.log.join('')).toContain('効果は絶大');
  });

  it('says nothing extra about a creature with no opinion', () => {
    const after = castMagic(unlocked(), STARLIGHT_BOLT, rngMid);
    expect(after.lastHitRead).toBe('PLAIN');
    expect(after.log.join('')).not.toContain('効果は絶大');
    expect(after.log.join('')).not.toContain('手ごたえが薄い');
  });
});

describe('a raised guard', () => {
  const guarding: EnemySpec = {
    ...PLAIN,
    skill: {
      name: '受け流し',
      turns: 2,
      damageTaken: 0.45,
      chance: 0,
      cooldown: 3,
      maxUses: 3,
      line: '構えた。',
    },
    poise: {
      max: 4,
      perHit: 1,
      perGuardedHit: 2,
      staggerTurns: 2,
      staggerDamageTaken: 1.5,
      breakLine: '崩れた！',
      recoverLine: '構えなおした。',
    },
  };

  function withGuardUp(): BattleState {
    return {
      ...createBattle(guarding, undefined, { magicUnlocked: true }),
      enemyGuardTurns: 2,
    };
  }

  it('does not stop her star', () => {
    const up = withGuardUp();
    const cast = up.enemyHp - castMagic(up, STARLIGHT_BOLT, rngMid).enemyHp;
    const swing = up.enemyHp - playerAttack(up, rngMid).enemyHp;
    expect(cast).toBeGreaterThan(swing);
  });

  it('is broken by a blow and not by a spell — which is why both exist', () => {
    const up = withGuardUp();
    expect(playerAttack(up, rngMid).enemyPoise).toBeLessThan(up.enemyPoise);
    expect(castMagic(up, STARLIGHT_BOLT, rngMid).enemyPoise).toBe(up.enemyPoise);
  });
});

describe('the moment she reaches past what she was doing', () => {
  it('does not happen at the start of the fight', () => {
    const start = createBattle(AWAKENS);
    expect(start.magicUnlocked).toBe(false);
    expect(start.awakeningLines).toEqual([]);
  });

  it('happens once the fight has gone on long enough', () => {
    let state = createBattle(AWAKENS);
    for (let i = 0; i < 3; i++) state = playerDefend(state, rngMid);
    expect(state.magicUnlocked).toBe(true);
    expect(state.awakeningLines.length).toBeGreaterThan(0);
  });

  it('happens early if the fight is going fast instead', () => {
    // Hurt past the threshold in fewer turns than the count: it must not
    // wait, or a player who is winning finishes without ever seeing it.
    const hurt: BattleState = { ...createBattle(AWAKENS), enemyHp: 90, enemyMaxHp: 200 };
    const after = playerAttack(hurt, rngMid);
    expect(after.magicUnlocked).toBe(true);
  });

  it('does not spoil its own last line in the log behind it', () => {
    // The log sits behind the scene and is readable while it plays, so
    // anything written into it at the moment of the awakening is read
    // before the player has tapped through to it.
    let state = createBattle(AWAKENS);
    for (let i = 0; i < 3; i++) state = playerDefend(state, rngMid);
    expect(state.awakeningLines.length).toBeGreaterThan(0);
    expect(state.log.some((l) => l.includes('そこまで'))).toBe(false);
    expect(state.log.some((l) => l.includes(AWAKENING_RECORD))).toBe(false);
    // And afterwards, one line, so tapping through it fast does not
    // leave the player wondering what changed.
    state = clearAwakeningLines(state);
    expect(state.log.filter((l) => l === AWAKENING_RECORD)).toHaveLength(1);
  });

  it('happens exactly once, and cannot be made to happen twice', () => {
    let state = createBattle(AWAKENS);
    for (let i = 0; i < 3; i++) state = playerDefend(state, rngMid);
    state = clearAwakeningLines(state);
    const said = state.log.filter((l) => l === AWAKENING_RECORD).length;
    expect(said).toBe(1);
    for (let i = 0; i < 3; i++) state = playerDefend(state, rngMid);
    state = clearAwakeningLines(state);
    expect(state.log.filter((l) => l === AWAKENING_RECORD).length).toBe(said);
    expect(state.awakeningLines).toEqual([]);
  });

  it('never happens in a fight that does not carry it', () => {
    let state = createBattle(PLAIN);
    for (let i = 0; i < 20; i++) state = playerAttack(state, rngMid);
    expect(state.magicUnlocked).toBe(false);
  });

  it('is already done in a later fight, when the world says so', () => {
    expect(createBattle(PLAIN, undefined, { magicUnlocked: true }).magicUnlocked).toBe(true);
  });
});

describe('which spells she can reach', () => {
  const early: MagicDef = { ...STARLIGHT_BOLT, id: 'early', unlock: 'FROM_START' };
  const later: MagicDef = { ...STARLIGHT_BOLT, id: 'later', unlock: 'AWAKENING' };

  it('is a condition on the spell, not a list somewhere else', () => {
    expect(magicAvailable(early, { awakened: false })).toBe(true);
    expect(magicAvailable(later, { awakened: false })).toBe(false);
    expect(magicAvailable(later, { awakened: true })).toBe(true);
  });

  it('keeps a spell nobody has taught the rule about out of reach', () => {
    const strange = { ...STARLIGHT_BOLT, unlock: 'SOME_FUTURE_THING' } as unknown as MagicDef;
    expect(magicAvailable(strange, { awakened: true })).toBe(false);
  });

  it('lists them in the order they are written', () => {
    expect(availableMagic([early, later], { awakened: true }).map((m) => m.id)).toEqual([
      'early',
      'later',
    ]);
  });

  it('knows what she can pay for separately from what she has', () => {
    expect(canCast(STARLIGHT_BOLT, STARLIGHT_BOLT.mpCost)).toBe(true);
    expect(canCast(STARLIGHT_BOLT, STARLIGHT_BOLT.mpCost - 1)).toBe(false);
  });
});

describe('deciding without a person', () => {
  it('says why a spell cannot be pressed', () => {
    expect(magicBlocked(createBattle(PLAIN), STARLIGHT_BOLT)).toBe('LOCKED');
    expect(magicBlocked({ ...unlocked(), playerMp: 0 }, STARLIGHT_BOLT)).toBe('NO_MP');
    expect(magicBlocked({ ...unlocked(), outcome: 'VICTORY' }, STARLIGHT_BOLT)).toBe('OVER');
    expect(magicBlocked(unlocked(), STARLIGHT_BOLT)).toBeNull();
  });

  it('weighs the two by what they would actually do', () => {
    const armoured = createBattle(
      { ...PLAIN, affinity: { physicalResistance: 0.5, magicWeakness: 0.5 } },
      undefined,
      { magicUnlocked: true },
    );
    expect(weighMagic(armoured, STARLIGHT_BOLT).favoursMagic).toBe(true);
    expect(weighMagic(unlocked(), STARLIGHT_BOLT).favoursMagic).toBe(false);
  });

  it('does not cast every turn simply because it can', () => {
    // The design round's requirement for AUTO, in one line.
    expect(suggestAction(unlocked(), STARLIGHT_BOLT)).toBe('ATTACK');
  });

  it('casts when the creature minds it more', () => {
    const armoured = createBattle(
      { ...PLAIN, affinity: { physicalResistance: 0.6, magicWeakness: 0.6 } },
      undefined,
      { magicUnlocked: true },
    );
    expect(suggestAction(armoured, STARLIGHT_BOLT)).toBe('MAGIC');
  });

  it('takes the knockdown over the bigger number', () => {
    const armoured = createBattle(
      {
        ...PLAIN,
        affinity: { physicalResistance: 0.6, magicWeakness: 0.6 },
        poise: {
          max: 3,
          perHit: 1,
          perGuardedHit: 2,
          staggerTurns: 2,
          staggerDamageTaken: 1.5,
          breakLine: '崩れた！',
          recoverLine: '戻した。',
        },
      },
      undefined,
      { magicUnlocked: true },
    );
    const oneMore: BattleState = { ...armoured, enemyPoise: 1 };
    expect(suggestAction(oneMore, STARLIGHT_BOLT)).toBe('ATTACK');
  });

  it('keeps a reserve back when told to', () => {
    const armoured = createBattle(
      { ...PLAIN, affinity: { physicalResistance: 0.6, magicWeakness: 0.6 } },
      undefined,
      { magicUnlocked: true },
    );
    const nearlyOut: BattleState = { ...armoured, playerMp: STARLIGHT_BOLT.mpCost };
    expect(suggestAction(nearlyOut, STARLIGHT_BOLT, 6)).toBe('ATTACK');
  });

  it('covers when it is hurt and out of power', () => {
    const cornered: BattleState = { ...unlocked(), playerHp: 20, playerMp: 0 };
    expect(suggestAction(cornered, STARLIGHT_BOLT)).toBe('GUARD');
  });
});

describe('the light that mends', () => {
  const hurt = (hp: number): BattleState => ({ ...unlocked(), playerHp: hp });

  it('puts health back, and spends the power it cost', () => {
    const before = hurt(40);
    const after = castMagic(before, MENDING_LIGHT, rngMid);
    // The creature answers, so the health is what she gave less what it
    // took back — but she gave all of it.
    const dealt = before.playerHp + MENDING_LIGHT.power - after.playerHp;
    expect(dealt).toBeGreaterThanOrEqual(0);
    expect(after.playerHp).toBeGreaterThan(before.playerHp);
    expect(after.playerMp).toBe(before.playerMp - MENDING_LIGHT.mpCost);
  });

  it('is the turn: the hero does not also swing', () => {
    // The same rule the whole feature is built around, checked again on
    // the other kind of spell.
    const before = hurt(40);
    const after = castMagic(before, MENDING_LIGHT, rngMid);
    expect(after.enemyHp).toBe(before.enemyHp);
    expect(after.turnsTaken).toBe(before.turnsTaken + 1);
  });

  it('never puts back more than was lost', () => {
    const full = castMagic(unlocked(), MENDING_LIGHT, rngMid);
    expect(full.playerHp).toBeLessThanOrEqual(full.playerMaxHp);
    const barely = castMagic(hurt(99), MENDING_LIGHT, rngMid);
    expect(barely.playerHp).toBeLessThanOrEqual(barely.playerMaxHp);
  });

  it('says so when there was no room, rather than looking broken', () => {
    const after = castMagic(unlocked(), MENDING_LIGHT, rngMid);
    expect(after.log.some((l) => l.includes('もう満ちている'))).toBe(true);
    // And it still cost the turn and the power. A spell that quietly
    // refunds itself is a spell nobody can reason about.
    expect(after.playerMp).toBe(unlocked().playerMp - MENDING_LIGHT.mpCost);
  });

  it('hurts nobody and takes nobody\'s footing', () => {
    const before: BattleState = { ...hurt(40), enemyPoise: 3, enemyMaxPoise: 5 };
    const after = castMagic(before, MENDING_LIGHT, rngMid);
    expect(after.enemyHp).toBe(before.enemyHp);
    expect(after.enemyPoise).toBe(before.enemyPoise);
    expect(after.enemyStaggerTurns).toBe(before.enemyStaggerTurns);
  });

  it('cannot be cast without the power for it', () => {
    const broke: BattleState = { ...hurt(40), playerMp: MENDING_LIGHT.mpCost - 1 };
    expect(castMagic(broke, MENDING_LIGHT, rngMid)).toBe(broke);
    expect(magicBlocked(broke, MENDING_LIGHT)).toBe('NO_MP');
  });

  it('cannot be cast before she has reached past what she was doing', () => {
    const locked = createBattle(PLAIN);
    expect(castMagic(locked, MENDING_LIGHT, rngMid)).toBe(locked);
    expect(magicAvailable(MENDING_LIGHT, { awakened: false })).toBe(false);
  });

  it('costs more than bracing gathers, so mending is never free', () => {
    // The whole reason 《身構える》 is part of a plan now. If this ever
    // inverts, standing still and healing beats playing the fight.
    expect(MENDING_LIGHT.mpCost).toBeGreaterThan(GUARD_MP_GAIN);
  });

  it('arrives with the others, and all of them are hers', () => {
    expect(availableMagic(MAGIC_DEFS, { awakened: false })).toEqual([]);
    expect(availableMagic(MAGIC_DEFS, { awakened: true }).map((m) => m.id)).toEqual([
      'starlight_bolt',
      'comet_strike',
      'mending_light',
      'star_shield',
    ]);
  });

  it('is the one that mends, and the bolt is not', () => {
    expect(isMending(MENDING_LIGHT)).toBe(true);
    expect(isMending(STARLIGHT_BOLT)).toBe(false);
  });
});

describe('deciding without a person, about a spell that mends', () => {
  it('never reports healing as a small amount of damage', () => {
    const weigh = weighMagic(unlocked(), MENDING_LIGHT);
    expect(weigh.magicDamage).toBe(0);
    expect(weigh.favoursMagic).toBe(false);
    expect(weigh.swingWouldBreak).toBe(false);
  });

  it('declines to answer rather than guessing what health is worth', () => {
    // Handed only a mending spell, this one swings: it answers about
    // damage and healing is not damage. The question of what a health
    // bar is worth against a turn belongs to `decideTurn`, below, which
    // is handed the whole hand rather than one card.
    expect(suggestAction(unlocked(), MENDING_LIGHT)).toBe('ATTACK');
    expect(suggestAction({ ...unlocked(), playerHp: 10 }, MENDING_LIGHT)).toBe('ATTACK');
  });
});

describe('deciding the whole turn', () => {
  const ALL = MAGIC_DEFS;
  const hurt = (hp: number): BattleState => ({ ...unlocked(), playerHp: hp });
  const armoured = (): BattleState =>
    createBattle({ ...PLAIN, affinity: { physicalResistance: 0.6, magicWeakness: 0.6 } }, undefined, {
      magicUnlocked: true,
    });

  it('swings when there is nothing better to do', () => {
    expect(decideTurn(unlocked(), ALL)).toEqual({ action: 'ATTACK', magicId: null });
    expect(decideTurn(unlocked(), [])).toEqual({ action: 'ATTACK', magicId: null });
  });

  it('mends before the last moment, not on it', () => {
    // At the mending line exactly, and well above the desperate one.
    const plan = decideTurn(hurt(Math.floor(100 * AUTO_MEND_AT)), ALL);
    expect(plan).toEqual({ action: 'MAGIC', magicId: 'mending_light' });
  });

  it('does not mend health that is already there', () => {
    // A full bar is not hurt, whatever else is true. Mending it costs
    // the turn and does nothing, which is the one thing an unattended
    // player must never spend a turn on.
    expect(decideTurn(unlocked(), ALL).action).toBe('ATTACK');
  });

  it('does not mend what it cannot pay for', () => {
    const poor: BattleState = { ...hurt(20), playerMp: 4 };
    // Nothing to mend with and power still to gather: cover.
    expect(decideTurn(poor, ALL)).toEqual({ action: 'GUARD', magicId: null });
  });

  it('mends rather than covering when it can do both', () => {
    // Nearly gone AND able to mend. Mending is the better of the two:
    // bracing buys one softened blow, mending buys five.
    expect(decideTurn(hurt(15), ALL)).toEqual({ action: 'MAGIC', magicId: 'mending_light' });
  });

  it('casts at something that minds it, and names which spell', () => {
    expect(decideTurn(armoured(), ALL)).toEqual({ action: 'MAGIC', magicId: 'starlight_bolt' });
  });

  it('never names a spell it is not casting', () => {
    for (const state of [unlocked(), hurt(20), { ...hurt(20), playerMp: 0 }]) {
      const plan = decideTurn(state, ALL);
      if (plan.action !== 'MAGIC') expect(plan.magicId).toBeNull();
    }
  });

  it('keeps a reserve back from the spells that spend it', () => {
    const state = armoured();
    // Enough for the bolt, but not enough to leave the reserve behind.
    expect(decideTurn(state, ALL, { reserveMp: state.playerMp }).action).toBe('ATTACK');
  });

  it('will not act at all through a spell it cannot reach', () => {
    // Locked: she has not stepped forward yet, so nothing of hers is on
    // the table and the plan is the plan of somebody fighting alone.
    const locked = createBattle(PLAIN);
    expect(decideTurn({ ...locked, playerHp: 20 }, ALL).magicId).toBeNull();
  });
});

describe('the shield of stars', () => {
  const hurt = (hp: number): BattleState => ({ ...unlocked(), playerHp: hp });

  it('is its own kind of answer, and not either of the others', () => {
    expect(isWarding(STAR_SHIELD)).toBe(true);
    expect(isMending(STAR_SHIELD)).toBe(false);
    expect(harmsEnemy(STAR_SHIELD)).toBe(false);
    // And nobody else is a shield.
    expect(isWarding(STARLIGHT_BOLT)).toBe(false);
    expect(isWarding(MENDING_LIGHT)).toBe(false);
  });

  it('puts something up, and spends the power it cost', () => {
    const before = unlocked();
    const after = castMagic(before, STAR_SHIELD, rngMid);
    expect(after.playerMp).toBe(before.playerMp - STAR_SHIELD.mpCost);
    // The creature's answer this turn is the first blow it was bought
    // for, so one of them has already been spent.
    expect(after.wardTurns).toBeGreaterThan(0);
    expect(after.wardTurns).toBeLessThan(STAR_SHIELD.ward!.blows);
  });

  it('is the turn: the hero does not also swing', () => {
    const before = unlocked();
    const after = castMagic(before, STAR_SHIELD, rngMid);
    expect(after.enemyHp).toBe(before.enemyHp);
    expect(after.turnsTaken).toBe(before.turnsTaken + 1);
  });

  it('softens without ever stopping a blow', () => {
    // Not a wall. A blow always lands for something, which is the rule
    // the whole ward is written around.
    const hard: EnemySpec = { ...PLAIN, attackMin: 20, attackMax: 20 };
    const bare = castMagic(createBattle(hard, undefined, { magicUnlocked: true }), STARLIGHT_BOLT, rngMid);
    const shielded = castMagic(createBattle(hard, undefined, { magicUnlocked: true }), STAR_SHIELD, rngMid);
    const bareTook = bare.playerMaxHp - bare.playerHp;
    const shieldedTook = shielded.playerMaxHp - shielded.playerHp;
    expect(shieldedTook).toBeLessThan(bareTook);
    expect(shieldedTook).toBeGreaterThan(0);
  });

  it('lasts the blows it was bought for, and then goes', () => {
    const hard: EnemySpec = { ...PLAIN, attackMin: 20, attackMax: 20 };
    let state = castMagic(createBattle(hard, undefined, { magicUnlocked: true }), STAR_SHIELD, rngMid);
    const blows = STAR_SHIELD.ward!.blows;
    // One was spent by the answer to the cast itself.
    for (let i = 1; i < blows; i += 1) {
      expect(state.wardTurns, `after ${i} blows`).toBeGreaterThan(0);
      state = playerAttack(state, rngMid, 'ATTACK');
    }
    expect(state.wardTurns).toBe(0);
    expect(state.wardCut).toBe(0);
    expect(state.log.some((l) => l.includes('《星盾》が、そっと解けた。'))).toBe(true);
  });

  it('says so once, when it goes — not on every blow it softens', () => {
    const hard: EnemySpec = { ...PLAIN, attackMin: 20, attackMax: 20 };
    let state = castMagic(createBattle(hard, undefined, { magicUnlocked: true }), STAR_SHIELD, rngMid);
    for (let i = 1; i < STAR_SHIELD.ward!.blows; i += 1) state = playerAttack(state, rngMid, 'ATTACK');
    expect(state.log.filter((l) => l.includes('そっと解けた')).length).toBe(1);
  });

  it('cannot be cast without the power for it', () => {
    const broke: BattleState = { ...unlocked(), playerMp: STAR_SHIELD.mpCost - 1 };
    expect(castMagic(broke, STAR_SHIELD, rngMid)).toBe(broke);
    expect(magicBlocked(broke, STAR_SHIELD)).toBe('NO_MP');
  });

  it('cannot be cast before she has reached past what she was doing', () => {
    const locked = createBattle(PLAIN);
    expect(castMagic(locked, STAR_SHIELD, rngMid)).toBe(locked);
    expect(magicAvailable(STAR_SHIELD, { awakened: false })).toBe(false);
  });

  it('asks the battle for a ward rather than telling it', () => {
    // Content may write any number it likes; the battle decides.
    const greedy: MagicDef = { ...STAR_SHIELD, ward: { cut: 5, blows: 2 } };
    const after = castMagic(hurt(90), greedy, rngMid);
    expect(after.wardCut).toBeLessThanOrEqual(0.35);
  });

  it('stacks with bracing rather than replacing it', () => {
    // Two turns and the power is the most that can be put in front of
    // one swing. If these ever stop stacking, one of them has quietly
    // been made pointless.
    const hard: EnemySpec = { ...PLAIN, attackMin: 20, attackMax: 20 };
    const shielded = castMagic(createBattle(hard, undefined, { magicUnlocked: true }), STAR_SHIELD, rngMid);
    const braced = playerDefend(shielded, rngMid, 'ATTACK');
    const plain = playerDefend(
      createBattle(hard, undefined, { magicUnlocked: true }),
      rngMid,
      'ATTACK',
    );
    const withBoth = braced.playerHp - shielded.playerHp;
    const withGuardOnly = plain.playerHp - plain.playerMaxHp;
    expect(Math.abs(withBoth)).toBeLessThan(Math.abs(withGuardOnly));
  });
});

describe('deciding the whole turn, with a shield in hand', () => {
  const ALL = MAGIC_DEFS;
  const hurt = (hp: number): BattleState => ({ ...unlocked(), playerHp: hp });

  it('does not shield a fight that has not started hurting', () => {
    expect(decideTurn(unlocked(), ALL).action).toBe('ATTACK');
  });

  it('puts one up once blows have started landing', () => {
    const plan = decideTurn(hurt(Math.floor(100 * AUTO_WARD_AT)), ALL);
    expect(plan).toEqual({ action: 'MAGIC', magicId: 'star_shield' });
  });

  it('never puts a second one over the first', () => {
    // A shield on a shield buys nothing and costs a turn.
    const already: BattleState = { ...hurt(70), wardCut: 0.35, wardTurns: 3, wardName: '星盾' };
    expect(decideTurn(already, ALL).magicId).not.toBe('star_shield');
  });

  it('mends before it shields, when it is hurt enough for both', () => {
    // Health first: a shield does nothing for damage already taken.
    expect(decideTurn(hurt(20), ALL)).toEqual({ action: 'MAGIC', magicId: 'mending_light' });
  });

  it('does not shield what it cannot pay for', () => {
    const poor: BattleState = { ...hurt(70), playerMp: 2 };
    expect(decideTurn(poor, ALL).action).toBe('ATTACK');
  });
});

describe('what the creature in front of you thinks of her light', () => {
  /**
   * Fixtures, not fabrications.
   *
   * Neither creature in the game has an opinion about the star, and
   * giving one of them a weakness so that this file has something to
   * measure would be inventing a fact about them to suit a test. These
   * three are scarecrows: the same numbers three times, differing only
   * in the one thing being measured.
   */
  const scarecrow = (kind: StarAffinity): BattleState =>
    createBattle({ ...PLAIN, affinity: starAffinity(kind) }, undefined, { magicUnlocked: true });

  const dealtBy = (kind: StarAffinity): number => {
    const before = scarecrow(kind);
    return before.enemyHp - castMagic(before, STARLIGHT_BOLT, rngMid).enemyHp;
  };

  it('takes more from the star when it is soft to it', () => {
    expect(dealtBy('WEAK')).toBeGreaterThan(dealtBy('NORMAL'));
  });

  it('takes exactly what it always did when it has no opinion', () => {
    // The bolt is nine, and against something with nothing to say
    // about it that is what it has always been.
    expect(dealtBy('NORMAL')).toBe(STARLIGHT_BOLT.power);
  });

  it('takes less from the star when it shrugs it off', () => {
    expect(dealtBy('RESIST')).toBeLessThan(dealtBy('NORMAL'));
  });

  it('says so in the log, so the choice reads as a choice', () => {
    const weak = castMagic(scarecrow('WEAK'), STARLIGHT_BOLT, rngMid);
    expect(weak.log.some((l) => l.includes('効果は絶大だ'))).toBe(true);
    const tough = castMagic(scarecrow('RESIST'), STARLIGHT_BOLT, rngMid);
    expect(tough.log.some((l) => l.includes('手ごたえが薄い'))).toBe(true);
    const plain = castMagic(scarecrow('NORMAL'), STARLIGHT_BOLT, rngMid);
    expect(plain.log.some((l) => l.includes('効果は絶大だ') || l.includes('手ごたえが薄い'))).toBe(
      false,
    );
  });

  it('changes nothing about a sword', () => {
    // The point of the whole feature: the star is the thing that has
    // become a choice, so the blade must be untouched by it.
    const swing = (kind: StarAffinity) => {
      const before = scarecrow(kind);
      return before.enemyHp - playerAttack(before, rngMid, 'ATTACK').enemyHp;
    };
    expect(swing('WEAK')).toBe(swing('NORMAL'));
    expect(swing('RESIST')).toBe(swing('NORMAL'));
  });

  it('changes nothing about the two spells that strike nobody', () => {
    for (const kind of ['WEAK', 'NORMAL', 'RESIST'] as const) {
      const hurt: BattleState = { ...scarecrow(kind), playerHp: 50 };
      const mended = castMagic(hurt, MENDING_LIGHT, rngMid);
      expect(mended.enemyHp, kind).toBe(hurt.enemyHp);
      const shielded = castMagic(scarecrow(kind), STAR_SHIELD, rngMid);
      expect(shielded.wardCut, kind).toBeGreaterThan(0);
    }
  });

  it('is what AUTO already weighs, without being taught anything', () => {
    // weighMagic has multiplied by the affinity since it was written.
    expect(weighMagic(scarecrow('WEAK'), STARLIGHT_BOLT).magicDamage).toBeGreaterThan(
      weighMagic(scarecrow('NORMAL'), STARLIGHT_BOLT).magicDamage,
    );
    expect(weighMagic(scarecrow('RESIST'), STARLIGHT_BOLT).magicDamage).toBeLessThan(
      weighMagic(scarecrow('NORMAL'), STARLIGHT_BOLT).magicDamage,
    );
  });

  it('makes AUTO reach for the star at something soft to it', () => {
    expect(decideTurn(scarecrow('WEAK'), MAGIC_DEFS)).toEqual({
      action: 'MAGIC',
      magicId: 'starlight_bolt',
    });
  });

  it('and swing at something that shrugs it off', () => {
    expect(decideTurn(scarecrow('RESIST'), MAGIC_DEFS).action).toBe('ATTACK');
    expect(decideTurn(scarecrow('NORMAL'), MAGIC_DEFS).action).toBe('ATTACK');
  });
});

describe('the two creatures that exist', () => {
  const rabbit = () => createBattle(specOf(MOSS_RABBIT), undefined, { magicUnlocked: true });
  // His fight is the one that CARRIES the awakening, so it starts with
  // her locked whatever the option says. Unlocked by hand here, because
  // what is being measured is what the star does to him, not when he
  // lets her have it.
  const gald = (): BattleState => ({ ...createBattle(GALD_BATTLE), magicUnlocked: true });

  it('the animal is soft to her light and the man is not', () => {
    // Written down so that changing either is a deliberate act with a
    // failing test in front of it, rather than something that happens
    // to a data file.
    expect(starAffinityOf(MOSS_RABBIT.affinity)).toBe('WEAK');
    expect(starAffinityOf(GALD_BATTLE.affinity)).toBe('NORMAL');
  });

  it('so the star does more to it than it does to him', () => {
    // The first fight in the game where the choice of who acts is
    // decided by what is standing there.
    const onRabbit = rabbit().enemyHp - castMagic(rabbit(), STARLIGHT_BOLT, rngMid).enemyHp;
    const onGald = gald().enemyHp - castMagic(gald(), STARLIGHT_BOLT, rngMid).enemyHp;
    expect(onRabbit).toBeGreaterThan(onGald);
    // Half again, and he takes exactly what he always did.
    expect(onGald).toBe(STARLIGHT_BOLT.power);
    expect(onRabbit).toBe(Math.round(STARLIGHT_BOLT.power * 1.5));
  });

  it('and the blade is the same blade to both of them', () => {
    // The constant everything else is judged against. If this ever
    // moves, the weakness has stopped being about her.
    const swing = (make: () => BattleState) =>
      make().enemyHp - playerAttack(make(), rngMid, 'ATTACK').enemyHp;
    expect(swing(rabbit)).toBe(swing(gald));
  });

  it('tells the player, in the line it already had', () => {
    const hit = castMagic(rabbit(), STARLIGHT_BOLT, rngMid);
    expect(hit.log.some((l) => l.includes('効果は絶大だ'))).toBe(true);
    expect(hit.lastHitRead).toBe('WEAK');
    // And says nothing of the sort about him.
    const onGald = castMagic(gald(), STARLIGHT_BOLT, rngMid);
    expect(onGald.log.some((l) => l.includes('効果は絶大だ'))).toBe(false);
  });

  it('is not a free fight: the blade is still worth swinging', () => {
    // Half again on nine is thirteen or fourteen; a swing is eight to
    // twelve and costs nothing. If the star ever beats the blade on
    // average AND costs nothing, she has replaced him.
    const starred = Math.round(STARLIGHT_BOLT.power * 1.5);
    expect(starred).toBeLessThan(20);
    expect(STARLIGHT_BOLT.mpCost).toBeGreaterThan(0);
  });

  it('makes AUTO reach for her against the animal, and swing at the man', () => {
    expect(decideTurn(rabbit(), MAGIC_DEFS)).toEqual({
      action: 'MAGIC',
      magicId: 'starlight_bolt',
    });
    expect(decideTurn(gald(), MAGIC_DEFS).action).toBe('ATTACK');
  });

  it('leaves the two spells that strike nobody exactly as they were', () => {
    const hurt: BattleState = { ...rabbit(), playerHp: 50 };
    expect(castMagic(hurt, MENDING_LIGHT, rngMid).enemyHp).toBe(hurt.enemyHp);
    const shielded = castMagic(rabbit(), STAR_SHIELD, rngMid);
    expect(shielded.wardCut).toBeGreaterThan(0);
    expect(shielded.enemyHp).toBe(rabbit().enemyHp);
  });
});

describe('the comet', () => {
  const scarecrow = (hp = 200): BattleState => ({
    ...createBattle({ ...PLAIN, hp }, undefined, { magicUnlocked: true }),
  });

  it('is the other side of the bolt, not a bigger one', () => {
    // The whole reason both exist. If these ever agree, one of them
    // has become an upgrade of the other and the choice is gone.
    expect(COMET_STRIKE.power).toBeGreaterThan(STARLIGHT_BOLT.power);
    expect(COMET_STRIKE.mpCost).toBeGreaterThan(STARLIGHT_BOLT.mpCost);
    expect(COMET_STRIKE.blockedByGuard).toBe(true);
    expect(STARLIGHT_BOLT.blockedByGuard).toBe(false);
  });

  it('costs power the bolt does not, for damage the bolt cannot', () => {
    const before = scarecrow();
    const comet = castMagic(before, COMET_STRIKE, rngMid);
    const bolt = castMagic(before, STARLIGHT_BOLT, rngMid);
    expect(before.enemyHp - comet.enemyHp).toBe(COMET_STRIKE.power);
    expect(before.enemyHp - comet.enemyHp).toBeGreaterThan(before.enemyHp - bolt.enemyHp);
    expect(comet.playerMp).toBe(before.playerMp - COMET_STRIKE.mpCost);
  });

  it('is worse power for power than the bolt, which is why the bolt stays', () => {
    const perPower = (m: typeof COMET_STRIKE) => m.power / m.mpCost;
    expect(perPower(COMET_STRIKE)).toBeLessThan(perPower(STARLIGHT_BOLT));
  });

  it('does not replace the blade: her power runs out and it does not', () => {
    // Three of them and she is empty. A swing is eight to twelve for
    // nothing, every turn, forever.
    const casts = Math.floor(PLAYER_MAX_MP / COMET_STRIKE.mpCost);
    expect(casts).toBeLessThanOrEqual(3);
    expect(COMET_STRIKE.power).toBeLessThan(24);
  });

  it('takes nobody off their feet, however big it is', () => {
    const footed: BattleState = { ...scarecrow(), enemyPoise: 3, enemyMaxPoise: 5 };
    const after = castMagic(footed, COMET_STRIKE, rngMid);
    expect(after.enemyPoise).toBe(footed.enemyPoise);
  });

  it('is blunted by a raised guard, where the bolt is not', () => {
    const skill = {
      name: '身がまえ',
      damageTaken: 0.5,
      turns: 2,
      cooldown: 2,
      chance: 1,
      maxUses: 3,
      line: '身がまえた。',
    };
    const covered: BattleState = {
      ...createBattle({ ...PLAIN, skill }, undefined, { magicUnlocked: true }),
      enemyGuardTurns: 2,
    };
    const comet = covered.enemyHp - castMagic(covered, COMET_STRIKE, rngMid).enemyHp;
    const bolt = covered.enemyHp - castMagic(covered, STARLIGHT_BOLT, rngMid).enemyHp;
    expect(comet).toBe(Math.round(COMET_STRIKE.power * 0.5));
    expect(bolt).toBe(STARLIGHT_BOLT.power);
  });

  it('takes the star weakness like anything else of hers', () => {
    const soft = createBattle({ ...PLAIN, affinity: starAffinity('WEAK') }, undefined, {
      magicUnlocked: true,
    });
    const dealt = soft.enemyHp - castMagic(soft, COMET_STRIKE, rngMid).enemyHp;
    expect(dealt).toBe(Math.round(COMET_STRIKE.power * 1.5));
  });

  it('cannot be cast without the power for it', () => {
    const broke: BattleState = { ...scarecrow(), playerMp: COMET_STRIKE.mpCost - 1 };
    expect(castMagic(broke, COMET_STRIKE, rngMid)).toBe(broke);
    expect(magicBlocked(broke, COMET_STRIKE)).toBe('NO_MP');
  });
});

describe('AUTO, given two ways to hurt something', () => {
  const soft = (hp: number): BattleState =>
    createBattle({ ...PLAIN, hp, affinity: starAffinity('WEAK') }, undefined, {
      magicUnlocked: true,
    });

  it('does not hold the big one down: the cheap one is what it keeps doing', () => {
    // The requirement in one test. A long fight against something soft
    // to her light is fought on bolts, because her power runs out.
    const plan = decideTurn(soft(300), MAGIC_DEFS);
    expect(plan).toEqual({ action: 'MAGIC', magicId: 'starlight_bolt' });
  });

  it('spends the big one to end a fight the cheap one cannot', () => {
    // Comet is twenty, half again is thirty; the bolt is nine, half
    // again is fourteen. Between those two numbers is the window the
    // comet exists for.
    const plan = decideTurn(soft(25), MAGIC_DEFS);
    expect(plan).toEqual({ action: 'MAGIC', magicId: 'comet_strike' });
  });

  it('does not spend the big one where the cheap one already finishes', () => {
    const plan = decideTurn(soft(10), MAGIC_DEFS);
    expect(plan).toEqual({ action: 'MAGIC', magicId: 'starlight_bolt' });
  });

  it('never casts what it cannot pay for', () => {
    const low: BattleState = { ...soft(25), playerMp: COMET_STRIKE.mpCost - 1 };
    expect(decideTurn(low, MAGIC_DEFS).magicId).not.toBe('comet_strike');
  });

  it('runs a whole fight without emptying her on comets', () => {
    // Played out rather than reasoned about: AUTO fights a soft
    // creature to the end and must not be dry before it is over.
    let state = soft(160);
    let comets = 0;
    for (let turn = 0; turn < 60 && state.outcome === 'ONGOING'; turn += 1) {
      const plan = decideTurn(state, MAGIC_DEFS);
      if (plan.action === 'MAGIC' && plan.magicId) {
        const spell = MAGIC_DEFS.find((m) => m.id === plan.magicId)!;
        if (spell.id === 'comet_strike') comets += 1;
        state = castMagic(state, spell, rngMid);
      } else if (plan.action === 'GUARD') {
        state = playerDefend(state, rngMid);
      } else {
        state = playerAttack(state, rngMid);
      }
    }
    expect(state.outcome).toBe('VICTORY');
    // It reached for it, and it did not lean on it.
    expect(comets).toBeLessThanOrEqual(2);
  });
});
