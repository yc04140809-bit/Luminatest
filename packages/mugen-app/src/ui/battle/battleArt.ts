// THE PICTURES THE BATTLE SCREEN DRAWS, AND ONLY THOSE.
//
// The Artifact asks `partyArtFor` / `enemyArtFor` / `BATTLE_UI`, all of
// which import the whole art manifest — and importing the manifest
// makes the bundler ship every picture it names, which is how the App
// once grew by 30 MB of art it never showed. So the App names each file
// the battle screen uses, one import per file, and nothing else.
//
// WHICH DRAWING A STATE IS stays the core's: the entries below carry
// the same facing and face boxes as the shared art table, and are
// resolved through the same fallback chains (`partyChainFor`,
// `ENEMY_FALLBACK`). `battleArt.test.ts` holds every entry to the
// Artifact's own answer, file and metadata, so the two screens cannot
// draw somebody differently.

import heroBattleIdle from '@mugen/assets/files/characters/hero/hero-battle-idle.png';
import kaosBattleDefault from '@mugen/assets/files/characters/kaos/kaos-battle-default.png';
import kaosCast from '@mugen/assets/files/characters/kaos/kaos-cast.png';
import kaosAwaken from '@mugen/assets/files/characters/kaos/kaos-awaken.png';
import galdBattleIdle from '@mugen/assets/files/characters/gald/gald-battle-idle.png';
import galdBattleDamage from '@mugen/assets/files/characters/gald/gald-battle-damage.png';
import galdBattleDown from '@mugen/assets/files/characters/gald/gald-battle-down.png';
import mossRabbit from '@mugen/assets/files/enemies/moss-rabbit.png';
import mossRabbitDown from '@mugen/assets/files/enemies/moss-rabbit-down.png';
import sekiryuga from '@mugen/assets/files/enemies/sekiryuga.png';
import uiAutoOn from '@mugen/assets/files/ui/battle/chip-auto-on.png';
import uiAutoOff from '@mugen/assets/files/ui/battle/chip-auto-off.png';
import uiSpeedOn from '@mugen/assets/files/ui/battle/chip-x2-on.png';
import uiSpeedOff from '@mugen/assets/files/ui/battle/chip-x2-off.png';
import uiEscapeOn from '@mugen/assets/files/ui/battle/chip-escape-on.png';
import uiEscapeOff from '@mugen/assets/files/ui/battle/chip-escape-off.png';
import uiCommandDiamond from '@mugen/assets/files/ui/battle/command-diamond.png';
import uiTurnSlot from '@mugen/assets/files/ui/battle/turn-slot.png';
import uiTurnNext from '@mugen/assets/files/ui/battle/turn-next.png';
import uiPartyCard from '@mugen/assets/files/ui/battle/party-card.png';
import uiEnemyPlate from '@mugen/assets/files/ui/battle/enemy-plate.png';
import uiMessageWindow from '@mugen/assets/files/ui/battle/message-window.png';
import uiMemoryPanel from '@mugen/assets/files/ui/battle/memory-panel.png';
import uiMemoryStar from '@mugen/assets/files/ui/battle/memory-star.png';
import uiBarRail from '@mugen/assets/files/ui/battle/bar-rail.png';
import uiBarHp from '@mugen/assets/files/ui/battle/bar-hp.png';
import uiBarMp from '@mugen/assets/files/ui/battle/bar-mp.png';
import {
  ENEMY_FALLBACK,
  partyChainFor,
  resolveArt,
  type ArtSet,
  type EnemyArtState,
  type PartyArtState,
  type ResolvedArt,
} from '@mugen/core/art/artStates';

/** The people who can stand on the App's battlefield. */
const PARTY: Record<'hero' | 'kaos' | 'gald', ArtSet<PartyArtState>> = {
  hero: {
    id: 'hero',
    label: 'あなた',
    states: {
      battle_idle: {
        src: heroBattleIdle,
        facing: 'left',
        face: { fileW: 1024, fileH: 1536, x: 300, y: 235, width: 195, height: 195 },
      },
    },
  },
  kaos: {
    id: 'kaos',
    label: 'ケイオス',
    states: {
      battle_idle: {
        src: kaosBattleDefault,
        facing: 'left',
        face: { fileW: 1145, fileH: 1374, x: 478, y: 120, width: 180, height: 180 },
      },
      /** Casting — for the length of a spell. */
      battle_cast: {
        src: kaosCast,
        facing: 'left',
        face: { fileW: 1103, fileH: 1426, x: 488, y: 225, width: 165, height: 165 },
      },
      /** Her higher form, in the fight she wakes in. */
      awakened: {
        src: kaosAwaken,
        facing: 'left',
        face: { fileW: 1024, fileH: 1536, x: 470, y: 195, width: 180, height: 180 },
      },
    },
  },
  gald: {
    id: 'gald',
    label: '盗賊ガルド',
    states: {
      battle_idle: {
        src: galdBattleIdle,
        facing: 'right',
        face: { fileW: 1536, fileH: 1024, x: 1105, y: 175, width: 190, height: 190 },
      },
      /** Struck. */
      battle_damage: { src: galdBattleDamage },
      /** Beaten, on the ground. */
      battle_down: { src: galdBattleDown },
    },
  },
};

/** The creatures. */
const ENEMIES: Record<string, ArtSet<EnemyArtState>> = {
  moss_rabbit: {
    id: 'moss_rabbit',
    label: 'モスラビット',
    states: {
      front: {
        src: mossRabbit,
        box: { fileW: 1024, fileH: 1536, x: 129, y: 387, width: 703, height: 850 },
        face: { fileW: 1024, fileH: 1536, x: 400, y: 620, width: 380, height: 380 },
        facing: 'right',
      },
      /** Beaten, lying in the grass. */
      down: {
        src: mossRabbitDown,
        box: { fileW: 1536, fileH: 1024, x: 6, y: 218, width: 1523, height: 659 },
        facing: 'right',
      },
    },
  },
  /**
   * セキリュウガ (FORGE MON-000007) — its official art, delivered
   * 2026-10-06 as a transparent PNG and placed as delivered.
   *
   * One drawing: standing. There is no drawing of it brought down, so it
   * is not given one — at nought it stays this drawing and the stage
   * lowers and dims it (battle.app.css, `boss-kneel`), never squashing it.
   */
  sekiryuga: {
    id: 'sekiryuga',
    label: 'セキリュウガ',
    states: {
      front: {
        src: sekiryuga,
        box: { fileW: 1122, fileH: 1402, x: 9, y: 11, width: 1113, height: 1382 },
        face: { fileW: 1122, fileH: 1402, x: 870, y: 175, width: 230, height: 230 },
        facing: 'right',
      },
    },
  },
  /**
   * PROVISIONAL — NO DRAWING YET (作者 2026-10-10). フウミミ (FORGE
   * MON-000002), ヒョウレイ (MON-000008), and the small フウミミ the one
   * individual shields. Until their transparent PNGs made for the battle
   * screen are delivered, they are fought and shown with the placeholder
   * (CharacterArt), exactly as an absent entry would be. FORGE's reference
   * pictures and character sheets are NOT cut out and used here.
   *
   * When a PNG arrives: place it under mugen-assets/files/enemies/ as
   * delivered, import it above, and give the entry its `front` (and `down`
   * if drawn) with the box measured — nothing else changes.
   */
  fuumimi: { id: 'fuumimi', label: 'フウミミ', states: {} },
  hyourei: { id: 'hyourei', label: 'ヒョウレイ', states: {} },
  fuumimi_young: { id: 'fuumimi_young', label: '小さなフウミミ', states: {} },
};

/**
 * HOW AN OPPONENT IS SHOWN IN A FIGHT, beyond its slot — the App's battle
 * screen only (BattleStage `presence`). Not what it IS: its size in the
 * world (spriteFrames, FORGE) is unchanged; this is staging.
 *
 * セキリュウガ (2026-10-07, author's adjustment): smallish by canon, and
 * read as standing too far back for a boss. In the fight only, drawn
 * 1.2× (shape kept) and a step nearer: a twentieth of the field further
 * in from the edge, and its feet a twentieth further down the field
 * (its plate still under its feet, lifted only where a short screen
 * would put it into the commands — BattleStage).
 */
export const BATTLE_PRESENCE: Partial<Record<string, { scale: number; inset: number; bottom: number }>> = {
  sekiryuga: { scale: 1.2, inset: 0.05, bottom: -0.05 },
};

export type BattlePartyId = keyof typeof PARTY;

/** A party member (or a person fought as one) in a state. */
export function battlePartyArt(id: BattlePartyId, state: PartyArtState): ResolvedArt<PartyArtState> {
  return resolveArt(PARTY[id], state, partyChainFor(state));
}

/** A creature in a state. */
export function battleEnemyArt(id: string, state: EnemyArtState): ResolvedArt<EnemyArtState> {
  return resolveArt(ENEMIES[id], state, ENEMY_FALLBACK);
}

/** What an opponent lies down as — the Artifact's `downPose`. */
export const DOWN_POSE = { creature: 'down', person: 'battle_down' } as const;

/**
 * A PERSON FOUGHT AS AN OPPONENT reads the enemy's states in party words.
 * The same table as the Artifact's `opponent.ts` (AS_PERSON).
 */
export const AS_PERSON: Partial<Record<EnemyArtState, PartyArtState>> = {
  front: 'battle_idle',
  attack: 'battle_attack',
  damage: 'battle_damage',
  down: 'battle_down',
  portrait: 'portrait',
};

/** The delivered UI frames, by the same names as the manifest's BATTLE_UI. */
export const BATTLE_UI_FRAMES = {
  autoOn: uiAutoOn,
  autoOff: uiAutoOff,
  speedOn: uiSpeedOn,
  speedOff: uiSpeedOff,
  escapeOn: uiEscapeOn,
  escapeOff: uiEscapeOff,
  commandDiamond: uiCommandDiamond,
  turnSlot: uiTurnSlot,
  turnNext: uiTurnNext,
  partyCard: uiPartyCard,
  enemyPlate: uiEnemyPlate,
  messageWindow: uiMessageWindow,
  memoryPanel: uiMemoryPanel,
  memoryStar: uiMemoryStar,
  barRail: uiBarRail,
  barHp: uiBarHp,
  barMp: uiBarMp,
} as const;
