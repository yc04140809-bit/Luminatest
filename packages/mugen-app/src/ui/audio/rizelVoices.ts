import type { LifeChoiceId } from '@mugen/core/flow/types';

/**
 * リゼル'S VOICE IN THE VILLAGE (2026-10-31, ボイス第9便 日常追加版 — 作者の配線ルール).
 *
 * She changes. At first she is curt — the village scenes' own words are hers then, and are the truth of her
 * then. What was done about Gald changes how she sees people; after it she is easier to be with, and her
 * recorded everyday lines (platform/voice.ts `event.rizel.daily01〜05`, bright) are hers from then on — never
 * before. So nothing here sounds until the four answers have been given (`galdChoice` set).
 *
 * WHERE, by the scene and its line (from 0) — only where a line of hers fits what is happening and says nothing
 * against the words on screen:
 *   RIZEL_FIRST_AID, as it opens   daily03 「怪我してない？ ちゃんと見せて」 — she kneels to the child's knee
 *                                  (a scene of tending: 作者 — 手当ての場面で使用可)
 * The other four (daily01 greeting, 02 sword practice, 04 relief, 05 bashful) wait for the scenes they belong
 * to; each is one line here.
 */
export const RIZEL_SCENE_VOICES: Readonly<Record<string, { at: number; id: string }>> = {
  RIZEL_FIRST_AID: { at: 0, id: 'event.rizel.daily03' },
};

/** Whether her everyday lines are hers yet: after the four answers about Gald. */
export function rizelDailyUnlocked(galdChoice: LifeChoiceId | null): boolean {
  return galdChoice !== null;
}

/** Her line for this scene's line, if it has one and it is hers yet; else null. */
export function rizelSceneVoice(sceneId: string, at: number, galdChoice: LifeChoiceId | null): string | null {
  const said = RIZEL_SCENE_VOICES[sceneId];
  return said && said.at === at && rizelDailyUnlocked(galdChoice) ? said.id : null;
}
