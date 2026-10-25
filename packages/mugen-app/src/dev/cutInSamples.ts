// THE FOUR CUT-INS OF THE v18 PROTOTYPE, AS SAMPLES — debug preview only.
//
// These exist to look at the cut-in part with, and for nothing else.
// They are joined to no skill: nothing in the game plays them, and this
// file is reachable only from the debug preview (src/dev), which a
// release build does not contain.
//
// THE FIGURES ARE THE AUTHOR'S MOVING BUSTS (作者 2026-10-25), one each:
// ケイオス and 主人公 the game's own (ui/battle/cutin/cutInFigures.ts);
// レヴィ and アリア here, the only place their cut-ins are shown (a
// release build never loads this file, so never ships them). v18's
// pictures (kaos-cast, hero-battle-idle, levi-battle, aria-cutin) stay
// in the assets, where the fight and the scenes still draw them.
//
// THE WORDS ARE v18's TOO — its names are PROVISIONAL (仮称), which is
// why every sample says so on its bottom line. v18's lines naming stat
// changes (ATK/SPD/CRIT UP, DEF/RESIST DOWN) are left off: the game has
// no such stats, and a sample should not suggest it does.

import leviVideo from '@mugen/assets/files/characters/levi/levi-cutin.webm';
import leviStill from '@mugen/assets/files/characters/levi/levi-cutin-poster.webp';
import ariaVideo from '@mugen/assets/files/characters/aria/aria-cutin.webm';
import ariaStill from '@mugen/assets/files/characters/aria/aria-cutin-poster.webp';
import type { CutInSpec } from '../ui/battle/cutin/CutIn';
import { HERO_FIGURE, KAOS_FIGURE, type CutInFigure } from '../ui/battle/cutin/cutInFigures';

/** レヴィ: her lance down across her, looking left. */
const LEVI_FIGURE: CutInFigure = { art: leviStill, motion: { video: leviVideo, face: { x: 0.56, y: 0.54 } } };
/** アリア: her bow drawn, looking left. */
const ARIA_FIGURE: CutInFigure = { art: ariaStill, motion: { video: ariaVideo, face: { x: 0.56, y: 0.5 } } };

export interface CutInSample {
  id: string;
  /** On the DEBUG panel's button. */
  label: string;
  spec: CutInSpec;
}

const PROVISIONAL = '仮称・v18 CUT-IN 見本（本編未接続）';

export const CUT_IN_SAMPLES: readonly CutInSample[] = [
  {
    id: 'chaos',
    label: 'ケイオス',
    spec: {
      theme: 'chaos',
      tier: 'SKILL',
      art: KAOS_FIGURE.art,
      motion: KAOS_FIGURE.motion,
      word: 'CHAOS',
      kicker: 'CHAOS ARCANUM',
      name: '双極崩界',
      sub: PROVISIONAL,
    },
  },
  {
    id: 'hero',
    label: '主人公',
    spec: {
      theme: 'hero',
      // v18 shows this one as the hero's 必殺.
      tier: 'FINISHER',
      art: HERO_FIGURE.art,
      motion: HERO_FIGURE.motion,
      word: 'ZERO',
      kicker: 'ZERO BLADE ARTS',
      name: '零閃・天衝',
      sub: PROVISIONAL,
    },
  },
  {
    id: 'levi',
    label: 'レヴィ',
    spec: {
      theme: 'levi',
      tier: 'SKILL',
      art: LEVI_FIGURE.art,
      motion: LEVI_FIGURE.motion,
      word: 'LEVI',
      kicker: 'LEVI ABYSS LANCE',
      name: '冥槍・黒葬封界',
      sub: PROVISIONAL,
    },
  },
  {
    id: 'aria',
    label: 'アリア',
    spec: {
      theme: 'aria',
      // v18's long, readability-fixed cut-in.
      tier: 'FINISHER',
      art: ARIA_FIGURE.art,
      motion: ARIA_FIGURE.motion,
      word: 'ARIA',
      kicker: 'ARIA CELESTIAL ARCHERY',
      name: '天弓・蒼薔薇祝界',
      sub: PROVISIONAL,
    },
  },
];
