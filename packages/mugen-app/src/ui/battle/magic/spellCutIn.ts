// HER CUT-IN FOR ONE OF HER SPELLS — the cut-in part (../cutin), filled
// from the spell's own data and nothing else.
//
//   name  the spell's name in the game's data (magicDefs), as the tray and
//         the battle log already print it — never v18's provisional names
//   sub   the spell's own line from the same data ("ケイオスの指先に…")
//   art   kaos-cast.png: her casting picture, the same file v18's cut-in
//         used and the one the battle already draws while she casts
//   look  v18's Kaos cut-in colours (theme 'chaos')
//
// The small line over the name says whose and what kind — her name and
// the spell's element and type as the data gives them — so it names
// nothing that is not in the game.

import kaosCast from '@mugen/assets/files/characters/kaos/kaos-cast.png';
import type { MagicDef } from '@mugen/core/magic/magic';
import type { CutInSpec } from '../cutin/CutIn';
import { spellShowOf } from './spellShow';

export function spellCutIn(def: MagicDef): CutInSpec {
  return {
    theme: 'chaos',
    tier: spellShowOf(def).tier,
    art: kaosCast,
    word: 'KAOS',
    kicker: `KAOS · ${def.element} ${def.type}`,
    name: def.name,
    sub: def.line,
  };
}
