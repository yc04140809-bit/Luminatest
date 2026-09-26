import { useState } from 'react';
import { createBattle } from '@mugen/game/battle/battleLogic';
import { specOf } from '@mugen/game/battle/enemySpec';
import { nextSpeed, DEFAULT_BATTLE_SPEED, type BattleSpeed } from '@mugen/game/battle/battleSpeed';
import { statsForLevels } from '@mugen/core/progression/levelStats';
import { MOSS_RABBIT } from '@mugen/content/enemies/species';
import { GALD_BATTLE } from '@mugen/content/enemies/galdBattle';
import { BattleStage, type BattleOpponentView } from '../ui/battle/BattleStage';
import { BATTLE_BACKGROUND_KEYS } from '@mugen/assets/keys';
import { availableMagic } from '@mugen/core/magic/magic';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';

/**
 * THE BATTLE SCREEN, ON ITS OWN — development builds only.
 *
 * `?preview=battle` shows the App's reproduction of the Artifact's
 * battle screen with a real opening state from the shared core, so it
 * can be looked at and compared without playing to a fight. Nothing
 * here is connected to the game: no world is read or written, no turn
 * is taken, and the commands do nothing. AUTO and ×2 only change how
 * their own chips are drawn.
 *
 *   ?preview=battle              the forest's moss rabbit, level 1
 *   ?preview=battle&enemy=gald   Gald, as the story fights him
 *   &magic=1                     after she has woken (the 魔法 command)
 *   &bg=FOREST|RUINS|SWAMP|CITY|BEACH|GRASSLAND
 *                                fight on another of the battle paintings
 *                                (default: the greenwood's own, FOREST)
 *   &escape=1 / &escape=0        force the 逃走 chip on or off. By default
 *                                it is there for a creature and not for
 *                                Gald, as in the Artifact's real fights.
 */
export function BattlePreview({ params }: { params: URLSearchParams }) {
  const gald = params.get('enemy') === 'gald';
  const magic = params.get('magic') === '1';
  const [battle] = useState(() =>
    createBattle(gald ? GALD_BATTLE : specOf(MOSS_RABBIT), undefined, {
      stats: statsForLevels(1, 1),
      magicUnlocked: magic,
    }),
  );
  const opponent: BattleOpponentView = gald
    ? { artId: 'gald', stands: 'NEAR' }
    : { artId: 'moss_rabbit', stands: 'FAR' };
  const [speed, setSpeed] = useState<BattleSpeed>(DEFAULT_BATTLE_SPEED);
  const [auto, setAuto] = useState(false);
  const bg = params.get('bg');
  const background = BATTLE_BACKGROUND_KEYS.find((key) => key === bg);
  const escape = params.has('escape') ? params.get('escape') === '1' : !gald;
  return (
    <BattleStage
      battle={battle}
      opponent={opponent}
      locationId="GREENWOOD_FOREST"
      background={background}
      // Her spells, as the fight would offer them; casting does nothing here.
      magic={{ spells: availableMagic(MAGIC_DEFS, { awakened: battle.magicUnlocked }), onCast: () => {} }}
      memoryLines={[]}
      memoryDepth={0}
      arcanaReady={false}
      speed={speed}
      auto={auto}
      onToggleAuto={() => setAuto((on) => !on)}
      onCycleSpeed={() => setSpeed((at) => nextSpeed(at))}
      onEscape={escape ? () => {} : undefined}
      testId="battle-preview"
    />
  );
}
