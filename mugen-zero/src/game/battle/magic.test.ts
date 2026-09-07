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
import { MAGIC_DEFS, MENDING_LIGHT, STARLIGHT_BOLT } from '../../content/magic/magicDefs';
import {
  AUTO_MEND_AT,
  decideTurn,
  magicBlocked,
  suggestAction,
  weighMagic,
} from './magicChoice';
import {
  availableMagic,
  canCast,
  isMending,
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

  it('arrives with the bolt, and both are hers', () => {
    expect(availableMagic(MAGIC_DEFS, { awakened: false })).toEqual([]);
    expect(availableMagic(MAGIC_DEFS, { awakened: true }).map((m) => m.id)).toEqual([
      'starlight_bolt',
      'mending_light',
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
