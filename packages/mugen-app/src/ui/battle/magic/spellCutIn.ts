// HER CUT-IN FOR ONE OF HER SPELLS — the cut-in part (../cutin), filled
// from the spell's own data and from the table below, and nothing else.
//
// THE TABLE IS THE WHOLE OF IT. Every spell that plays a cut-in is listed
// here by its id in the game's data (magicDefs), with the picture and
// colours it uses. A spell that is not listed plays NO cut-in — the rest
// of its showing goes ahead — rather than borrowing somebody's picture:
// a sixth spell is 未接続 until somebody decides what it looks like.
//
//   name  the spell's name in the game's data, as the tray and the battle
//         log print it — never v18's provisional names (双極崩界 stays a
//         preview-only sample, src/dev/cutInSamples.ts)
//   sub   the spell's own line from the same data
//   art   the picture the table names — today all five are hers, and the
//         one picture of her casting there is: kaos-cast.png, the file
//         v18's Kaos cut-in used and the battle draws while she casts
//   look  v18's Kaos cut-in colours (theme 'chaos')

import kaosCast from '@mugen/assets/files/characters/kaos/kaos-cast.png';
import type { MagicDef } from '@mugen/core/magic/magic';
import type { CutInSpec, CutInTheme } from '../cutin/CutIn';
import { spellShowOf } from './spellShow';

interface SpellCutInArt {
  /** Whose picture, by file — shown in the table so nobody has to guess. */
  art: string;
  theme: CutInTheme;
  /** The large faint word behind, and whose spell the small line names. */
  word: string;
}

/** Kaos, casting: kaos-cast.png, v18's Kaos colours. */
const KAOS_CASTING: SpellCutInArt = { art: kaosCast, theme: 'chaos', word: 'KAOS' };

/** Spell id → the cut-in it plays. Absent: no cut-in (未接続). */
export const SPELL_CUT_INS: Readonly<Record<string, SpellCutInArt>> = {
  starlight_bolt: KAOS_CASTING, // 星光弾
  comet_strike: KAOS_CASTING, // 彗星撃
  mending_light: KAOS_CASTING, // 癒しの光
  star_shield: KAOS_CASTING, // 星盾
  star_haze: KAOS_CASTING, // 星霞
};

/** Her cut-in for this spell, or null when the table has none for it. */
export function spellCutIn(def: MagicDef): CutInSpec | null {
  const look = SPELL_CUT_INS[def.id];
  if (!look) return null;
  return {
    theme: look.theme,
    tier: spellShowOf(def).tier,
    art: look.art,
    word: look.word,
    kicker: `${look.word} · ${def.element} ${def.type}`,
    name: def.name,
    sub: def.line,
  };
}
