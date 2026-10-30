/**
 * THEIR VOICES (2026-10-30 タスクD: ボイス再生の土台; ケイオス分 第1便 21本 2026-10-30).
 *
 * A line that can be spoken has an id — where it is said, and which line — and the table below says which file
 * (or files) say it. A file is found by its name in mugen-assets/files/voice/ (read as a folder, as the UI pictures
 * are: put a file there with the name written here and it is heard — no other line to add). An id not in the table,
 * or one whose files are not there yet, is silent, and nothing else changes: no error, no wait, no stand-in.
 *
 * THE IDS, by where they are said:
 *   op.<page image>                  a page of the opening comic, as it is shown — its lines one after another
 *                                    (content/story/openingComic.ts; a page of three panels says all three)
 *   op.<page image>.SMILE            the choice page's 「……なんてね♪」
 *   battle.<who>.start               a fight they are in, as it opens (主人公 then ケイオス, one after the other)
 *   battle.<who>.attack              a plain blow of theirs (two takes, in turn)
 *   battle.<who>.hurt                a blow on them (takes in turn)
 *   battle.<who>.pinch               the first time in a fight they are brought low (PINCH_SHARE of their health)
 *   battle.<who>.down                they fall
 *   battle.<who>.win                 a won fight's result, they standing (主人公 then ケイオス)
 *     <who> is `hero` (主人公 — the player names him: his name is never written here) or `kaos`
 *   battle.<foe>.start|attack|hurt|pinch|down   the one they fight, by its art id (ガルド `gald`, 第3便; his
 *                                    file names are ids only — on screen he stays 「盗賊」 until found again)
 *   battle.<skill, spell or technique id>   its cut-in's shout, or its own moment (星癒の羽 `star_feather`)
 *   battle.<id>.release              a finisher's second line, at its release (《双極臨界》's 界核崩壊)
 *   daily.<scene id>.<line no.>      a line of a small thing in the village (content/story/dailyScenes.ts), from 1
 *
 * Heard at the voice volume, which is its own (platform/audio.ts `voice`): neither the music's nor the sounds'.
 */

export type VoiceSpeaker = 'KAOS' | 'HERO' | 'GALD';

export interface VoiceLine {
  who: VoiceSpeaker;
  /** The files' names in mugen-assets/files/voice/. */
  files: readonly string[];
  /** Several files: one after another (`SEQUENCE`, a page's lines) or one of them in turn (`ALTERNATE`, takes). */
  play?: 'SEQUENCE' | 'ALTERNATE';
  /** What is said, for whoever records it (not shown). */
  says: string;
}

/** Her health at or under this share of its most: in a pinch. */
export const PINCH_SHARE = 0.3;

const kaos = (files: readonly string[], says: string, play?: VoiceLine['play']): VoiceLine => ({ who: 'KAOS', files, says, ...(play ? { play } : {}) });
const gald = (files: readonly string[], says: string): VoiceLine => ({ who: 'GALD', files, says });
const hero = (files: readonly string[], says: string, play?: VoiceLine['play']): VoiceLine => ({ who: 'HERO', files, says, ...(play ? { play } : {}) });

/** Line id → who says it and in which files. Not here: silent. */
export const VOICE_LINES: Readonly<Record<string, VoiceLine>> = {
  // ---- 漫画式オープニング（パネル順。1ページの台詞は続けて） ----
  'op.op_01_intro_comic': kaos(['v_op_chaos01.mp3', 'v_op_chaos02.mp3', 'v_op_chaos03.mp3'], '……あ！／起きた？／遅いぞ〜？', 'SEQUENCE'),
  'op.op_02_warning_comic': kaos(['v_op_chaos04.mp3', 'v_op_chaos05.mp3', 'v_op_chaos06.mp3'], 'あ、そうそう／連打は後悔するよ？／たぶん♪', 'SEQUENCE'),
  'op.op_03_sorejaa': kaos(['v_op_chaos07.mp3'], 'それじゃあ…'),
  'op.op_05_doushitano': kaos(['v_op_chaos08.mp3'], 'ん？ どうしたの？'),
  'op.op_06_jitsuwane': kaos(['v_op_chaos09.mp3'], 'じつはね…'),
  'op.op_flash_01b_doushitano': kaos(['v_op_chaos10.mp3'], 'どうしたの？'),
  'op.op_choice_comic.SMILE': kaos(['kaos_op_choice_smile.mp3'], '……なんてね♪'),
  // ---- 戦闘（ケイオス） ----
  'battle.kaos.start': kaos(['v_chaos_start01.mp3'], 'さあ――始めようか'),
  'battle.kaos.attack': kaos(['v_chaos_atk01.mp3', 'v_chaos_atk02.mp3'], 'くらえっ／そこっ！', 'ALTERNATE'),
  'battle.kaos.hurt': kaos(['v_chaos_dmg01.mp3', 'v_chaos_dmg02.mp3'], 'いたっ……！／まだまだ……！', 'ALTERNATE'),
  'battle.kaos.pinch': kaos(['v_chaos_pinch01.mp3'], 'ちょっと、まずいかも……'),
  'battle.kaos.down': kaos(['v_chaos_down01.mp3'], 'ごめん……ここまで、かな……'),
  'battle.kaos.win': kaos(['v_chaos_win01.mp3'], 'ふふっ、うちの勝ちだね'),
  // 星癒の羽（読みは正本どおり「セイユノハネ」）。
  'battle.star_feather': kaos(['v_chaos_heal01.mp3'], 'セイユノハネ――癒してあげる'),
  // 《双極臨界》: the cut-in (its pull), then — after the stillness — its release.
  'battle.soukyoku_rinkai': kaos(['v_chaos_finisher01.mp3'], '双極臨界――吸いなさい、全部'),
  'battle.soukyoku_rinkai.release': kaos(['v_chaos_finisher02.mp3'], '……界核崩壊'),
  // ---- 戦闘（主人公） ----
  'battle.hero.start': hero(['v_hero_start01.mp3'], '……行くか'),
  'battle.hero.attack': hero(['v_hero_atk01.mp3', 'v_hero_atk02.mp3'], 'はっ／斬る', 'ALTERNATE'),
  'battle.hero.hurt': hero(['v_hero_dmg01.mp3'], 'くっ……'),
  'battle.hero.pinch': hero(['v_hero_pinch01.mp3'], 'まだだ……まだ立てる'),
  'battle.hero.down': hero(['v_hero_down01.mp3'], 'すまない……先に、行ってくれ……'),
  'battle.hero.win': hero(['v_hero_win01.mp3'], '……終わったか'),
  // 《彼岸花》: the cut-in, then — after its stillness — its release.
  'battle.higanbana': hero(['v_hero_finisher01.mp3'], '彼岸花――'),
  'battle.higanbana.release': hero(['v_hero_finisher02.mp3'], '散れ'),
  // 《瞬断》: none yet (silent).
  'battle.shundan': hero(['hero_battle_shundan.mp3'], '《瞬断》！'),
  // ---- 戦闘（ガルド — ボス戦。四択の台詞は未収録） ----
  'battle.gald.start': gald(['v_gard_start01.mp3'], 'へっ、やるってのか'),
  'battle.gald.attack': gald(['v_gard_atk01.mp3'], 'おらっ！'),
  'battle.gald.hurt': gald(['v_gard_dmg01.mp3'], 'ぐっ……！'),
  'battle.gald.pinch': gald(['v_gard_pinch01.mp3'], 'エルナが……待ってるんだ……！'),
  'battle.gald.down': gald(['v_gard_down01.mp3'], 'エルナ……すま、ねぇ……'),
  // ---- イベント（村の小さな出来事。未納品） ----
  'daily.LINA_BURNT_BREAD.4': kaos(['kaos_daily_lina_burnt_bread_4.mp3'], 'ん、おいしい♪ 焦げてるとこが一番おいしいかも。'),
  'daily.LINA_BURNT_BREAD.6': hero(['hero_daily_lina_burnt_bread_6.mp3'], '褒めてる。'),
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

/** How many times each ALTERNATE line has been said, for its next take. */
const turns = new Map<string, number>();

/**
 * What is heard for this line, in order: its delivered files (a page's lines one after another), one of them for a
 * line of takes (each in turn), or nothing — not in the table, or nothing of it delivered.
 */
export function voicePlan(id: string | null | undefined): string[] {
  const line = id ? VOICE_LINES[id] : undefined;
  if (!line || !id) return [];
  const urls = line.files.map((f) => byName.get(f)).filter((u): u is string => !!u);
  if (urls.length === 0) return [];
  if (line.play !== 'ALTERNATE') return urls;
  const n = turns.get(id) ?? 0;
  turns.set(id, n + 1);
  return [urls[n % urls.length]];
}

/** Who says the file at this url (for a mouth that must not speak over its own side), or null. */
export function voiceSpeakerOf(url: string): VoiceSpeaker | null {
  for (const line of Object.values(VOICE_LINES)) if (line.files.some((f) => byName.get(f) === url)) return line.who;
  return null;
}

/** The first file heard for this line, or null when it is not said (kept for the table's own checks). */
export function voiceUrl(id: string | null | undefined): string | null {
  const line = id ? VOICE_LINES[id] : undefined;
  return (line && line.files.map((f) => byName.get(f)).find((u) => !!u)) ?? null;
}
