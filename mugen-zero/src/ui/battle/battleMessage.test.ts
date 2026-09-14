import { describe, it, expect } from 'vitest';
import { sayOf, LEAD_LIMIT } from './battleMessage';

/**
 * Every shape battleLogic actually writes, read as a plate.
 *
 * These strings are copied from battleLogic rather than imagined, and
 * that is the point of the file: the log keeps its own sentences and
 * nothing in the fight changed, so the only thing that can break this
 * is a new sentence shape — which is exactly what should break it.
 */
describe('a log line, read as a plate', () => {
  it('turns a swing into what was done and what it cost', () => {
    expect(sayOf('攻撃！ モスラビットに12のダメージ。')).toEqual({
      lead: '攻撃',
      figure: '12 DAMAGE',
    });
  });

  it('reads a guarded swing the same way', () => {
    expect(sayOf('攻撃！ 《岩隠れ》に阻まれ、9のダメージ。')).toEqual({
      lead: '攻撃',
      figure: '9 DAMAGE',
    });
  });

  it('reads the creature’s own move', () => {
    expect(sayOf('モスラビットのリーフタックル！ 11のダメージ。')).toEqual({
      lead: 'リーフタックル',
      figure: '11 DAMAGE',
    });
  });

  it('reads a guard', () => {
    expect(sayOf('体当たり。防御して6のダメージ。')).toEqual({
      lead: '体当たり',
      figure: '6 DAMAGE',
    });
  });

  it('reads mending as what it gave back', () => {
    expect(sayOf('《やわらかな光》！ HPが20回復した。')).toEqual({
      lead: '《やわらかな光》',
      figure: '20 HEAL',
    });
  });

  it('says a name when somebody arrives, and nothing else', () => {
    // 「モスラビットが現れた！」 tells the player nothing 「モスラビット」
    // does not, and one of them can be read without stopping.
    expect(sayOf('モスラビットが現れた！')).toEqual({ lead: 'モスラビット' });
    expect(sayOf('ガルドが立ちはだかった。')).toEqual({ lead: 'ガルド' });
  });

  it('says a name and DOWN when somebody goes down', () => {
    expect(sayOf('モスラビットは膝をついた……。')).toEqual({
      lead: 'モスラビット',
      figure: 'DOWN',
    });
  });

  it('falls back to the first clause, clipped, for anything else', () => {
    const say = sayOf('《森の加護》が、そっと解けた。')!;
    expect(say.figure).toBeUndefined();
    expect([...say.lead].length).toBeLessThanOrEqual(LEAD_LIMIT + 1);
  });

  it('never gives back a sentence, whatever it is handed', () => {
    const lines = [
      '攻撃！ モスラビットに12のダメージ。',
      'モスラビットのリーフタックル！ 11のダメージ。',
      'モスラビットが現れた！',
      'モスラビットは膝をついた……。',
      '《やわらかな光》！ HPが20回復した。',
      '《森の加護》が、そっと解けた。',
      'とても長い名前のなにかがこちらへ向かってゆっくりと歩いてきて、そして立ち止まった。',
    ];
    for (const line of lines) {
      const say = sayOf(line)!;
      expect(say, line).not.toBeNull();
      expect([...say.lead].length, `lead of: ${line}`).toBeLessThanOrEqual(LEAD_LIMIT + 1);
      if (say.figure) expect([...say.figure].length, `figure of: ${line}`).toBeLessThanOrEqual(12);
    }
  });

  it('has nothing to say about nothing', () => {
    expect(sayOf(undefined)).toBeNull();
    expect(sayOf(null)).toBeNull();
    expect(sayOf('   ')).toBeNull();
  });
});
