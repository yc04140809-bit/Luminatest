import { useEffect, useMemo, useState } from 'react';
import { specOf } from '@mugen/game/battle/enemySpec';
import { availableMagic } from '@mugen/core/magic/magic';
import { MOSS_RABBIT } from '@mugen/content/enemies/species';
import { SEKIRYUGA_BATTLE } from '@mugen/content/enemies/sekiryugaBattle';
import { MAGIC_DEFS } from '@mugen/content/magic/magicDefs';
import { HERO_STARTING_SKILLS } from '@mugen/content/skills/heroSkills';
import { GRAVE_GUEST, heroAndKaos } from '@mugen/content/characters/partyMembers';
import { battleBackgroundFor } from '@mugen/content/locations/battleBackgrounds';
import { PartyBattleScreen } from '../ui/battle/PartyBattleScreen';
import { audioManager } from '../platform/audio';

/**
 * THE PARTY FIGHT, TRIED ON ITS OWN (戦闘方式 B, 2026-10-12) — debug builds
 * only, from the title's DEBUG chip (「3人戦闘」) or by URL:
 *
 *   ?preview=party                 主人公・ケイオス・グレイヴ vs セキリュウガ (its numbers)
 *   &enemy=moss_rabbit             vs the forest's moss rabbit
 *   &hurt=1                        the hero and Grave start hurt (for the heals)
 *
 * Reads and writes nothing of the world: level-1 numbers, Kaos awake (her
 * spells), Grave as he comes for a while (provisional). ヴァルシール's own
 * fight will start this same screen with the world's numbers.
 */
export function PartyBattlePreview({ params }: { params: URLSearchParams }) {
  const [round, setRound] = useState(0);
  const rabbit = params.get('enemy') === 'moss_rabbit';
  const hurt = params.get('hurt') === '1';
  const members = useMemo(
    () => [
      ...heroAndKaos({
        heroName: '主人公',
        heroLevel: 1,
        kaosLevel: 1,
        condition: {
          hero: { currentHp: hurt ? 40 : 100, maxHp: 100 },
          kaos: { currentHp: 100, maxHp: 100, currentMp: 48, maxMp: 48 },
        },
        heroAttack: { min: 8, max: 12 },
        heroSkills: HERO_STARTING_SKILLS,
        kaosMagic: availableMagic(MAGIC_DEFS, { awakened: true }),
      }),
      hurt ? { ...GRAVE_GUEST, hp: 60 } : GRAVE_GUEST,
    ],
    [hurt],
  );
  useEffect(() => {
    audioManager.listenForFirstGesture();
    audioManager.playBgm('BOSS_BATTLE');
  }, []);
  const [ended, setEnded] = useState<string | null>(null);
  if (ended) {
    return (
      <div className="screen" data-testid="pb-preview-ended">
        <p>{ended === 'VICTORY' ? '勝利しました。' : '敗北しました。'}</p>
        <button
          className="btn primary"
          data-testid="pb-preview-again"
          onClick={() => {
            setEnded(null);
            setRound((r) => r + 1);
          }}
        >
          もう一度
        </button>
        <button className="btn" onClick={() => window.location.assign(window.location.pathname)}>
          タイトルへ
        </button>
      </div>
    );
  }
  return (
    <PartyBattleScreen
      key={round}
      members={members}
      enemy={rabbit ? specOf(MOSS_RABBIT) : SEKIRYUGA_BATTLE}
      enemyArtId={rabbit ? 'moss_rabbit' : 'sekiryuga'}
      background={battleBackgroundFor('GREENWOOD_FOREST')}
      onEnd={(r) => setEnded(r.outcome)}
    />
  );
}
