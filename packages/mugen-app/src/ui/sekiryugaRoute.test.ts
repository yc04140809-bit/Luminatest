import { describe, expect, it } from 'vitest';
import { createBattle, playerAttack } from '@mugen/game/battle/battleLogic';
import { SEKIRYUGA_BATTLE } from '@mugen/content/enemies/sekiryugaBattle';
import { SEKIRYUGA_RUMORS, TAVERN_AFTER_TOLD_LINE } from '@mugen/content/story/sekiryugaArc';
import { answerOf, beatLength } from './battle/battleTheatre';
import { beatSfx } from './battle/battleSounds';
import { TAVERN_GREETING_LINES, TAVERN_MEETING_LINES, tavernTalkLines } from './tavern';

/**
 * THE FIRST BOSS ROUTE, IN THE APP'S OWN PIECES: which words the tavern's
 * ordinary talk ends on at each stage, and how a boss's roar is shown and
 * heard.
 */

describe('the master’s ordinary talk, stage by stage', () => {
  it('before the route has begun: as written, word for word', () => {
    expect(tavernTalkLines(TAVERN_GREETING_LINES, { open: false, stage: 'NONE' })).toEqual({
      lines: TAVERN_GREETING_LINES,
      rumor: false,
    });
    expect(tavernTalkLines(TAVERN_MEETING_LINES, undefined).lines).toBe(TAVERN_MEETING_LINES);
  });

  it('begun, nothing heard: his greeting ends on his rumour instead of "nothing tonight"', () => {
    const { lines, rumor } = tavernTalkLines(TAVERN_GREETING_LINES, { open: true, stage: 'NONE' });
    expect(rumor).toBe(true);
    expect(lines[lines.length - 1]).toEqual(SEKIRYUGA_RUMORS.TAVERN);
    expect(lines.map((l) => l.text)).not.toContain('今夜は、めぼしい話は入ってきてねぇ。');
    expect(lines.slice(0, -1)).toEqual(TAVERN_GREETING_LINES.slice(0, -1));
    // The first meeting keeps every line, and the rumour follows it.
    const meeting = tavernTalkLines(TAVERN_MEETING_LINES, { open: true, stage: 'NONE' }).lines;
    expect(meeting.slice(0, TAVERN_MEETING_LINES.length)).toEqual(TAVERN_MEETING_LINES);
    expect(meeting[meeting.length - 1]).toEqual(SEKIRYUGA_RUMORS.TAVERN);
  });

  it('told: a word of caution in place of "nothing tonight"; after the fight, as written again', () => {
    const told = tavernTalkLines(TAVERN_GREETING_LINES, { open: true, stage: 'TOLD' });
    expect(told.rumor).toBe(false);
    expect(told.lines[told.lines.length - 1]).toEqual(TAVERN_AFTER_TOLD_LINE);
    for (const stage of ['BEATEN', 'SETTLED'] as const) {
      expect(tavernTalkLines(TAVERN_GREETING_LINES, { open: true, stage }).lines).toBe(TAVERN_GREETING_LINES);
    }
  });
});

describe('a boss’s roar on the stage', () => {
  const roared = () => {
    const s = { ...createBattle(SEKIRYUGA_BATTLE), enemyChargeCooldown: 0 };
    return playerAttack(s, () => 0.99, 'SKILL');
  };

  it('is its own beat — not the moss rabbit’s dive — held as long as one', () => {
    expect(answerOf(roared())).toEqual(['ROAR']);
    expect(beatLength('ROAR', 1)).toBe(beatLength('HIDE', 1));
    expect(beatLength('ROAR', 2)).toBe(beatLength('HIDE', 2));
  });

  it('sounds the gathering aura', () => {
    expect(beatSfx('ROAR', { artId: 'sekiryuga', person: false, boss: true })).toBe('battle_charge_aura');
  });

  it('and the release next turn is an ordinary blow on the stage (it lunges and lands)', () => {
    const released = playerAttack(roared(), () => 0.99, null);
    expect(answerOf(released)).toEqual(['TACKLE', 'HURT']);
  });
});
