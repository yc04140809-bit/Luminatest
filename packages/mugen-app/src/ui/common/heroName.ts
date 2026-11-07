/**
 * HIS NAME IN THE NARRATION (作者 2026-11-05): a line of narration that speaks of the hero writes him as `{HERO}`
 * — the same mark a speaker is written with — and is shown with the name the player gave him. Until the player
 * names him, 「主人公」. What is looked up for a voice stays the line as written.
 */
export const HERO_IN_TEXT = '{HERO}';

export function withHeroName(text: string, heroName: string): string {
  return text.includes(HERO_IN_TEXT) ? text.split(HERO_IN_TEXT).join(heroName) : text;
}
