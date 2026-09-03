import { describe, it, expect } from 'vitest';
import { buildQaReport, renderQaReportMarkdown } from './qaReport';
import type { QaInput } from './types';
import type { ExperienceEventDef, ExperienceWorldView } from '../experience/types';
import type { MemoryEvent } from '../memory/types';

const event = (over: Partial<ExperienceEventDef> = {}): ExperienceEventDef => ({
  eventId: 'A',
  layer: 'NOW',
  location: 'TOWN',
  once: true,
  priority: 10,
  content: null,
  dna: { emotionTarget: 'WARMTH', expectedEffect: 'x' },
  ...over,
});

const memory = (over: Partial<MemoryEvent> = {}): MemoryEvent => ({
  id: 'm1',
  type: 'PLAYER_SPARED_GALD',
  worldYear: 1,
  worldDay: 1,
  actors: ['GALD'],
  importance: 'CRITICAL',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

function view(seen: string[] = []): ExperienceWorldView {
  return {
    hasMemory: () => true,
    hasSeen: (id) => seen.includes(id),
    worldYear: 1,
    worldDay: 1,
    today: 1,
    lastSeenDay: () => null,
  };
}

function input(over: Partial<QaInput> = {}): QaInput {
  const eventDefs = [
    event({ eventId: 'MEETING', priority: 50 }),
    event({
      eventId: 'THE_SWORD',
      layer: 'NEXT',
      dna: { emotionTarget: 'CURIOSITY', expectedEffect: 'x', seed: { id: 'SWORD', role: 'PLANTS' } },
    }),
    event({
      eventId: 'GOSSIP',
      requirements: [{ kind: 'MEMORY_PRESENT', type: 'HE_LEFT' }],
    }),
  ];
  return {
    build: { appVersion: 'test', commit: 'abc1234', builtAt: 'now', environment: 'test' },
    generatedAt: '2026-01-01T00:00:00.000Z',
    world: {
      worldYear: 1,
      worldDay: 1,
      absoluteDay: 1,
      route: 'SPARE',
      events: [memory()],
      timeShifts: 0,
      futureSites: [
        { id: 'BAKERY', requiredMemory: 'HE_LEFT', discoveryType: 'X', onMap: true, discovered: false },
      ],
      canonChapters: 2,
      knownChapters: 1,
    },
    experience: { seenEventIds: ['MEETING'], recentEventIds: ['MEETING'], lastSeenDay: { MEETING: 1 } },
    registry: {
      eventDefs,
      seedDefs: [
        {
          seedId: 'SWORD',
          title: 'a sword',
          sourceEventId: 'THE_SWORD',
          relatedCharacters: [],
          relatedLocations: ['TOWN'],
        },
      ],
      seeds: [
        {
          def: {
            seedId: 'SWORD',
            title: 'a sword',
            sourceEventId: 'THE_SWORD',
            relatedCharacters: [],
            relatedLocations: ['TOWN'],
          },
          state: 'SEED',
          playerKnown: false,
        },
      ],
      routeMemories: [{ route: 'SPARE', choice: 'HE_WAS_SPARED', memory: 'HE_LEFT' }],
      lifeEventChain: [
        { type: 'HE_LEFT', requiredMemory: 'HE_WAS_SPARED' },
        { type: 'HE_BAKES', requiredMemory: 'HE_LEFT' },
      ],
      locations: ['TOWN'],
    },
    experienceView: view(['MEETING']),
    visualChanges: [
      { screen: 'TITLE', changed: false, reason: 'untouched' },
      { screen: 'TAVERN', changed: true, reason: 'new art' },
    ],
    ...over,
  };
}

describe('QA REPORT — honesty', () => {
  it('a sound build has nothing failing', () => {
    const report = buildQaReport(input());
    expect(report.ok).toBe(true);
    expect(report.checks.filter((c) => c.status === 'FAIL')).toEqual([]);
    expect(report.counts.PASS).toBeGreaterThan(5);
  });

  it('never reports PASS for something it did not check', () => {
    const report = buildQaReport(input());
    const playthrough = report.checks.find((c) => c.id === 'ROUTE_PLAYTHROUGH_ALL');
    expect(playthrough?.status).toBe('NOT_TESTED');
    expect(playthrough?.how).toContain('e2e');
  });

  it('every check says how it knows', () => {
    for (const c of buildQaReport(input()).checks) {
      expect(c.how.length, `${c.id} must say how it was established`).toBeGreaterThan(10);
    }
  });

  it('says NOT TESTED for the phone when there is no phone to measure', () => {
    const report = buildQaReport(input());
    expect(report.checks.find((c) => c.id === 'NO_HORIZONTAL_SCROLL')?.status).toBe('NOT_TESTED');
  });

  it('measures the viewport when it has one, instead of assuming', () => {
    const ok = buildQaReport(
      input({ viewport: { width: 390, height: 844, documentScrollWidth: 390 } }),
    );
    expect(ok.checks.find((c) => c.id === 'NO_HORIZONTAL_SCROLL')?.status).toBe('PASS');
    const bad = buildQaReport(
      input({ viewport: { width: 390, height: 844, documentScrollWidth: 460 } }),
    );
    expect(bad.checks.find((c) => c.id === 'NO_HORIZONTAL_SCROLL')?.status).toBe('FAIL');
    expect(bad.ok).toBe(false);
  });
});

describe('QA REPORT — catching real mistakes', () => {
  it('catches a question planted but never put on the board', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      registry: { ...base.registry, seedDefs: [], seeds: [] },
    });
    const planted = report.checks.find((c) => c.id === 'SEED_PLANTERS_REGISTERED');
    expect(planted?.status).toBe('FAIL');
    expect(planted?.detail).toContain('THE_SWORD');
  });

  it('catches a requirement pointing at an event that does not exist', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      registry: {
        ...base.registry,
        eventDefs: [
          ...base.registry.eventDefs,
          event({ eventId: 'ORPHAN', requirements: [{ kind: 'SEEN', eventId: 'DELETED' }] }),
        ],
      },
    });
    expect(report.checks.find((c) => c.id === 'EVENT_REQUIREMENTS_RESOLVABLE')?.status).toBe('FAIL');
  });

  it('catches a route nobody in the world ever talks about', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      registry: {
        ...base.registry,
        routeMemories: [
          { route: 'SPARE', choice: 'HE_WAS_SPARED', memory: 'HE_LEFT' },
          { route: 'KILL', choice: 'HE_WAS_KILLED', memory: 'HE_DIED' },
        ],
      },
    });
    const coverage = report.checks.find((c) => c.id === 'RUMOR_ROUTE_COVERAGE');
    expect(coverage?.status).toBe('FAIL');
    expect(coverage?.detail).toContain('KILL');
  });

  it('catches a route whose life chain never reaches anywhere findable', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      // The chain is cut: sparing him no longer leads to him leaving.
      registry: { ...base.registry, lifeEventChain: [] },
    });
    const wiring = report.checks.find((c) => c.id === 'ROUTE_WIRING_SPARE');
    expect(wiring?.status).toBe('FAIL');
    expect(wiring?.detail).toContain('HE_LEFT');
  });

  it('follows a whole chain, not just its first link', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      world: {
        ...base.world,
        // The site sits at the END of the chain, as the real ones do.
        futureSites: [
          { id: 'BAKERY', requiredMemory: 'HE_BAKES', discoveryType: 'X', onMap: true, discovered: false },
        ],
      },
    });
    expect(report.checks.find((c) => c.id === 'ROUTE_WIRING_SPARE')?.status).toBe('PASS');
  });

  it('lets a greeting repeat, but not a beat that could crowd others out', () => {
    const base = input();
    const fine = buildQaReport({
      ...base,
      registry: {
        ...base.registry,
        eventDefs: [
          ...base.registry.eventDefs,
          event({ eventId: 'GREETING', once: false, priority: 1 }),
        ],
      },
    });
    expect(fine.checks.find((c) => c.id === 'REPEATABLE_EVENTS_REST')?.status).toBe('PASS');
    const noisy = buildQaReport({
      ...base,
      registry: {
        ...base.registry,
        eventDefs: [
          ...base.registry.eventDefs,
          event({ eventId: 'NAGGING', once: false, priority: 99 }),
        ],
      },
    });
    expect(noisy.checks.find((c) => c.id === 'REPEATABLE_EVENTS_REST')?.status).toBe('WARN');
  });

  it('catches the same fact recorded twice', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      world: { ...base.world, events: [memory(), memory()] },
    });
    expect(report.checks.find((c) => c.id === 'WORLD_MEMORY_NO_DUPLICATES')?.status).toBe('FAIL');
  });

  it('catches two life choices in one world', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      world: {
        ...base.world,
        events: [memory(), memory({ id: 'm2', type: 'PLAYER_KILLED_GALD' })],
      },
    });
    expect(report.checks.find((c) => c.id === 'LIFE_CHOICE_IS_SINGULAR')?.status).toBe('FAIL');
  });

  it('catches a place the player knows more about than the world does', () => {
    const base = input();
    const report = buildQaReport({
      ...base,
      world: { ...base.world, canonChapters: 1, knownChapters: 3 },
    });
    expect(report.checks.find((c) => c.id === 'LIFE_ARCHIVE_IS_A_PROJECTION')?.status).toBe('FAIL');
  });
});

describe('QA REPORT — the text a reviewer actually reads', () => {
  const markdown = renderQaReportMarkdown(buildQaReport(input()));

  it('carries the sections a review needs', () => {
    for (const heading of [
      '# MUGEN ZERO QA REPORT',
      '## CURRENT WORLD',
      '## CONTENT',
      '## NARRATIVE SEEDS',
      '## FAILED CHECKS',
      '## WARNINGS',
      '## VISUAL REVIEW REQUIRED',
    ]) {
      expect(markdown).toContain(heading);
    }
  });

  it('names the build it describes', () => {
    expect(markdown).toContain('abc1234');
  });

  it('asks for a screenshot only where something moved', () => {
    const visual = markdown.slice(markdown.indexOf('## VISUAL REVIEW REQUIRED'));
    expect(visual).toContain('[ ] TAVERN');
    expect(visual).not.toContain('[ ] TITLE');
    expect(visual).toContain('no screenshot needed: TITLE');
  });

  it('says plainly when nothing failed', () => {
    expect(markdown).toContain('## FAILED CHECKS\n- none');
  });

  it('leads with the failures when there are some', () => {
    const broken = renderQaReportMarkdown(
      buildQaReport({ ...input(), registry: { ...input().registry, seedDefs: [], seeds: [] } }),
    );
    expect(broken).toContain('**FAIL** `SEED_PLANTERS_REGISTERED`');
    expect(broken).not.toContain('## FAILED CHECKS\n- none');
  });
});
