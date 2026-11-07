import { personBySpeaker } from '@mugen/content/story/chapterSummary';

/**
 * WHOM THEY HAVE MET (「あなたの第1章」 — 出会った人): every line that comes up on any screen goes through
 * `sayKaosLine`, and its speaker is noted here; the one listener (App) keeps a `met:<id>` mark for each person of
 * the first chapter heard speaking the first time (content/story/chapterSummary CHAPTER_ONE_PEOPLE). Kaos, the hero
 * and the nameless are never noted.
 */
type Listener = (person: string) => void;
let listener: Listener | null = null;

export function noteSpeaker(speaker: string | null | undefined): void {
  const person = personBySpeaker(speaker);
  if (person && listener) listener(person);
}

/** The one listener; returns how to let go of it. */
export function onPersonMet(l: Listener): () => void {
  listener = l;
  return () => {
    if (listener === l) listener = null;
  };
}
