// WHAT THE STATUS SCREEN SAYS ABOUT SOMEBODY, in words.
//
// SEPARATE FROM BOTH of the other two files, and for the same reason
// they are separate from each other: this is writing. It changes when
// the story changes, not when the art changes and not when the battle
// changes, and a screen redesign must not put a writer's line at risk.
//
// EVERY LINE HERE CAME FROM THE AUTHOR'S OWN REFERENCE IMAGES for this
// screen. Nothing is invented: if a character has no line, the field
// is absent and the screen draws nothing rather than filling the gap.
// See `docs/STATUS_SCREEN.md` for what is still owed.

export interface CharacterPresentation {
  characterId: string;
  /** Under the name, as the reference has it. */
  roman: string;
  /**
   * 肩書き. Given by the author, never guessed.
   *
   * Still optional: somebody may join before their title is written,
   * and the screen draws nothing rather than inventing one.
   */
  epithet?: string;
  /** Their own voice. */
  quote?: string;
  /** Who they are, in two or three lines. */
  intro?: string;
  /** How they fight, in prose. The numbers are elsewhere. */
  styleNote?: string;
}

export const CHARACTER_PRESENTATIONS: Record<string, CharacterPresentation> = {
  hero: {
    characterId: 'hero',
    roman: 'Protagonist',
    epithet: '記憶を辿る剣の旅人',
    quote: '「それでも、俺は進む。失ったものも、出会えたものも、すべて抱えて。」',
    intro: '喜びも、哀しみも、俺の中に生きている。',
    styleNote: '確かな剣技と、揺るがない意志で戦う。シンプルだからこそ、あらゆる局面に対応できる。',
  },
  kaos: {
    characterId: 'kaos',
    roman: 'Chaos',
    epithet: '記憶を導く双翼の少女',
    quote: '「ねぇ……キミとなら、きっとどこまででも行けるよね？」',
    intro: '天使でも、悪魔でもないよ。——あたしは、ケイオス。キミと出会ったことで、世界はもっと面白くなったんだ。',
    styleNote: '魔法とアルカナを操る支援・制圧型。不思議な力で戦場を揺らし、味方を導く。',
  },
};

export function presentationOf(characterId: string): CharacterPresentation | null {
  return CHARACTER_PRESENTATIONS[characterId] ?? null;
}
