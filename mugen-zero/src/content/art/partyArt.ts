// PARTY ART — the same door, for the player's side.
//
// The two of them are drawn today as exploration sprites: a walking
// sheet, one view per direction. That is what a battlefield has to use
// until battle poses are drawn, so the left-facing standing frame is
// registered as battle_idle and everything else falls back to it.
//
// Registering them here rather than reaching into the exploration sheet
// from the battle screen is the whole point: when a real battle pose
// arrives it lands in this file, and the battle screen does not change.

import { EXPLORATION_SPRITES } from '../characters/explorationSprites';
import { GALD_PORTRAITS, GALD_BATTLE_DOWN, KAOS_PORTRAITS } from '../../assets/manifest';
import type { PartyArtRegistry, PartyArtSet } from '../../core/art/artRegistry';
import type { PartyArtState } from '../../core/art/artStates';

export const PARTY_ART_STATES: readonly PartyArtState[] = [
  'battle_idle',
  'battle_attack',
  'battle_damage',
  'battle_skill_1',
  'battle_skill_2',
  'battle_down',
  'talk',
  'portrait',
  'fullbody',
  'cutin',
  'sheet',
];

const HERO_LEFT = EXPLORATION_SPRITES.HERO.frames.left.idle;
const KAOS_LEFT = EXPLORATION_SPRITES.KAOS.frames.left.idle;

export const HERO_ART: PartyArtSet = {
  id: 'hero',
  label: 'あなた',
  states: {
    // Measured from the file: the box the drawing occupies inside it.
    battle_idle: {
      src: HERO_LEFT.url,
      box: { fileW: 120, fileH: 180, x: 14, y: 18, width: 101, height: 159 },
      facing: 'left',
    },
    sheet: { src: HERO_LEFT.url },
  },
};

export const KAOS_ART: PartyArtSet = {
  id: 'kaos',
  label: 'ケイオス',
  states: {
    battle_idle: {
      src: KAOS_LEFT.url,
      box: {
        fileW: 1221,
        fileH: 1289,
        // The exploration registry already knows which rectangle of her
        // sheet is the left-facing view; this is that rectangle.
        x: KAOS_LEFT.rect!.x,
        y: KAOS_LEFT.rect!.y,
        width: KAOS_LEFT.rect!.width,
        height: KAOS_LEFT.rect!.height,
      },
      facing: 'left',
    },
    portrait: KAOS_PORTRAITS.normal ? { src: KAOS_PORTRAITS.normal } : undefined,
    sheet: { src: KAOS_LEFT.url },
  },
};

/**
 * GALD — one character, one id, one set of pictures.
 *
 * He is fought, he is talked to, and three years later he is a baker or
 * a healer or a labourer. None of that makes him two characters, so
 * there is no `gald_battle` and no `gald_talk` here: there is `gald`,
 * with the pictures of him that exist. A close-up in a conversation is
 * a way of SHOWING one of these, not an eighth one to draw and keep in
 * step.
 *
 * Nothing here imports an image file. The files are named once, in the
 * manifest, and this says which of them is which state — so adding a
 * drawn attack pose is one line here and nothing anywhere else.
 *
 * What is NOT here: baker / healer / worker. Those are not states of a
 * picture, they are states of the world — which Gald exists after the
 * player's choice — and they stay where world truth is decided.
 */
export const GALD_ART: PartyArtSet = {
  id: 'gald',
  label: '盗賊ガルド',
  states: {
    battle_idle: GALD_PORTRAITS.ready ? { src: GALD_PORTRAITS.ready, facing: 'left' } : undefined,
    // Beaten and on one knee: still looking at you, and still to be
    // decided about. Not the same picture as being face down.
    battle_damage: GALD_PORTRAITS.defeated ? { src: GALD_PORTRAITS.defeated } : undefined,
    battle_down: GALD_BATTLE_DOWN ? { src: GALD_BATTLE_DOWN } : undefined,
    // No talking picture drawn yet: a conversation falls back to the
    // whole figure and shows the top of it. See CharacterArt's `bust`.
    fullbody: GALD_PORTRAITS.ready ? { src: GALD_PORTRAITS.ready } : undefined,
    portrait: GALD_PORTRAITS.ready ? { src: GALD_PORTRAITS.ready } : undefined,
  },
};

export const PARTY_ART: PartyArtRegistry = {
  [HERO_ART.id]: HERO_ART,
  [KAOS_ART.id]: KAOS_ART,
  [GALD_ART.id]: GALD_ART,
};
