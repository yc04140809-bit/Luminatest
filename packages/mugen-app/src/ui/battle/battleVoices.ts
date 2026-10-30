import { useEffect, useLayoutEffect, useRef } from 'react';
import type { PartyBattleState } from '@mugen/game/battle/partyBattle';
import { STAR_FEATHER } from '@mugen/content/characters/partyMembers';
import { playVoice } from '../../platform/audio';
import { PINCH_SHARE } from '../../platform/voice';
import type { Blow } from './blows';

/**
 * WHAT THEY SAY IN A FIGHT (2026-10-30 ボイス第1便・第2便, platform/voice.ts) — laid over what the fight already
 * does, as its noises are (battleSounds.ts): nothing here decides, delays or moves anything.
 *
 *   it opens        主人公 「……行くか」, then ケイオス 「さあ――始めようか」 (she only where she fights)
 *   a plain blow    theirs, two takes in turn
 *   a blow on them  「いたっ」 / 「くっ」 — or, the first time it leaves them at PINCH_SHARE or under, the pinch;
 *                   or, if it puts them down, their fall (the fall before the pinch before the hurt)
 *   星癒の羽         hers, as it is cast
 *   a finisher      its cut-in's shout (cutin/CutIn.tsx), its release after the stillness (PartyBattleScreen)
 *   won             the result's (主人公 then ケイオス, whoever is standing)
 * His name is the player's: none of this names him.
 */

type Who = 'hero' | 'kaos';
const VOICED: readonly Who[] = ['hero', 'kaos'];
const isVoiced = (id: string): id is Who => (VOICED as readonly string[]).includes(id);

/** As a fight opens: his word, then hers if she is in it. */
export function startVoices(kaosIn: boolean): string[] {
  return kaosIn ? ['battle.hero.start', 'battle.kaos.start'] : ['battle.hero.start'];
}

/** A won fight's result: whoever of the two is standing, his word first. */
export function winVoices(standing: { hero: boolean; kaos: boolean }): string[] {
  return [...(standing.hero ? ['battle.hero.win'] : []), ...(standing.kaos ? ['battle.kaos.win'] : [])];
}

/** A blow taken by one of them (or the one they fight): their fall, their first pinch, or their hurt. `pinched`: already said. */
export function hurtVoice(who: string, hp: number, maxHp: number, pinched: boolean): { id: string; pinch: boolean } {
  if (hp <= 0) return { id: `battle.${who}.down`, pinch: false };
  if (!pinched && maxHp > 0 && hp <= maxHp * PINCH_SHARE) return { id: `battle.${who}.pinch`, pinch: true };
  return { id: `battle.${who}.hurt`, pinch: false };
}

/**
 * What one beat of the three's fight says (null: nothing) and whose pinch it was, from the state before it and
 * after. A blow on two of them at once: the one hit hardest in meaning (a fall, then a pinch, then a hurt; his
 * first when alike) — one voice at a time.
 */
export function partyBeatVoice(
  before: PartyBattleState,
  next: PartyBattleState,
  pinched: ReadonlySet<string>,
): { id: string; pinch?: Who } | null {
  const beat = next.last;
  if (!beat) return null;
  if (isVoiced(beat.actor)) {
    if (beat.kind === 'ATTACK') return { id: `battle.${beat.actor}.attack` };
    if (beat.kind === 'TECH' && beat.actor === 'kaos' && beat.name === STAR_FEATHER.name) return { id: `battle.${STAR_FEATHER.id}` };
    return null;
  }
  if (beat.kind !== 'ENEMY_ATTACK' || beat.missed) return null;
  const rank = { down: 3, pinch: 2, hurt: 1 } as const;
  let best: { id: string; pinch?: Who; rank: number } | null = null;
  for (const who of VOICED) {
    const was = before.members.find((m) => m.id === who);
    const now = next.members.find((m) => m.id === who);
    if (!was || !now || was.down || now.hp >= was.hp) continue;
    const said = hurtVoice(who, now.down ? 0 : now.hp, now.maxHp, pinched.has(who));
    const r = rank[said.id.slice(said.id.lastIndexOf('.') + 1) as keyof typeof rank];
    if (!best || r > best.rank) best = { id: said.id, ...(said.pinch ? { pinch: who } : {}), rank: r };
  }
  return best ? { id: best.id, ...(best.pinch ? { pinch: best.pinch } : {}) } : null;
}

/**
 * The fight of one (BattleStage): he swings, he is struck, it opens. She casts there, and is not struck — her
 * spells' shouts are their cut-ins'. His skill's swing is its cut-in's, not a plain blow's. The one they fight
 * speaks too where it has lines (ガルド, by his art id — `battle.gald.*`): his own mouth, so his 「おらっ！」 and
 * the hero's 「くっ……」 are both heard. As it opens: his word first (he is the one who starts it), then theirs.
 */
export function useBattleVoices({
  beat,
  blows,
  hp,
  maxHp,
  kaosIn,
  skillSwing,
  foe,
  foeHp,
  foeMaxHp,
}: {
  beat: string;
  blows: readonly Blow[];
  hp: number;
  maxHp: number;
  kaosIn: boolean;
  skillSwing: boolean;
  /** The one they fight, by its art id. */
  foe: string;
  foeHp: number;
  foeMaxHp: number;
}) {
  // Once, even where an effect is run twice.
  const opened = useRef(false);
  useEffect(() => {
    if (opened.current) return;
    opened.current = true;
    // On the foe's mouth: his taunt is not cut by their first blow (their own lines in it are, by any of theirs).
    playVoice([`battle.${foe}.start`, ...startVoices(kaosIn)], { mouth: 'foe' });
  }, []);
  useLayoutEffect(() => {
    if (beat === 'STRIKE' && !skillSwing) playVoice('battle.hero.attack');
    if (beat === 'TACKLE') playVoice(`battle.${foe}.attack`, { mouth: 'foe' });
  }, [beat]);
  const heard = useRef(0);
  const pinched = useRef(false);
  const foePinched = useRef(false);
  useLayoutEffect(() => {
    for (const blow of blows) {
      if (blow.id <= heard.current) continue;
      heard.current = blow.id;
      if (blow.amount <= 0) continue;
      if (blow.on === 'hero') {
        const said = hurtVoice('hero', hp, maxHp, pinched.current);
        if (said.pinch) pinched.current = true;
        playVoice(said.id);
      } else {
        const said = hurtVoice(foe, foeHp, foeMaxHp, foePinched.current);
        if (said.pinch) foePinched.current = true;
        playVoice(said.id, { mouth: 'foe' });
      }
    }
  }, [blows]);
}
