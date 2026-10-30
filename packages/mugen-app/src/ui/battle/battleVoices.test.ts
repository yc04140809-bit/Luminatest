import { describe, it, expect } from 'vitest';
import type { PartyBattleState, PartyBeat, PartyMember } from '@mugen/game/battle/partyBattle';
import { hurtVoice, partyBeatVoice, startVoices, winVoices } from './battleVoices';

const member = (id: string, hp: number, maxHp = 100, down = false) => ({ id, hp, maxHp, down }) as unknown as PartyMember;
const fight = (members: PartyMember[], last: Partial<PartyBeat> | null = null) =>
  ({ members, last: last ? ({ amount: 0, read: 'PLAIN', target: '', ...last } as PartyBeat) : null }) as unknown as PartyBattleState;

describe('what they say in a fight (ボイス第1便・第2便)', () => {
  it('it opens: his word, then hers where she fights; won: whoever is standing, his first', () => {
    expect(startVoices(true)).toEqual(['battle.hero.start', 'battle.kaos.start']);
    expect(startVoices(false)).toEqual(['battle.hero.start']);
    expect(winVoices({ hero: true, kaos: true })).toEqual(['battle.hero.win', 'battle.kaos.win']);
    expect(winVoices({ hero: false, kaos: true })).toEqual(['battle.kaos.win']);
  });

  it('a blow taken: the fall, then the first pinch (30% or under), then the hurt', () => {
    expect(hurtVoice('kaos', 0, 100, false)).toEqual({ id: 'battle.kaos.down', pinch: false });
    expect(hurtVoice('kaos', 30, 100, false)).toEqual({ id: 'battle.kaos.pinch', pinch: true });
    expect(hurtVoice('kaos', 30, 100, true)).toEqual({ id: 'battle.kaos.hurt', pinch: false });
    expect(hurtVoice('hero', 31, 100, false)).toEqual({ id: 'battle.hero.hurt', pinch: false });
  });

  it('the one they fight, by its art id: ガルド’s hurt, his pinch, his fall', () => {
    expect(hurtVoice('gald', 60, 100, false).id).toBe('battle.gald.hurt');
    expect(hurtVoice('gald', 20, 100, false)).toEqual({ id: 'battle.gald.pinch', pinch: true });
    expect(hurtVoice('gald', 0, 100, true).id).toBe('battle.gald.down');
  });

  it('the three’s beats: a plain blow of theirs, 星癒の羽, a blow on them; グレイヴ, a skill, a miss say nothing', () => {
    const party = [member('hero', 100), member('kaos', 100), member('grave', 180)];
    const none = new Set<string>();
    expect(partyBeatVoice(fight(party), fight(party, { actor: 'kaos', kind: 'ATTACK' }), none)).toEqual({ id: 'battle.kaos.attack' });
    expect(partyBeatVoice(fight(party), fight(party, { actor: 'hero', kind: 'ATTACK' }), none)).toEqual({ id: 'battle.hero.attack' });
    expect(partyBeatVoice(fight(party), fight(party, { actor: 'kaos', kind: 'TECH', name: '星癒の羽' }), none)).toEqual({ id: 'battle.star_feather' });
    expect(partyBeatVoice(fight(party), fight(party, { actor: 'grave', kind: 'ATTACK' }), none)).toBeNull();
    // A finisher's shout is its cut-in's.
    expect(partyBeatVoice(fight(party), fight(party, { actor: 'kaos', kind: 'SKILL', name: '双極臨界' }), none)).toBeNull();
    const struck = [member('hero', 100), member('kaos', 60), member('grave', 180)];
    expect(partyBeatVoice(fight(party), fight(struck, { actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'kaos', amount: 40 }), none)).toEqual({ id: 'battle.kaos.hurt' });
    expect(partyBeatVoice(fight(party), fight(party, { actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'kaos', missed: true }), none)).toBeNull();
  });

  it('a blow on two at once: the one it means most for — her fall over his hurt', () => {
    const before = [member('hero', 100), member('kaos', 20)];
    const after = [member('hero', 80), member('kaos', 0, 100, true)];
    expect(partyBeatVoice(fight(before), fight(after, { actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero' }), new Set())).toEqual({ id: 'battle.kaos.down' });
    const low = [member('hero', 25), member('kaos', 90)];
    expect(partyBeatVoice(fight(before.map((m) => member(m.id, 100))), fight(low, { actor: 'enemy', kind: 'ENEMY_ATTACK', target: 'hero' }), new Set())).toEqual({
      id: 'battle.hero.pinch',
      pinch: 'hero',
    });
  });
});
