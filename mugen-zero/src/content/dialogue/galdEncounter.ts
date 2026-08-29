import type { DialogueLine } from './prologue';
import type { LifeChoiceId } from '../../core/flow/types';

// First encounter in Greenwood Forest. Gald is still an unknown bandit.
export const GALD_ENCOUNTER_LINES: DialogueLine[] = [
  { speaker: '盗賊', text: '……止まれ。' },
  { speaker: '盗賊', text: '金を置いていけ。命までは取らねぇ。' },
];

export const LIFE_CHOICE_PROMPT = '彼の人生を、どうしますか？';

export interface LifeChoiceOption {
  id: LifeChoiceId;
  label: string;
  sub: string;
}

export const LIFE_CHOICE_OPTIONS: LifeChoiceOption[] = [
  { id: 'KILL', label: 'とどめを刺す', sub: 'KILL' },
  { id: 'SPARE', label: '見逃す', sub: 'SPARE' },
  { id: 'HELP', label: '傷を治療する', sub: 'HELP' },
  { id: 'CAPTURE', label: '衛兵へ引き渡す', sub: 'CAPTURE' },
];

// Immediate aftermath lines shown on the choice result screen.
export const CHOICE_RESULT_LINES: Record<LifeChoiceId, DialogueLine[]> = {
  SPARE: [
    { speaker: '盗賊', text: '俺はお前を殺そうとしたんだぞ。' },
    { speaker: '盗賊', text: '……馬鹿じゃねぇのか。' },
    { speaker: null, text: '男は森の奥へと消えていった。' },
  ],
  KILL: [
    { speaker: null, text: '男は動かなくなった。' },
    { speaker: null, text: '懐から、古い手紙のようなものが覗いている。' },
  ],
  HELP: [
    { speaker: '盗賊', text: '……なんのつもりだ。' },
    { speaker: null, text: '男は傷の手当てを黙って受けた。' },
  ],
  CAPTURE: [
    { speaker: null, text: '男は縄をかけられ、村の衛兵に引き渡された。' },
    { speaker: null, text: '最後まで、一言も話さなかった。' },
  ],
};
