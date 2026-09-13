import { describe, expect, it } from 'vitest';
import { creatureOpponent, personOpponent } from './opponent';
import { galdOpponent } from './galdOpponent';
import { MOSS_RABBIT } from '../../content/enemies/species';
import { GALD_BATTLE } from '../../content/enemies/galdBattle';
import { GALD_DEFEATED_LINES } from '../../content/dialogue/galdEncounter';

/**
 * WHO THE FIGHT IS WITH.
 *
 * The screen takes a `BattleOpponent`, and the whole reason that type
 * exists is that the fight this slice is built to arrive at is against
 * a MAN. Everything here is protecting the difference between a person
 * and a species — because the failure mode is not a crash, it is Gald
 * quietly becoming a kind of animal in order to stand on a battlefield.
 */
describe('a creature, as an opponent', () => {
  it('is the species, with the species’ own numbers and words', () => {
    const o = creatureOpponent(MOSS_RABBIT);
    expect(o.artId).toBe(MOSS_RABBIT.speciesId);
    expect(o.name).toBe(MOSS_RABBIT.name);
    expect(o.defeatedText).toBe(MOSS_RABBIT.defeatedText);
  });

  it('stands across the clearing, because it is a small animal', () => {
    expect(creatureOpponent(MOSS_RABBIT).stands).toBe('FAR');
  });

  /**
   * NARRATED, NOT QUOTED. 「モスラビットは草むらに倒れ込んだ。」 is the
   * fight telling the player what happened. Give it a speaker and the
   * screen puts quotation marks round an animal.
   */
  it('is narrated when it goes down, not quoted', () => {
    expect(creatureOpponent(MOSS_RABBIT).defeatedSpeaker).toBeNull();
  });

  it('calls the lying-down picture by the bestiary’s name for it', () => {
    const o = creatureOpponent(MOSS_RABBIT);
    expect(o.downPose).toBe('down');
    // And the two agree, which is the whole use of the field: the
    // screen compares the pose it GOT with this to find out whether a
    // down picture exists at all.
    expect(o.artFor('down').state).toBe(o.downPose);
  });
});

describe('a person, as an opponent', () => {
  const someone = () =>
    personOpponent({
      artId: 'gald',
      name: '盗賊 ガルド',
      defeatedText: '……くそ……。',
      spec: GALD_BATTLE,
    });

  it('is fought at arm’s length rather than across a clearing', () => {
    // A ground line measured for something sixty pixels tall puts a
    // person's head through the panel above them.
    expect(someone().stands).toBe('NEAR');
  });

  it('speaks for himself when he goes down, under his own name', () => {
    expect(someone().defeatedSpeaker).toBe('盗賊 ガルド');
  });

  it('takes his drawings from the party registry, where a person’s live', () => {
    // He is somebody the player meets long before and long after he is
    // somebody they fight, so his art is not in the bestiary.
    expect(someone().artFor('front').state).toBe('battle_idle');
    expect(someone().artFor('down').state).toBe('battle_down');
  });

  it('falls back to standing for a pose nobody has drawn him in', () => {
    expect(someone().artFor('flee' as never).state).toBe('battle_idle');
  });

  /**
   * THE BUG THIS FIELD EXISTS FOR.
   *
   * The battle screen asks "is the picture I got the lying-down one?"
   * and it used to answer by comparing against the string 'down' — a
   * CREATURE's word. A person's registry calls it 'battle_down', so a
   * person was never once seen to be lying down: Gald was drawn on his
   * face while the screen went on believing he was standing, and the
   * four answers were asked over a man it thought was on his feet.
   */
  it('calls the lying-down picture by the PARTY registry’s name for it', () => {
    const o = someone();
    expect(o.downPose).toBe('battle_down');
    expect(o.downPose).not.toBe('down');
    expect(o.artFor('down').state).toBe(o.downPose);
  });
});

/**
 * ONE GALD.
 *
 * Two doors lead into this fight — the story's, on the forest path, and
 * the DEV ADMIN preview — and a man who is 盗賊 ガルド through one of
 * them and something slightly different through the other is not a man
 * being tested.
 */
describe('the story’s own opponent', () => {
  it('is him, with his numbers', () => {
    const g = galdOpponent();
    expect(g.artId).toBe('gald');
    expect(g.name).toBe(GALD_BATTLE.name);
    expect(g.spec).toBe(GALD_BATTLE);
  });

  it('says the line content wrote for him, not one written about him', () => {
    expect(galdOpponent().defeatedText).toBe(GALD_DEFEATED_LINES[0].text);
    expect(galdOpponent().defeatedSpeaker).toBe(GALD_BATTLE.name);
  });

  /**
   * His fight is the one that carries her awakening, and it rides on
   * the spec. Hand the screen an opponent whose spec has lost it and
   * Kaos never steps forward in the only fight she steps forward in.
   */
  it('carries the awakening beat the whole slice turns on', () => {
    expect(galdOpponent().spec.awakening).toBeTruthy();
  });

  it('is a fresh object each time, so neither door can edit the other’s', () => {
    const a = galdOpponent();
    const b = galdOpponent();
    expect(a).not.toBe(b);
    // The same man, field for field. Not `toEqual` on the whole object:
    // `artFor` is a closure and a new one is not equal to the last, so
    // that would compare identity while claiming to compare content.
    expect({ ...a, artFor: null }).toEqual({ ...b, artFor: null });
  });
});
