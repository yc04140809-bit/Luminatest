import { useEffect, useMemo, useState } from 'react';
import { availableMagic } from '@mugen/core/magic/magic';
import { FINALE_STAGES, type FinaleStage } from '@mugen/core/world/chapterFinale';
import { VALSHEEL_FORM1_PROVISIONAL, VALSHEEL_FORM2_PROVISIONAL } from '@mugen/content/enemies/valsheelBattle';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { HERO_STARTING_SKILLS } from '@mugen/content/skills/heroSkills';
import { GRAVE_GUEST, heroAndKaos } from '@mugen/content/characters/partyMembers';
import { FinaleRun, type FinaleMusic } from '../ui/finale';
import { audioManager } from '../platform/audio';

/**
 * 第1章終盤, TRIED ON ITS OWN (2026-10-12) — debug builds only, from the
 * DEBUG 3人戦闘 chooser (「第1章終盤（遺跡〜襲撃〜ヴァルシール戦）」) or by URL:
 *
 *   ?preview=finale             from the night before (NONE)
 *   &from=EVE | RAID | LURED | FORM1_WON | FORM2_WON
 *                               from the ruins / the lure / the words before the fight /
 *                               the shell breaking / what follows the stop
 *   &weak=1                     both forms at 1 HP (to see what follows a win)
 *
 * Reads and writes nothing of the world: the stage is kept in memory only,
 * the party at level one (as the 3人戦闘 preview has them).
 */
export function FinalePreview({ params }: { params: URLSearchParams }) {
  const from = params.get('from');
  const start: FinaleStage = (FINALE_STAGES as readonly string[]).includes(from ?? '') ? (from as FinaleStage) : 'NONE';
  const weak = params.get('weak') === '1';
  const [bgm, setBgm] = useState<FinaleMusic>(null);
  useEffect(() => audioManager.listenForFirstGesture(), []);
  useEffect(() => {
    if (bgm === 'HUSH') audioManager.fadeOutBgm();
    else if (bgm) audioManager.playBgm(bgm);
    else audioManager.stopBgm();
  }, [bgm]);
  const party = useMemo(
    () => () => [
      ...heroAndKaos({
        heroName: '主人公',
        heroLevel: 1,
        kaosLevel: 1,
        condition: { hero: { currentHp: 100, maxHp: 100 }, kaos: { currentHp: 100, maxHp: 100, currentMp: 48, maxMp: 48 } },
        heroAttack: { min: 8, max: 12 },
        heroSkills: HERO_STARTING_SKILLS,
        kaosMagic: availableMagic(MAGIC_DEFS, { awakened: true }),
      }),
      GRAVE_GUEST,
    ],
    [],
  );
  return (
    <FinaleRun
      stage={start}
      heroName="主人公"
      fights={{
        VALSHEEL_FORM1: { spec: weak ? { ...VALSHEEL_FORM1_PROVISIONAL, hp: 1 } : VALSHEEL_FORM1_PROVISIONAL, artId: 'valsheel' },
        VALSHEEL_FORM2: { spec: weak ? { ...VALSHEEL_FORM2_PROVISIONAL, hp: 1 } : VALSHEEL_FORM2_PROVISIONAL, artId: 'valsheel_form2' },
      }}
      until="STOPPED"
      party={party}
      autoAvailable
      onReach={() => Promise.resolve()}
      onLost={() => Promise.resolve()}
      onMusic={setBgm}
      onPause={() => window.location.assign(window.location.pathname)}
    />
  );
}
