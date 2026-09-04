// ARCANA #001 — and, one day, the rest of the book.
//
// The numbers below are the whole balance of this system, and they are
// arranged around one promise: a player who never kills anything can
// still finish this page. So the four answers are worth exactly the
// same as each other, the total of everything reachable is far more
// than 100, and no single condition is on every road.
//
// Worked examples, all of which reach 100:
//
//   遭遇 10 + 通常攻撃 10 + 固有技 15 + 撃破 10 + 個体に会う 15
//   + どれか一つの選択 25 + 時間が過ぎる 15                   = 100
//
//   同上から時間を抜き、ケイオスの介入 10 と一敗 10 を足しても  = 105 → 100
//
//   二匹目の個体に別の答えを出した場合、選択 25 が二つで        = 110 → 100
//
// KILL appears in none of them as a requirement, which is the point.

import mossRabbitArt from '../../assets/enemies/moss-rabbit.png';
import type { ArcanaDef } from '../../core/arcana/arcana';
import { MOSS_RABBIT } from '../enemies/species';

/**
 * MOSS RABBIT.
 *
 * The first page, and the template for every page after it: a picture
 * used exactly as delivered, one line anybody can read the moment they
 * have met it, a handful of ways of coming to know it, and pieces of
 * what is known that become legible as it fills in.
 */
export const MOSS_RABBIT_ARCANA: ArcanaDef = {
  number: 1,
  arcanaId: 'moss_rabbit',
  name: MOSS_RABBIT.name,
  category: 'CREATURE',
  // The same file the battlefield uses, and the same box: no second
  // export, no recolour, no crop written to disk.
  visual: { src: mossRabbitArt, box: MOSS_RABBIT.battleVisuals.normal.box },
  summary: 'グリーンウッドの森にいる、小さな生き物。苔と葉を身にまとっている。',

  conditions: [
    {
      id: 'FIRST_ENCOUNTER',
      points: 10,
      hint: '森を歩けば、いつか出会うだろう。',
    },
    {
      id: 'OBSERVE_NORMAL_ATTACK',
      points: 10,
      // One line for the two things you can only learn by being there
      // while it fights back.
      hint: '戦いの中でしか見えないものもある。',
    },
    {
      id: 'OBSERVE_UNIQUE_SKILL',
      points: 15,
      hint: '戦いの中でしか見えないものもある。',
    },
    {
      id: 'WON_A_FIGHT',
      points: 10,
      hint: 'まだ知らない一面があるようだ。',
    },
    {
      id: 'LOST_A_FIGHT',
      points: 10,
      // Losing to a small frightened animal is a real thing to know
      // about it. It is never asked for, and it is never worth nothing.
      hint: 'まだ知らない一面があるようだ。',
    },
    {
      id: 'MET_SOMEBODY',
      points: 15,
      hint: 'そのうちの一匹が、ただの一匹ではなくなる日があるかもしれない。',
    },
    {
      id: 'KAOS_INTERVENED',
      points: 10,
      hint: '誰かが手を貸したとき、見えるものが変わることがある。',
    },
    {
      id: 'TIME_PASSED',
      points: 15,
      requiresDiscovered: true,
      hint: '時間が、新しい記憶を運ぶかもしれない。',
    },
    // The four answers. One hint between them, deliberately: the book
    // must never read as a list of lives to spend.
    { id: 'ROUTE_KILL', points: 25, hint: '選ばなかった道だけが答えとは限らない。' },
    { id: 'ROUTE_SPARE', points: 25, hint: '選ばなかった道だけが答えとは限らない。' },
    { id: 'ROUTE_HELP', points: 25, hint: '選ばなかった道だけが答えとは限らない。' },
    { id: 'ROUTE_CAPTURE', points: 25, hint: '選ばなかった道だけが答えとは限らない。' },

    // Defined, unreachable, and never shown. The moments these describe
    // are not built, and inventing them just to feed this page would be
    // the wrong way round: the world comes first, the memory follows it.
    {
      id: 'REUNION',
      points: 20,
      planned: true,
      requiresDiscovered: true,
      hint: '（未実装：再会）',
    },
    {
      id: 'SPECIAL_MEMORY',
      points: 15,
      planned: true,
      requiresDiscovered: true,
      hint: '（未実装：特殊な記憶）',
    },
  ],

  fragments: [
    {
      id: 'form',
      at: 1,
      label: 'すがた',
      text: '背丈は膝ほど。白い毛に苔と小さな葉が絡み、遠目には草の塊に見える。',
    },
    {
      id: 'life',
      at: 25,
      label: '生態',
      text: '臆病で、めったに自分から出てこない。飛び出してくるのは、たいてい驚いたときだ。',
    },
    {
      id: 'fight',
      at: 45,
      label: '戦いかた',
      text: '体当たりで距離を取ろうとする。追いつめられると身を低く丸め、苔と葉で身体を覆って耐える。',
    },
    {
      id: 'nature',
      at: 70,
      label: '気質',
      text: '牙も爪も持たない。戦っているのではなく、逃げそこねているだけのことが多い。',
    },
    {
      id: 'sign',
      at: 90,
      label: '予兆',
      // The door to summoning, and nothing more than a door: this says
      // that something could be called, not that anything can be yet.
      text: 'この記憶は、もう名前を持っている。呼べば、応えるものがあるのかもしれない。',
    },
  ],

  completeLine: 'この記憶は、もう失われない。',
};

/** Every page there is. One, today. */
export const ARCANA_DEFS: readonly ArcanaDef[] = [MOSS_RABBIT_ARCANA];

export function arcanaDef(arcanaId: string): ArcanaDef | null {
  return ARCANA_DEFS.find((def) => def.arcanaId === arcanaId) ?? null;
}
