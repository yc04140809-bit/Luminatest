import { describe, expect, it } from 'vitest';
import { MUSIC_ARCHIVE, heardPieces, isArchivedPiece } from './musicArchive';
import { BGM_ASSETS } from '@mugen/assets/music';
import { bgmForScene } from './sceneBgm';

/** MUSIC ARCHIVE (2026-10-09): only pieces the game has, only once heard. */

describe('the archive', () => {
  it('lists every piece the game really has, once, and nothing else', () => {
    expect(MUSIC_ARCHIVE.map((p) => p.id).sort()).toEqual(Object.keys(BGM_ASSETS).sort());
    for (const p of MUSIC_ARCHIVE) expect(BGM_ASSETS[p.id], p.id).not.toBeNull();
  });

  it('names her CHAOS (混沌), never KAOS', () => {
    expect(MUSIC_ARCHIVE.find((p) => p.id === 'KAOS_EVENT')?.title).toBe('CHAOS');
    for (const p of MUSIC_ARCHIVE) expect(p.title).not.toMatch(/KAOS/i);
  });

  it('shows only what has been heard, in the game’s order', () => {
    expect(heardPieces([])).toEqual([]);
    expect(heardPieces(['TAVERN', 'OPENING', 'NOT_A_PIECE']).map((p) => p.id)).toEqual(['OPENING', 'TAVERN']);
    expect(isArchivedPiece('TAVERN')).toBe(true);
    expect(isArchivedPiece('RUINS')).toBe(false);
  });
});

describe('the village’s chosen piece', () => {
  const v = { villageBgmId: 'OPENING' as const, locationId: null };
  it('plays in Alden’s ordinary places', () => {
    for (const screen of ['HOME', 'BAG', 'STATUS', 'EXPLORE', 'ITEM_SHOP', 'WORLD_MEMORY'] as const) {
      expect(bgmForScene({ ...v, screen }), screen).toBe('OPENING');
    }
    expect(bgmForScene({ ...v, screen: 'TALK_SPOT', locationId: 'ALDEN_BAKERY' })).toBe('OPENING');
  });

  it('never at an event, a fight, the forest, the tavern, the look ahead or the future site', () => {
    expect(bgmForScene({ ...v, screen: 'BATTLE' })).toBe('NORMAL_BATTLE');
    expect(bgmForScene({ ...v, screen: 'GREENWOOD' })).toBe('GREENWOOD_FOREST');
    expect(bgmForScene({ ...v, screen: 'LIFE_CHOICE' })).toBe('KAOS_EVENT');
    expect(bgmForScene({ ...v, screen: 'TIME_SHIFT' })).toBe('ALDEN_VILLAGE');
    expect(bgmForScene({ ...v, screen: 'FUTURE_SITE', locationId: 'ALDEN_BAKERY' })).toBe('ALDEN_VILLAGE');
    expect(bgmForScene({ ...v, screen: 'TALK_SPOT', locationId: 'MOONLIGHT_TAVERN' })).toBe('TAVERN');
    expect(bgmForScene({ ...v, screen: 'TITLE' })).toBe('TITLE_MAIN');
  });

  it('absent, the village’s own — as the Artifact always has it', () => {
    expect(bgmForScene({ screen: 'HOME', locationId: null })).toBe('ALDEN_VILLAGE');
    expect(bgmForScene({ screen: 'HOME', locationId: null, villageBgmId: null })).toBe('ALDEN_VILLAGE');
  });
});
