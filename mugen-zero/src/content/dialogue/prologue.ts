// Prologue + Kaos introduction lines (spec section 9).

export interface DialogueLine {
  speaker: string | null;
  text: string;
}

export const PROLOGUE_LINES: DialogueLine[] = [
  { speaker: null, text: 'あなたが忘れても、世界は覚えている。' },
];

export const KAOS_INTRO_LINES: DialogueLine[] = [
  { speaker: 'ケイオス', text: 'やっと来た。' },
  { speaker: 'ケイオス', text: '……え？ 誰かって？' },
  { speaker: 'ケイオス', text: '女神。' },
  { speaker: 'ケイオス', text: '…………たぶん。' },
  { speaker: 'ケイオス', text: 'ひとつだけ覚えておいて。' },
  { speaker: 'ケイオス', text: 'この世界で出会う人には、みんな続きがあるから。' },
];
