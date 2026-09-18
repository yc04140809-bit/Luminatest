// Scenes for the three future sites the KILL / HELP / CAPTURE routes lead
// to. The bakery (SPARE) keeps its own file — it shipped in Phase E and is
// deliberately untouched.
//
// House rules these follow, same as the bakery:
//  - he is 「男」 until the player has reason to know him again;
//  - no system text explains the causality — the scene shows it;
//  - the player is never told their choice was right or wrong.

import type { DialogueLine } from './prologue';
import type { SiteReplyDef } from '../world/futureSites';

// ---- HELP: 街道の救護所 --------------------------------------------------

export const WAYSTATION_FIRST_VISIT_LINES: DialogueLine[] = [
  { speaker: null, text: '古びた小屋。棚に薬草、包帯、水。奥に簡素な寝台がある。' },
  { speaker: null, text: '大柄な男が、旅人の腕に包帯を巻いている。' },
  { speaker: null, text: '男が顔を上げ、手を止めた。' },
  { speaker: '男', text: '……お前か。' },
  { speaker: null, text: '短い沈黙。' },
  { speaker: '男', text: 'そこで待ってろ。' },
  { speaker: '男', text: 'こいつの手当てが先だ。' },
  { speaker: null, text: 'あなたは待った。' },
  { speaker: null, text: 'やがて旅人は礼を言い、街道を歩いていった。' },
  { speaker: 'ガルド', text: '三年前。' },
  { speaker: 'ガルド', text: 'なんで俺を治した？' },
];

/**
 * Four answers, none of them canon. The world records that they met, not
 * what the player said — so no answer can be the "right" one.
 */
export const WAYSTATION_REPLY: SiteReplyDef = {
  prompt: 'なんと答える？',
  options: [
    {
      id: 'COULD_NOT_LEAVE',
      label: '放っておけなかった',
      line: { speaker: 'あなた', text: '……放っておけなかった。' },
    },
    {
      id: 'DONT_KNOW',
      label: '分からない',
      line: { speaker: 'あなた', text: '……分からない。' },
    },
    {
      id: 'NOT_DIE',
      label: '死んでほしくなかった',
      line: { speaker: 'あなた', text: '死んでほしくなかった。それだけだ。' },
    },
    {
      id: 'SILENT',
      label: '答えない',
      line: { speaker: null, text: 'あなたは、何も言わなかった。' },
    },
  ],
};

export const WAYSTATION_AFTER_REPLY_LINES: DialogueLine[] = [
  { speaker: 'ガルド', text: '……そうか。' },
  { speaker: null, text: '男は、少しだけ笑った。' },
  { speaker: 'ガルド', text: '俺も、まだ分からねぇ。' },
  { speaker: 'ガルド', text: 'だから今は――' },
  { speaker: null, text: '男は、旅人の消えた街道の先を見た。' },
  { speaker: 'ガルド', text: '同じことしてる。' },
];

export const WAYSTATION_REVISIT_LINES: DialogueLine[] = [
  { speaker: 'ガルド', text: '……怪我か？' },
];

export const KAOS_AFTER_WAYSTATION_LINES: string[] = [
  '「優しさって、不思議だね。」',
  '「渡した本人が忘れても――」',
  '「別の誰かまで届くことがあるんだ。」',
];

// ---- CAPTURE: 村外れの作業場 --------------------------------------------

export const WORKYARD_FIRST_VISIT_LINES: DialogueLine[] = [
  { speaker: null, text: '村の外れ。荷車と切り出した石材が積まれている。' },
  { speaker: null, text: '衛兵と話している男がいる。簡素な作業着。日に焼けた腕。' },
  { speaker: null, text: '男が振り返った。' },
  { speaker: '男', text: '……久しぶりだな。' },
  { speaker: null, text: '男は、あなたをまっすぐ見た。' },
  { speaker: '男', text: '驚いたか？' },
  { speaker: 'ガルド', text: '俺もだ。' },
  { speaker: '衛兵', text: 'こいつは問題も起こすが、働きだけは悪くない。' },
  { speaker: 'ガルド', text: '余計なこと言うな。' },
  { speaker: null, text: '衛兵は肩をすくめて離れていった。' },
  { speaker: 'ガルド', text: 'お前があの時、俺を殺してたらここにはいない。' },
  { speaker: null, text: '少し間。' },
  { speaker: 'ガルド', text: '見逃されてたら……たぶん逃げてた。' },
  { speaker: 'ガルド', text: '捕まったから、逃げられなかった。' },
  { speaker: 'ガルド', text: '……まあ。' },
  { speaker: 'ガルド', text: '悪くなかったとは言わねぇけどな。' },
];

export const WORKYARD_REVISIT_LINES: DialogueLine[] = [
  { speaker: 'ガルド', text: '見ての通りだ。手は貸さねぇぞ。' },
];

export const KAOS_AFTER_WORKYARD_LINES: string[] = [
  '「自由にすることだけが、救うことじゃない。」',
  '「……でも、縛ることが正しいとも限らない。」',
  '「だから面白いんだよ、人の選択って。」',
];

// ---- KILL: 森の小さな墓 --------------------------------------------------
// He is dead. He does not appear, speak, or come back. What the player
// finds is what the world did with what he left.

export const GRAVE_FIRST_VISIT_LINES: DialogueLine[] = [
  { speaker: null, text: '森の入口。道の脇に、小さな石が積まれている。' },
  { speaker: null, text: '墓のように見えた。' },
  { speaker: null, text: 'そばに、旅装の人物が立っている。' },
  { speaker: '旅人', text: '……知り合い？' },
  { speaker: null, text: 'あなたは答えなかった。' },
  { speaker: '旅人', text: 'ここで死んでた男らしい。' },
  { speaker: '旅人', text: '盗賊だったって話だけど。' },
  { speaker: null, text: '少し間。' },
  { speaker: '旅人', text: '誰かが時々、花を置いていくんだ。' },
  { speaker: null, text: '旅人は、石積みを見た。' },
  { speaker: '旅人', text: '悪い奴だったのかもしれない。' },
  { speaker: '旅人', text: 'でも――' },
  { speaker: '旅人', text: '誰かにとっては、そうじゃなかったのかもな。' },
  { speaker: null, text: '旅人は街道を歩いていった。' },
  { speaker: null, text: 'あなたは、石積みに近づいた。' },
  { speaker: null, text: '半ば土に埋もれた板に、名前が刻まれている。' },
  { speaker: null, text: '「ガルド」' },
];

export const GRAVE_REVISIT_LINES: DialogueLine[] = [
  { speaker: null, text: '石積みは、そのままそこにある。' },
];

export const KAOS_AFTER_GRAVE_LINES: string[] = [
  '「……死んだら、続きはないと思った？」',
  '「本人の時間は、そこで終わる。」',
  '「でもね。その人がいた世界まで、なくなるわけじゃない。」',
  '「これも、続きなんだよ。」',
];
