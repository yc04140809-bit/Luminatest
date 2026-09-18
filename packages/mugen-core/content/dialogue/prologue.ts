// Prologue + Kaos introduction lines (spec section 9).

export interface DialogueLine {
  speaker: string | null;
  text: string;
  /**
   * WHETHER THE AIR HAS GONE TIGHT on this line — 臨戦.
   *
   * A line says how it FEELS, not which picture to draw. Anger, guard,
   * a serious declaration, the beat before a fight: mark it, and Kaos
   * is drawn with her 臨戦 art instead of her ordinary talking one. The
   * scene never names a drawing, so the day 臨戦 is re-drawn, or a
   * third level of tension exists, no line of dialogue changes.
   *
   * Absent means calm, which is what nearly every line is — and it is
   * why the opening needs no marking to come out right.
   */
  tense?: boolean;
}

export const PROLOGUE_LINES: DialogueLine[] = [
  // The break is written here on purpose: Japanese wraps anywhere, and
  // left to itself this line ends with a stranded 「る。」 on its own row.
  { speaker: null, text: 'あなたが忘れても、\n世界は覚えている。' },
];

export const KAOS_INTRO_LINES: DialogueLine[] = [
  { speaker: 'ケイオス', text: 'やっと来た。' },
  { speaker: 'ケイオス', text: '……え？ 誰かって？' },
  { speaker: 'ケイオス', text: '女神。' },
  { speaker: 'ケイオス', text: '…………たぶん。' },
  { speaker: 'ケイオス', text: 'ひとつだけ覚えておいて。' },
  { speaker: 'ケイオス', text: 'この世界で出会う人には、みんな続きがあるから。' },
];
