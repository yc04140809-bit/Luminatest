// MUSIC ARCHIVE — the pieces heard on the way, played again by the bard
// (酒場ハブ化 Phase 1, 2026-10-09).
//
// ONLY WHAT HAS BEEN HEARD. A piece is in the archive once the game has
// played it in this world (`musicUnlocks`, core/world); nothing is shown
// before it has been met, and only the pieces the game really has
// (`BgmId`, @mugen/assets/music) — the ruins have no piece of their own,
// so there is none to list.
//
// THE VILLAGE'S OWN PIECE can be swapped for one of these (`villageBgm`):
// heard in Alden's ordinary places only — never an event, a fight, the
// look ahead or a scene that fixes its music (content/audio/sceneBgm).

import type { BgmId } from '@mugen/assets';

export interface ArchivedPiece {
  id: BgmId;
  /** As the list names it. */
  title: string;
  /** Where it was heard, a few words. */
  heard: string;
}

/** Every piece, in the order the game meets them. */
export const MUSIC_ARCHIVE: readonly ArchivedPiece[] = [
  { id: 'TITLE_MAIN', title: 'MUGEN ZERO', heard: 'タイトル' },
  { id: 'OPENING', title: 'OPENING', heard: 'はじまり' },
  { id: 'KAOS_EVENT', title: 'KAOS', heard: 'ケイオス' },
  { id: 'ALDEN_VILLAGE', title: 'ALDEN VILLAGE', heard: 'アルデン村' },
  { id: 'TAVERN', title: 'MOONLIGHT TAVERN', heard: '月灯りの酒場' },
  { id: 'GREENWOOD_FOREST', title: 'GREENWOOD FOREST', heard: 'グリーンウッドの森' },
  { id: 'NORMAL_BATTLE', title: 'BATTLE', heard: '戦闘' },
  { id: 'BOSS_BATTLE', title: 'BOSS', heard: '強敵との戦い' },
];

export const MUSIC_ARCHIVE_IDS: readonly BgmId[] = MUSIC_ARCHIVE.map((p) => p.id);

export function isArchivedPiece(id: unknown): id is BgmId {
  return typeof id === 'string' && (MUSIC_ARCHIVE_IDS as readonly string[]).includes(id);
}

/** The archive as a player has it: heard pieces only, in the game's order. */
export function heardPieces(heard: readonly string[]): ArchivedPiece[] {
  return MUSIC_ARCHIVE.filter((p) => heard.includes(p.id));
}

/** The bard's words. */
export const BARD_WORDS = {
  ask: '聞きたい曲はあるかい？',
  play: 'それじゃあ、一曲。',
  none: '……まだ、君と同じ歌を知らないようだ。',
  setVillage: 'いい選曲だ。村でも口ずさむとしよう。',
  resetVillage: 'いつもの村の歌に戻そう。',
} as const;
