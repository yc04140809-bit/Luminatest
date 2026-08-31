import type { DialogueLine } from './prologue';

// First visit: the player discovers the baker themselves.
// He is 「男」 until the player says his name — no spoilers, no system text.
export const BAKERY_FIRST_VISIT_LINES: DialogueLine[] = [
  { speaker: null, text: '焼きたてのパンの匂いがする。' },
  { speaker: null, text: '奥から、大柄な男がパンを運んでくる。' },
  { speaker: '男', text: 'いらっしゃ――' },
  { speaker: null, text: '男の動きが、止まる。' },
  { speaker: '男', text: '…………' },
  { speaker: '男', text: '……見るな。' },
  { speaker: 'あなた', text: 'ガルド？' },
  { speaker: 'ガルド', text: 'その名前を、店で呼ぶな。' },
];

export const KAOS_AFTER_REUNION_LINE = '「……続き、あったでしょ？」';

/**
 * The end of this playtest, spoken in-world. No "was it fun?", no
 * steering: it names what happened and asks for the player's own words.
 */
export const KAOS_ENDING_LINES: DialogueLine[] = [
  { speaker: 'ケイオス', text: '……どうだった？' },
  { speaker: 'ケイオス', text: 'あの日の選択の“続き”、ちゃんとあったでしょ。' },
  { speaker: 'ケイオス', text: 'ここまで付き合ってくれてありがと。' },
  { speaker: 'ケイオス', text: '最後に、この世界で感じたこと……少しだけ教えて？' },
];

// Revisit: no ceremony, just a man and his bread.
export const BAKERY_REVISIT_LINES: DialogueLine[] = [
  { speaker: 'ガルド', text: '今日は何だ。' },
];
