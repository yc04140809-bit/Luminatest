// The adapter between the running game and the QA report.
//
// Everything in core/qa is pure and knows nothing about the World, the
// DOM or vite. This file is the only place that knows all three, and its
// whole job is to read — it must never write, and never take a decision
// the game would take differently.

import type { World } from '../core/world/world';
import { toAbsoluteDay } from '../core/time/calendar';
import { buildGaldLifeArchive } from '../core/archive/lifeArchive';
import { ALDEN_EXPERIENCE_EVENTS } from '../content/experience/aldenExperience';
import { ALDEN_NARRATIVE_SEEDS } from '../content/narrative/aldenSeeds';
import { FUTURE_SITE_DEFS } from '../content/world/futureSites';
import { LIFE_EVENT_DEFS } from '../content/events/lifeEvents';
import { VISUAL_CHANGES } from '../content/qa/visualChanges';
import type { QaBuildInfo, QaInput, QaViewport } from '../core/qa/types';

declare const __BUILD_COMMIT__: string;
declare const __BUILD_TIME__: string;

/** The four routes, by the world fact each one produces. */
const ROUTE_MEMORIES = [
  { route: 'SPARE', choice: 'PLAYER_SPARED_GALD', memory: 'GALD_LEAVES_BANDITS' },
  { route: 'HELP', choice: 'PLAYER_HELPED_GALD', memory: 'GALD_WALKS_THE_ROAD' },
  { route: 'CAPTURE', choice: 'PLAYER_CAPTURED_GALD', memory: 'GALD_STANDS_TRIAL' },
  { route: 'KILL', choice: 'PLAYER_KILLED_GALD', memory: 'GALD_IS_BURIED' },
] as const;

function buildInfo(): QaBuildInfo {
  return {
    appVersion: 'MUGEN ZERO v0.1',
    commit: typeof __BUILD_COMMIT__ === 'string' ? __BUILD_COMMIT__ : 'unknown',
    builtAt: typeof __BUILD_TIME__ === 'string' ? __BUILD_TIME__ : 'unknown',
    environment: import.meta.env.DEV ? 'dev server' : 'production build',
  };
}

/** Measured, not assumed. Absent when there is no browser to measure. */
function viewport(): QaViewport | undefined {
  if (typeof window === 'undefined' || typeof document === 'undefined') return undefined;
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    documentScrollWidth: document.documentElement.scrollWidth,
  };
}

export function collectQaInput(world: World): QaInput {
  const clock = world.getClock();
  const events = world.getEvents();
  const canon = buildGaldLifeArchive(events);
  const known = world.getLifeArchive().find((e) => e.characterId === 'GALD');
  const openSites = world.getOpenFutureSites();

  return {
    build: buildInfo(),
    generatedAt: new Date().toISOString(),
    world: {
      worldYear: clock.worldYear,
      worldDay: clock.worldDay,
      absoluteDay: toAbsoluteDay(clock),
      route: world.getGaldLifeChoice() ?? 'NONE',
      events,
      timeShifts: events.filter((e) => e.type === 'WORLD_TIME_SHIFTED').length,
      futureSites: FUTURE_SITE_DEFS.map((def) => ({
        id: def.id,
        requiredMemory: def.requiredMemory,
        discoveryType: def.discovery.type,
        onMap: openSites.some((s) => s.def.id === def.id),
        discovered: world.hasDiscoveredSite(def.id),
      })),
      canonChapters: canon?.chapters.length ?? 0,
      knownChapters: known?.chapters.length ?? 0,
    },
    experience: world.getExperienceSummary(),
    registry: {
      eventDefs: ALDEN_EXPERIENCE_EVENTS,
      seedDefs: ALDEN_NARRATIVE_SEEDS,
      seeds: world.getNarrativeSeeds(),
      routeMemories: ROUTE_MEMORIES.map((r) => ({ ...r })),
      lifeEventChain: LIFE_EVENT_DEFS.map((d) => ({
        type: d.type,
        requiredMemory: d.requiredMemory,
      })),
      locations: [...new Set(ALDEN_EXPERIENCE_EVENTS.map((d) => d.location))],
    },
    experienceView: world.getExperienceView(),
    visualChanges: VISUAL_CHANGES,
    viewport: viewport(),
  };
}
