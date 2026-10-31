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
 *   battle.<move id>.release         a move's second line, out of its stillness (《双極臨界》, 《彼岸花》, 重撃・豪断)
 *   shop.<shop id>.welcome|thanks|touch   a shop's keeper: walked in (one of theirs at random), walked out to the
 *                                    village, touched (ui/audio/shopVoices.ts; ALDEN_BAKERY リナ, ALDEN_ITEM_SHOP ミレイ)
 *   talk.<who>.<moment>              a keeper's word as a talk goes (グレイヴ in the tavern: ui/tavern.tsx)
 *   event.<who>.<name>               a line for an event whose moment is still to be set (registered only)
 *   daily.<scene id>.<line no.>      a line of a small thing in the village (content/story/dailyScenes.ts), from 1
 *
 * A member of the fight speaks where the table has lines for them (`battle.<member id>.start` …): 主人公, ケイオス,
 * グレイヴ now; レヴィ, アリア, リゼル as soon as they fight beside them (their lines are here already). レヴィ's and
 * アリア's finishers are named here by provisional ids (`meisou_kokusou`, `tenkyuu_aobara`) until their moves exist.
 *
 * Heard at the voice volume, which is its own (platform/audio.ts `voice`): neither the music's nor the sounds'.
 */

export type VoiceSpeaker = 'KAOS' | 'HERO' | 'GALD' | 'GRAVE' | 'LEVI' | 'ARIA' | 'RIZEL' | 'LINA' | 'MIREI';

export interface VoiceLine {
  who: VoiceSpeaker;
  /** The files' names in mugen-assets/files/voice/. */
  files: readonly string[];
  /**
   * Several files: one after another (`SEQUENCE`, a page's lines), one of them in turn (`ALTERNATE`, takes), or
   * one of them at random but never the one said last (`RANDOM`, a shop's welcomes).
   */
  play?: 'SEQUENCE' | 'ALTERNATE' | 'RANDOM';
  /** Louder than recorded, in dB (a whispered take — リゼル's win and fall — that the music would bury). */
  gainDb?: number;
  /** What is said, for whoever records it (not shown). */
  says: string;
}

/** Her health at or under this share of its most: in a pinch. */
export const PINCH_SHARE = 0.3;

const kaos = (files: readonly string[], says: string, play?: VoiceLine['play']): VoiceLine => ({ who: 'KAOS', files, says, ...(play ? { play } : {}) });
const gald = (files: readonly string[], says: string): VoiceLine => ({ who: 'GALD', files, says });
const by = (who: VoiceSpeaker) => (files: readonly string[], says: string, more: Partial<VoiceLine> = {}): VoiceLine => ({ who, files, says, ...more });
const grave = by('GRAVE');
const levi = by('LEVI');
const aria = by('ARIA');
const rizel = by('RIZEL');
const lina = by('LINA');
const mirei = by('MIREI');
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
  // ---- 戦闘（グレイヴ — 第8便） ----
  'battle.grave.start': grave(['v_grave_start01.mp3'], '（戦闘開始）'),
  'battle.grave.attack': grave(['v_grave_atk01.mp3', 'v_grave_atk02.mp3'], '（通常攻撃 1・2）', { play: 'ALTERNATE' }),
  'battle.grave.hurt': grave(['v_grave_dmg01.mp3'], '（被弾）'),
  'battle.grave.pinch': grave(['v_grave_pinch01.mp3'], '（ピンチ）'),
  'battle.grave.down': grave(['v_grave_down01.mp3'], '（戦闘不能）'),
  'battle.grave.win': grave(['v_grave_win01.mp3'], '（勝利）'),
  // 重撃・豪断: its cut-in, then — as its blow comes down — its release.
  'battle.goudan': grave(['v_grave_finisher01.mp3'], '（必殺カットイン）'),
  'battle.goudan.release': grave(['v_grave_finisher02.mp3'], '（必殺・放出）'),
  // ---- 戦闘（レヴィ — 第6便。第2章で加入：それまで鳴らない） ----
  'battle.levi.start': levi(['v_levi_start01.mp3'], '退くなら今のうちだ'),
  'battle.levi.attack': levi(['v_levi_atk01.mp3'], '貫け'),
  'battle.levi.hurt': levi(['v_levi_dmg01.mp3'], 'ちっ……'),
  'battle.levi.pinch': levi(['v_levi_pinch01.mp3'], 'この程度で……！'),
  'battle.levi.down': levi(['v_levi_down01.mp3'], 'ここまで、か……'),
  'battle.levi.win': levi(['v_levi_win01.mp3'], 'ふん、当然だ'),
  'battle.levi.care': levi(['v_levi_care01.mp3'], '……助かった、とは言わないからな'),
  'battle.meisou_kokusou': levi(['v_levi_finisher01.mp3'], '冥槍・黒葬封界――'),
  'battle.meisou_kokusou.release': levi(['v_levi_finisher02.mp3'], '葬れ！'),
  // ---- 戦闘（アリア — 第7便。登場・加入は未定：それまで鳴らない） ----
  'battle.aria.start': aria(['v_aria_start01.mp3'], '参ります'),
  'battle.aria.attack': aria(['v_aria_atk01.mp3'], '射ちます！'),
  'battle.aria.hurt': aria(['v_aria_dmg01.mp3'], 'くっ……！'),
  'battle.aria.pinch': aria(['v_aria_pinch01.mp3'], 'ま、まだ……！'),
  'battle.aria.down': aria(['v_aria_down01.mp3'], 'ごめん、なさい……'),
  'battle.aria.win': aria(['v_aria_win01.mp3'], 'よかった……皆、無事ですね'),
  'battle.aria.care': aria(['v_aria_care01.mp3'], 'あ、ありがとうございます……！'),
  'battle.tenkyuu_aobara': aria(['v_aria_finisher01.mp3'], '天弓・蒼薔薇祝界――'),
  'battle.tenkyuu_aobara.release': aria(['v_aria_finisher02.mp3'], '祝い、放ちます！'),
  // ---- 戦闘（リゼル — 第9便。戦闘への参加は未定：それまで鳴らない。win・down は小声のテイク：+11dB） ----
  'battle.rizel.start': rizel(['v_rizel_start01.mp3'], 'わ、私だって戦えます！'),
  'battle.rizel.attack': rizel(['v_rizel_atk01.mp3'], 'やっ！'),
  'battle.rizel.hurt': rizel(['v_rizel_dmg01.mp3'], 'きゃっ……！'),
  'battle.rizel.pinch': rizel(['v_rizel_pinch01.mp3'], 'まだ……倒れるわけには……'),
  'battle.rizel.win': rizel(['v_rizel_win01.mp3'], 'や、やった……？', { gainDb: 11 }),
  'battle.rizel.down': rizel(['v_rizel_down01.mp3'], 'ごめんなさい……私、まだ……', { gainDb: 11 }),
  // ---- 店（第4便 リナ＝パン屋、第5便 ミレイ＝道具屋） ----
  'shop.ALDEN_BAKERY.welcome': lina(['v_lina_welcome01.mp3', 'v_lina_welcome02.mp3', 'v_lina_welcome03.mp3'], 'いらっしゃいませ〜！／いらっしゃい！ 焼きたてだよ！／あっ、待ってたよ！', { play: 'RANDOM' }),
  'shop.ALDEN_BAKERY.thanks': lina(['v_lina_thanks01.mp3'], 'ありがとね！ また来てね！'),
  'shop.ALDEN_ITEM_SHOP.welcome': mirei(['v_mirei_welcome01.mp3', 'v_mirei_welcome02.mp3', 'v_mirei_welcome03.mp3'], 'あら、いらっしゃい／いい品、揃ってるわよ／ふふ、目利きね', { play: 'RANDOM' }),
  'shop.ALDEN_ITEM_SHOP.thanks': mirei(['v_mirei_thanks01.mp3'], '毎度あり。また来てね'),
  'shop.ALDEN_ITEM_SHOP.touch': mirei(['v_mirei_touch01.mp3', 'v_mirei_touch02.mp3'], 'あら、なあに？／ふふ、買ってくれるなら許すわ', { play: 'RANDOM' }),
  // ---- 酒場（グレイヴ — 第8便 日常追加版）：話しかけたときの反応、会話の中身に合わせて ----
  // His plain greeting, as it begins (会話開始).
  'talk.grave.greeting': grave(['v_grave_daily01.mp3'], 'おう、よく来たな'),
  // The same, but 主人公 comes in hurt (half his health or under): his worry instead (作者 2026-10-31).
  'talk.grave.hurt': grave(['v_grave_daily02.mp3'], '無理すんなよ。飯は食ったか？'),
  // After セキリュウガ was stopped, told to its end: his laugh.
  'talk.grave.after_sekiryuga': grave(['v_grave_daily03.mp3'], 'はっはっは、それでこそだ'),
  // The old greatsword (his own past), told to its end.
  'talk.grave.greatsword': grave(['v_grave_daily04.mp3'], '……昔の話だ。気にするな'),
  // ---- 村（リゼル — 第9便 日常追加版）：ガルドの四択の後だけ（ui/audio/rizelVoices.ts）。daily05 は小声：+9dB ----
  'event.rizel.daily01': rizel(['v_rizel_daily01.mp3'], 'こんにちは！ 今日は森に行くの？'),
  'event.rizel.daily02': rizel(['v_rizel_daily02.mp3'], '私も剣の練習、頑張ってるんだ。……まだまだだけど'),
  'event.rizel.daily03': rizel(['v_rizel_daily03.mp3'], '怪我してない？ ちゃんと見せて'),
  'event.rizel.daily04': rizel(['v_rizel_daily04.mp3'], 'よかった、無事で……本当に心配したんだから'),
  'event.rizel.daily05': rizel(['v_rizel_daily05.mp3'], 'あ、ありがとう。……えへへ', { gainDb: 9 }),
  // ---- 会話（レヴィ — 第6便 日常追加版。登録のみ：第2章の会話で使う想定） ----
  'event.levi.daily01': levi(['v_levi_daily01.mp3'], 'なんだ。……別に待ってたわけじゃない'),
  'event.levi.daily02': levi(['v_levi_daily02.mp3'], '礼は言わない。……だが、悪くなかった'),
  'event.levi.daily03': levi(['v_levi_daily03.mp3'], '海の音がする。……悪くない場所だ'),
  // ---- 会話（アリア — 第7便 日常追加版。登録のみ。daily02 は小さめのテイク：+6dB） ----
  'event.aria.daily01': aria(['v_aria_daily01.mp3'], 'おはようございます。今日も、よろしくお願いします'),
  'event.aria.daily02': aria(['v_aria_daily02.mp3'], 'あ、矢の数……数え間違えました', { gainDb: 6 }),
  'event.aria.daily03': aria(['v_aria_daily03.mp3'], '空が綺麗です。……少し、休みませんか？'),
  // リナ — イベント用（発火条件は今後）。
  'event.lina.daily01': lina(['v_lina_daily01.mp3'], 'お兄ちゃん、顔色悪いよ？'),
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
  if (line.play === 'RANDOM') {
    // At random, but never the same twice in a row.
    const last = turns.get(id);
    const choices = urls.map((_, i) => i).filter((i) => urls.length === 1 || i !== last);
    const n = choices[Math.floor(voiceRandom() * choices.length)] ?? 0;
    turns.set(id, n);
    return [urls[n]];
  }
  if (line.play !== 'ALTERNATE') return urls;
  const n = turns.get(id) ?? 0;
  turns.set(id, n + 1);
  return [urls[n % urls.length]];
}

/** The dice for RANDOM lines (a test sets them). */
let voiceRandom: () => number = Math.random;
export function setVoiceRandom(dice: () => number): void {
  voiceRandom = dice;
}

/** How much louder than recorded the file at this url is played (a line's `gainDb`), as a factor; 1 for most. */
export function voiceGainOf(url: string): number {
  for (const line of Object.values(VOICE_LINES)) if (line.gainDb && line.files.some((f) => byName.get(f) === url)) return 10 ** (line.gainDb / 20);
  return 1;
}

/** Whether this member of a fight has lines of their own (`battle.<id>.start` …). */
export function speaksInFights(memberId: string): boolean {
  return !!VOICE_LINES[`battle.${memberId}.start`];
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
