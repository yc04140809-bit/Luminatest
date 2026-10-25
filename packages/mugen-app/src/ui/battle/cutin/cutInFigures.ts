// THE MOVING BUSTS (作者 実機 2026-10-25: カットインのキャラ画像を立ち絵のスタチューに — のっぺりしてる).
//
// The author's own 4-second looping busts, one per character, on their dark starry ground — played
// silent and looped in the cut-in's window (CutIn.tsx), the first frame shown until it plays and in
// its place where it cannot (less motion, a WebView that will not play it). Converted from the
// author's MP4s (720×960, 24fps) to WebM (VP9) without other change: the same frames, half the size,
// and a video every Chromium plays (the test browser has no H.264).
//
// `face` is where the face is in the frame (a share of its width and height), measured on the frames:
// the window sets that point at its middle — the middle of the screen (作者: グレイヴの顔が右端に寄って
// いるので中央に). Nothing is mirrored: they look the way they were drawn (left, at the creatures).
//
// Here only the three the game plays (主人公, グレイヴ, ケイオス). Levi's and Aria's are in the
// debug preview's samples (src/dev/cutInSamples.ts), the only place their cut-ins are shown.

import heroVideo from '@mugen/assets/files/characters/hero/hero-cutin.webm';
import heroStill from '@mugen/assets/files/characters/hero/hero-cutin-poster.webp';
import graveVideo from '@mugen/assets/files/characters/grave/grave-cutin.webm';
import graveStill from '@mugen/assets/files/characters/grave/grave-cutin-poster.webp';
import kaosVideo from '@mugen/assets/files/characters/kaos/kaos-cutin.webm';
import kaosStill from '@mugen/assets/files/characters/kaos/kaos-cutin-poster.webp';
import type { CutInMotion } from './CutIn';

export interface CutInFigure {
  /** The first frame, as a picture (CutInSpec.art). */
  art: string;
  motion: CutInMotion;
}

/** 主人公 (ノア): sword across him, looking left. */
export const HERO_FIGURE: CutInFigure = { art: heroStill, motion: { video: heroVideo, face: { x: 0.57, y: 0.52 } } };
/** グレイヴ: the greatsword's hilt at his side, looking left. */
export const GRAVE_FIGURE: CutInFigure = { art: graveStill, motion: { video: graveVideo, face: { x: 0.49, y: 0.52 } } };
/** ケイオス: her hand out, her white wing behind — gold right eye, blue left, as drawn. */
export const KAOS_FIGURE: CutInFigure = { art: kaosStill, motion: { video: kaosVideo, face: { x: 0.59, y: 0.38 } } };
