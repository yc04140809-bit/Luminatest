// THE FOUR CUT-INS OF THE v18 PROTOTYPE, AS SAMPLES — debug preview only.
//
// These exist to look at the cut-in part with, and for nothing else.
// They are joined to no skill: nothing in the game plays them, and this
// file is reachable only from the debug preview (src/dev), which a
// release build does not contain.
//
// THE PICTURES ARE v18's OWN, UNCHANGED. kaos-cast and hero-battle-idle
// are the same bytes as v18's and were already in the game's assets;
// levi-battle and aria-cutin were copied from the v18 hand-off as they
// were (checked against its FILE_MANIFEST.sha256). No picture is a
// stand-in for another.
//
// THE WORDS ARE v18's TOO — its names are PROVISIONAL (仮称), which is
// why every sample says so on its bottom line. v18's lines naming stat
// changes (ATK/SPD/CRIT UP, DEF/RESIST DOWN) are left off: the game has
// no such stats, and a sample should not suggest it does.

import kaosCast from '@mugen/assets/files/characters/kaos/kaos-cast.png';
import heroBattleIdle from '@mugen/assets/files/characters/hero/hero-battle-idle.png';
import leviBattle from '@mugen/assets/files/characters/levi/levi-battle.png';
import ariaCutin from '@mugen/assets/files/characters/aria/aria-cutin.png';
import type { CutInSpec } from '../ui/battle/cutin/CutIn';

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
      art: kaosCast,
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
      art: heroBattleIdle,
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
      art: leviBattle,
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
      art: ariaCutin,
      word: 'ARIA',
      kicker: 'ARIA CELESTIAL ARCHERY',
      name: '天弓・蒼薔薇祝界',
      sub: PROVISIONAL,
    },
  },
];
