// THE APP'S OWN MUSIC (2026-10-11) — pieces only the App plays.
//
// music.ts is shared with the Artifact; anything imported there is bundled
// into it. These pieces are for screens and fights only the App has (the
// winnings after a fight, セキリュウガ, フウミミ, the newer creatures), so their files are named
// here, and only the App's audio player imports this file. In music.ts
// their slots are null.
//
// The files are byte-for-byte as delivered, in their own folder (files/audio/bgm-app/README.md) so the Artifact's build check, which reads files/audio/bgm, never meets them.
// Changing a piece is: put the file in files/audio/bgm-app, import it here,
// name its slot — nothing else.

import type { BgmId } from './music';
import bgmResultVictory from '../files/audio/bgm-app/result-victory.mp3';
import bgmSekiryugaBattle from '../files/audio/bgm-app/sekiryuga-battle.mp3';
import bgmSpecialBattle from '../files/audio/bgm-app/special-battle.mp3';
import bgmNormalBattle2 from '../files/audio/bgm-app/normal-battle-2.mp3';

export const APP_BGM_ASSETS: Partial<Record<BgmId, string>> = {
  RESULT_NORMAL: bgmResultVictory,
  SEKIRYUGA_BATTLE: bgmSekiryugaBattle,
  SPECIAL_BATTLE: bgmSpecialBattle,
  NORMAL_BATTLE_2: bgmNormalBattle2,
};

/**
 * A slot with no file of its own plays another's: a boss's winnings, until
 * a piece is written for them, sound like any fight's.
 */
export const APP_BGM_FALLBACK: Partial<Record<BgmId, BgmId>> = {
  RESULT_BOSS: 'RESULT_NORMAL',
};
