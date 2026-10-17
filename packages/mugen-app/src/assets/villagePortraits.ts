import type { VillageSpotId } from '@mugen/content/locations/aldenVillageMap';
import { kaosFacePicture } from './kaosFaces';
import { bakeryArt } from './bakery';
import { shopArt } from './shop';
import { graveFaceSrc } from './graveFaces';

/**
 * WHO IS SHOWN IN THE VILLAGE'S LEFT PANEL (作者 2026-10-16: 人物と文章で半々、顔が重要):
 * the person of the place chosen, from the pictures the game already has — リナ at the bakery,
 * ミレイ at the tool shop, the master at the inn — and Kaos, who is always with them, otherwise.
 * `focus` is where the face is in the picture (object-position), so it is what stays in view.
 */
export interface VillagePortrait {
  key: string;
  name: string;
  /** Under the name, the place (as the base image's 「村の花屋」); none for Kaos. */
  role: string | null;
  load: () => Promise<string | null>;
  /** Where the face is in the picture (x% y%): what stays in view, and what a zoom closes in on. */
  focus: string;
  /** How far in (1: the picture as it fills the frame) — a full-length figure needs more to show the face. */
  zoom: number;
}

const KAOS: VillagePortrait = {
  key: 'kaos',
  name: 'ケイオス',
  role: null,
  load: () => kaosFacePicture('NORMAL').then((p) => p?.src ?? null),
  focus: '50% 14%',
  zoom: 1.15,
};

export function villagePortrait(spot: VillageSpotId | null, graveMet: boolean): VillagePortrait {
  switch (spot) {
    case 'bakery':
      return { key: 'lina', name: 'リナ', role: 'パン屋', load: () => bakeryArt().then((a) => a.lina), focus: '50% 12%', zoom: 2.4 };
    case 'shop':
      return { key: 'mirei', name: 'ミレイ', role: '道具屋', load: () => shopArt().then((a) => a.mirei.NORMAL ?? null), focus: '50% 12%', zoom: 1.3 };
    case 'tavern':
      return { key: 'grave', name: graveMet ? 'グレイヴ' : 'マスター', role: '宿酒場', load: () => graveFaceSrc('NORMAL'), focus: '50% 14%', zoom: 1.1 };
    default:
      return KAOS;
  }
}
