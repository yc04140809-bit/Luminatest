import type { DialogueLine } from '@mugen/content/dialogue/prologue';
import { kaosFaceOf } from '@mugen/content/characters/kaosFaces';
import { heroFaceOf } from '@mugen/content/characters/heroFaces';
import { graveFaceOf } from '@mugen/content/characters/graveFaces';
import { ariaFaceOf, leviFaceOf, type AriaFace, type LeviFace } from '@mugen/content/characters/companionFaces';
import { BAKERY_OWNER } from '@mugen/content/characters/bakeryOwner';
import type { NpcExpression } from '@mugen/core/npc/touchReaction';
import type { FaceBox } from '../assets/kaosFaces';
import { kaosFacePicture } from '../assets/kaosFaces';
import { heroFaceSrc } from '../assets/heroFaces';
import { graveFaceSrc } from '../assets/graveFaces';
import { ariaFaceSrc, leviFaceSrc } from '../assets/companionFaces';
import { mireiFace, shopArt } from '../assets/shop';
import { bakeryArt } from '../assets/bakery';
import { dailyFaceFor } from '../assets/dailyFaces';

/**
 * WHO IS SPEAKING, AS A FACE (作者指示 2026-10-12「会話画面での顔表示追加」):
 * above the finale's words, the speaker's head and shoulders, with the face
 * their line names (its own picture where there is one; NORMAL where the line
 * names none). Every picture is the delivered file, shown through a square
 * window on it (`box`) — never re-cut.
 *
 *   ケイオス・主人公・グレイヴ・アリア・レヴィ  their face pictures (the faces they have)
 *   ミレイ        the shop's pictures of her, by the line's face
 *   リゼル        her face pictures, by the line's face (2026-10-12)
 *   パン屋の主人・リナ  their whole-figure pictures, at the head (one face each, for now)
 *   ほか           no picture yet: the name alone
 */

/** A face to draw: which (for caching and tests), and how to get it. */
export interface FinaleFace {
  /** Who and which face, e.g. "kaos:SERIOUS". */
  key: string;
  load: () => Promise<{ src: string; box: FaceBox } | null>;
}

/** The head and shoulders in a 1086×1448 bust, by who it is (measured on the delivered files). */
const HERO_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 240, y: 20, width: 620, height: 620 };
const GRAVE_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 190, y: 0, width: 580, height: 580 };
const ARIA_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 250, y: 20, width: 580, height: 580 };
const LEVI_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 260, y: 20, width: 560, height: 560 };
const MIREI_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 290, y: 0, width: 460, height: 460 };
const OWNER_HEAD: FaceBox = { fileW: 1086, fileH: 1448, x: 360, y: 10, width: 320, height: 320 };
const LINA_HEAD: FaceBox = { fileW: 1254, fileH: 1254, x: 430, y: 30, width: 360, height: 360 };

/** Kaos's pictures come in two shapes; her head is the top-middle of whichever box they give. */
export const kaosHead = (bust: FaceBox): FaceBox => ({
  fileW: bust.fileW,
  fileH: bust.fileH,
  x: Math.round(bust.x + bust.width * 0.2),
  y: bust.y,
  width: Math.round(bust.width * 0.6),
  height: Math.round(bust.width * 0.6),
});

const withBox = (box: FaceBox) => (src: string | null) => (src ? { src, box } : null);

export const MIREI_SPEAKER = 'ミレイ';
export const LINA_SPEAKER = 'リナ';

/** The face for a finale line, or null (narration, or someone with no picture yet). */
export function finaleFaceFor(line: DialogueLine & { face?: NpcExpression; ariaFace?: AriaFace; leviFace?: LeviFace }): FinaleFace | null {
  const kaos = kaosFaceOf(line);
  if (kaos) return { key: `kaos:${kaos}`, load: () => kaosFacePicture(kaos).then((p) => (p ? { src: p.src, box: kaosHead(p.box) } : null)) };
  const hero = heroFaceOf(line);
  if (hero) return { key: `hero:${hero}`, load: () => heroFaceSrc(hero).then(withBox(HERO_HEAD)) };
  const grave = graveFaceOf(line);
  if (grave) return { key: `grave:${grave}`, load: () => graveFaceSrc(grave).then(withBox(GRAVE_HEAD)) };
  const aria = ariaFaceOf(line);
  if (aria) return { key: `aria:${aria}`, load: () => ariaFaceSrc(aria).then(withBox(ARIA_HEAD)) };
  const levi = leviFaceOf(line);
  if (levi) return { key: `levi:${levi}`, load: () => leviFaceSrc(levi).then(withBox(LEVI_HEAD)) };
  if (line.speaker === MIREI_SPEAKER) {
    const face = line.face ?? 'NORMAL';
    return { key: `mirei:${face}`, load: () => shopArt().then((a) => withBox(MIREI_HEAD)(mireiFace(a.mirei, face).src)) };
  }
  const rizel = dailyFaceFor(line);
  if (rizel) return rizel;
  if (line.speaker === BAKERY_OWNER.name) return { key: 'owner:NORMAL', load: () => bakeryArt().then((a) => withBox(OWNER_HEAD)(a.owner)) };
  if (line.speaker === LINA_SPEAKER) return { key: 'lina:NORMAL', load: () => bakeryArt().then((a) => withBox(LINA_HEAD)(a.lina)) };
  return null;
}
