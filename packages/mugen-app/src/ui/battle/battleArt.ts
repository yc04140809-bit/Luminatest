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
import galdBattleIdle from '@mugen/assets/files/characters/gald/gald-battle-idle.png';
import mossRabbit from '@mugen/assets/files/enemies/moss-rabbit.png';
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
    },
  },
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
