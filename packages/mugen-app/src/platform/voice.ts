/**
 * THEIR VOICES (2026-10-30 タスクD: ボイス再生の土台).
 *
 * A line that can be spoken has an id — where it is said, and which line — and the table below says which file
 * says it. A file is found by its name in mugen-assets/files/voice/ (read as a folder, as the UI pictures are:
 * put a file there with the name written here and it is heard — no other line to add). An id not in the table,
 * or one whose file is not there yet, is silent, and nothing else changes: no error, no wait, no stand-in.
 *
 * THE IDS, by where they are said:
 *   battle.<skill or spell id>       a cut-in's shout, as it comes in (cutin/skillCutIn.ts, magic/spellCutIn.ts)
 *   op.<scene>                       a page of the opening comic, as it is shown (content/story/openingComic.ts)
 *   op.<scene>.<phase>               a page's later moment (the choice page's 「……なんてね♪」 is `op.SCENE11.SMILE`)
 *   daily.<scene id>.<line no.>      a line of a small thing in the village (content/story/dailyScenes.ts), from 1
 *
 * Heard at the voice volume, which is its own (platform/audio.ts `voice`): neither the music's nor the sounds'.
 */

export type VoiceSpeaker = 'KAOS' | 'HERO';

export interface VoiceLine {
  who: VoiceSpeaker;
  /** The file's name in mugen-assets/files/voice/. */
  file: string;
  /** What is said, for whoever records it (not shown). */
  says: string;
}

/** Line id → who says it and in which file. Not here: silent. */
export const VOICE_LINES: Readonly<Record<string, VoiceLine>> = {
  // 戦闘: 必殺技・技のカットインの叫び。
  'battle.soukyoku_rinkai': { who: 'KAOS', file: 'kaos_battle_soukyoku_rinkai.mp3', says: '《双極臨界》！' },
  'battle.higanbana': { who: 'HERO', file: 'hero_battle_higanbana.mp3', says: '《彼岸花》！' },
  'battle.shundan': { who: 'HERO', file: 'hero_battle_shundan.mp3', says: '《瞬断》！' },
  // 漫画OP: ケイオスの台詞のある頁。
  'op.SCENE11.SMILE': { who: 'KAOS', file: 'kaos_op_scene11_smile.mp3', says: '……なんてね♪' },
  // イベント: 村の小さな出来事（リナの焼き損じパン）。
  'daily.LINA_BURNT_BREAD.4': { who: 'KAOS', file: 'kaos_daily_lina_burnt_bread_4.mp3', says: 'ん、おいしい♪ 焦げてるとこが一番おいしいかも。' },
  'daily.LINA_BURNT_BREAD.6': { who: 'HERO', file: 'hero_daily_lina_burnt_bread_6.mp3', says: '褒めてる。' },
};

/** Where the files are. Read as a folder: the name is the whole of it. */
const delivered = import.meta.glob('../../../mugen-assets/files/voice/*.{mp3,ogg,m4a,wav}', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

const byName = new Map<string, string>();
for (const [path, url] of Object.entries(delivered)) byName.set(path.slice(path.lastIndexOf('/') + 1), url);

/** A debug build's stand-ins (src/dev/voiceDummy.ts): a file by its name, as if it had been delivered. */
export function lendVoiceFiles(files: Readonly<Record<string, string>>): void {
  for (const [name, url] of Object.entries(files)) byName.set(name, url);
}

/** The file that says this line, or null when it is not said (not in the table, or its file not delivered). */
export function voiceUrl(id: string | null | undefined): string | null {
  const line = id ? VOICE_LINES[id] : undefined;
  return (line && byName.get(line.file)) ?? null;
}
