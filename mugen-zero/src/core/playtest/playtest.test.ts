import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { World } from '../world/world';
import { IdbMemoryStore } from '../memory/idbStore';
import { IdbFeedbackStore } from './idbFeedbackStore';
import {
  PlaytestFeedbackService,
  availableMemorableMoments,
  isSurveyAvailable,
  type SurveyAnswers,
} from './playtestService';
import { summarizeFeedback } from './summary';
import { feedbackToCsv, escapeCsvCell, UTF8_BOM } from './csv';
import { FREE_COMMENT_MAX_LENGTH, type PlaytestFeedback } from './types';
import type { LifeChoiceId } from '../flow/types';

let dbCounter = 0;
const nextDbName = () => `playtest-test-${++dbCounter}`;

function installStorage() {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
  });
  return store;
}

const ANSWERS: SurveyAnswers = {
  continueInterest: 5,
  galdFutureInterest: 4,
  reunionRecognition: 'IMMEDIATE',
  worldImpactFeeling: 5,
  archiveInterest: 3,
  memorableMoment: 'REUNION',
  freeComment: '面白かった',
  moreLivesInterest: 4,
  nextCuriosity: 3,
  lostFrequency: 'SOME',
  wishComment: '森の奥へ行ってみたかった',
};

async function setupWorld(dbName: string, choice: LifeChoiceId = 'SPARE'): Promise<World> {
  const world = await World.open(new IdbMemoryStore(dbName));
  await world.recordGaldLifeChoice(choice);
  return world;
}

describe('playtest feedback storage', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installStorage();
  });

  it('saves an answer and reads it back', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const service = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));

    const saved = await service.submit(ANSWERS, world);
    expect(saved.route).toBe('SPARE');
    expect(saved.playSessionId).toBeTruthy();
    expect(Date.parse(saved.createdAt)).not.toBeNaN();

    const all = await service.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].continueInterest).toBe(5);
    expect(all[0].freeComment).toBe('面白かった');
  });

  it('allows only one feedback per play session', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const service = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));

    await service.submit(ANSWERS, world);
    expect(await service.hasAnswered()).toBe(true);
    await expect(service.submit(ANSWERS, world)).rejects.toThrow(/already sent/);
    expect(await service.getAll()).toHaveLength(1);
  });

  it('rejects a second concurrent submit (double tap)', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const service = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));

    const results = await Promise.allSettled([
      service.submit(ANSWERS, world),
      service.submit(ANSWERS, world),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await service.getAll()).toHaveLength(1);
  });

  it('truncates a free comment to the documented maximum', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const service = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));
    const saved = await service.submit(
      { ...ANSWERS, freeComment: 'あ'.repeat(FREE_COMMENT_MAX_LENGTH + 500) },
      world,
    );
    expect(saved.freeComment).toHaveLength(FREE_COMMENT_MAX_LENGTH);
  });

  it('keeps feedback out of world canon, and survives RESET WORLD / RESET SCENARIO', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const service = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));
    await service.submit(ANSWERS, world);

    // Never a memory event, never a chapter.
    expect(world.getEvents().some((e) => e.type.includes('FEEDBACK'))).toBe(false);
    expect(world.getEvents()).toHaveLength(1); // just the life choice
    const chaptersBefore = world.getLifeArchive()[0].chapters.length;

    await world.resetWorld();
    expect(await service.getAll()).toHaveLength(1);
    expect(world.getEvents()).toEqual([]);

    await world.recordGaldLifeChoice('SPARE');
    await world.devResetGaldScenario();
    expect(await service.getAll()).toHaveLength(1);
    expect(chaptersBefore).toBe(1);
  });

  it('survives reopening the database (restart)', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const first = new IdbFeedbackStore(dbName);
    const service = await PlaytestFeedbackService.open(first);
    await service.submit(ANSWERS, world);
    first.close();

    const reopened = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));
    expect(await reopened.getAll()).toHaveLength(1);
    expect(await reopened.hasAnswered()).toBe(true);
  });

  it('deleteAll clears feedback (dev tooling)', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const service = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));
    await service.submit(ANSWERS, world);
    await service.deleteAll();
    expect(await service.getAll()).toEqual([]);
    expect(await service.hasAnswered()).toBe(false);
  });

  it('surfaces a store failure so the UI can keep the answers', async () => {
    const dbName = nextDbName();
    const world = await setupWorld(dbName);
    const failing = new IdbFeedbackStore(dbName);
    const service = await PlaytestFeedbackService.open(failing);
    vi.spyOn(failing, 'add').mockRejectedValueOnce(new Error('disk full'));
    await expect(service.submit(ANSWERS, world)).rejects.toThrow('disk full');
    expect(await service.getAll()).toEqual([]);
  });
});

describe('survey availability and spoiler safety', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    installStorage();
  });

  it('is not offered before the player has made the life choice', async () => {
    const world = await World.open(new IdbMemoryStore(nextDbName()));
    expect(isSurveyAvailable(world)).toBe(false);
    await world.recordGaldLifeChoice('SPARE');
    expect(isSurveyAvailable(world)).toBe(true);
  });

  it('never offers bakery/reunion options to a player who has not been there', async () => {
    const world = await setupWorld(nextDbName(), 'KILL');
    await world.timeShift(3);
    const moments = availableMemorableMoments(world);
    expect(moments).not.toContain('BAKERY');
    expect(moments).not.toContain('REUNION');
    expect(moments).toContain('LIFE_CHOICE');
    expect(moments).toContain('TIME_SHIFT');
  });

  it('hides the bakery even when the world truth already has one', async () => {
    const world = await setupWorld(nextDbName(), 'SPARE');
    await world.timeShift(3);
    expect(world.isBakeryOpen()).toBe(true); // truth says yes…
    expect(availableMemorableMoments(world)).not.toContain('BAKERY'); // …player doesn't know
    await world.recordGaldReunion();
    expect(availableMemorableMoments(world)).toContain('BAKERY');
    expect(availableMemorableMoments(world)).toContain('REUNION');
  });

  it.each(['KILL', 'HELP', 'CAPTURE'] as const)(
    'the %s route can still reach and answer the survey',
    async (choice) => {
      const dbName = nextDbName();
      const world = await setupWorld(dbName, choice);
      const service = await PlaytestFeedbackService.open(new IdbFeedbackStore(dbName));
      const saved = await service.submit(
        { ...ANSWERS, reunionRecognition: 'NOT_APPLICABLE', memorableMoment: 'LIFE_CHOICE' },
        world,
      );
      expect(saved.route).toBe(choice);
      expect(saved.completedCoreExperience).toBe(false);
    },
  );
});

function sampleFeedback(overrides: Partial<PlaytestFeedback> = {}): PlaytestFeedback {
  return {
    id: `id-${Math.random()}`,
    createdAt: '2026-01-01T00:00:00.000Z',
    playSessionId: 'session-1',
    route: 'SPARE',
    continueInterest: 4,
    galdFutureInterest: 5,
    reunionRecognition: 'IMMEDIATE',
    worldImpactFeeling: 4,
    archiveInterest: 3,
    memorableMoment: 'REUNION',
    freeComment: '',
    worldYear: 4,
    worldDay: 4,
    knownChapterCount: 5,
    completedCoreExperience: true,
    ...overrides,
  };
}

describe('summary', () => {
  it('reports nothing (not NaN) with zero responses', () => {
    const summary = summarizeFeedback([]);
    expect(summary.responseCount).toBe(0);
    expect(summary.continueInterestAvg).toBeNull();
    expect(summary.galdFutureInterestAvg).toBeNull();
    expect(summary.worldImpactFeelingAvg).toBeNull();
    expect(summary.archiveInterestAvg).toBeNull();
    expect(Object.values(summary.reunionRecognitionCounts).every((c) => c === 0)).toBe(true);
  });

  it('averages ratings and counts the choice questions', () => {
    const summary = summarizeFeedback([
      sampleFeedback({ continueInterest: 5, reunionRecognition: 'IMMEDIATE', memorableMoment: 'REUNION' }),
      sampleFeedback({ continueInterest: 4, reunionRecognition: 'LATER', memorableMoment: 'REUNION' }),
      sampleFeedback({ continueInterest: 3, reunionRecognition: 'NOT_APPLICABLE', memorableMoment: 'BATTLE' }),
    ]);
    expect(summary.responseCount).toBe(3);
    expect(summary.continueInterestAvg).toBe(4);
    expect(summary.reunionRecognitionCounts.IMMEDIATE).toBe(1);
    expect(summary.reunionRecognitionCounts.LATER).toBe(1);
    expect(summary.reunionRecognitionCounts.NOT_RECOGNIZED).toBe(0);
    expect(summary.memorableMomentCounts.REUNION).toBe(2);
    expect(summary.memorableMomentCounts.BATTLE).toBe(1);
  });
});

describe('CSV export', () => {
  it('writes a BOM, a header and one row per answer', () => {
    const csv = feedbackToCsv([sampleFeedback({ id: 'a1' })]);
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    const lines = csv.trim().split('\r\n');
    expect(lines[0]).toContain('"freeComment"');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain('"a1"');
  });

  it('keeps Japanese comments intact, including newlines and quotes', () => {
    const csv = feedbackToCsv([
      sampleFeedback({ freeComment: '面白かった\n「再会」でびっくりした' }),
    ]);
    expect(csv).toContain('面白かった');
    expect(csv).toContain('「再会」でびっくりした');
    // The newline stays inside a quoted cell.
    expect(csv).toContain('"面白かった\n「再会」でびっくりした"');
  });

  it('defuses spreadsheet formulas in any cell', () => {
    expect(escapeCsvCell('=SUM(A1:A9)')).toBe(`"'=SUM(A1:A9)"`);
    expect(escapeCsvCell('+1')).toBe(`"'+1"`);
    expect(escapeCsvCell('-1')).toBe(`"'-1"`);
    expect(escapeCsvCell('@cmd')).toBe(`"'@cmd"`);
    expect(escapeCsvCell('普通のコメント')).toBe('"普通のコメント"');
    const csv = feedbackToCsv([sampleFeedback({ freeComment: '=1+1' })]);
    expect(csv).toContain(`"'=1+1"`);
  });

  it('escapes embedded quotes so cells cannot break out', () => {
    expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
  });
});
