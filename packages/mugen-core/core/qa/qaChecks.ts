// AUTOMATED QA — the checks themselves.
//
// Every function here is pure and looks at real data: the registries the
// game ships with, and the world currently in IndexedDB. Nothing here
// re-implements game logic — where a check needs an answer the game
// already computes (which events are eligible, what the director picks),
// it calls the same code the game calls.
//
// A check that cannot be run from here says so, by name, and points at
// whatever does run it. That is the honest half of the report and the
// reason it is worth reading.

import { direct } from '../experience/director';
import { findAvailableEvents } from '../experience/experienceEngine';
import type { QaCheck, QaInput } from './types';

function check(
  id: string,
  group: string,
  ok: boolean,
  pass: string,
  fail: string,
  how: string,
  failStatus: 'FAIL' | 'WARN' = 'FAIL',
): QaCheck {
  return { id, group, status: ok ? 'PASS' : failStatus, detail: ok ? pass : fail, how };
}

const CONTENT = 'CONTENT CHECKS';
const WORLD = 'WORLD MEMORY CHECKS';
const EXPERIENCE = 'EXPERIENCE CHECKS';
const ROUTES = 'GALD ROUTES';
const SAVE = 'SAVE';
const MOBILE = 'MOBILE';

function contentChecks(input: QaInput): QaCheck[] {
  const { eventDefs, seedDefs, routeMemories } = input.registry;
  const ids = eventDefs.map((d) => d.eventId);
  const known = new Set(ids);
  const out: QaCheck[] = [];

  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  out.push(
    check(
      'EVENT_IDS_UNIQUE',
      CONTENT,
      duplicates.length === 0,
      `${ids.length} events, every id unique`,
      `duplicate event ids: ${duplicates.join(', ')}`,
      'compared every eventId in the shipped registry',
    ),
  );

  const danglingRefs = eventDefs.flatMap((def) =>
    (def.requirements ?? [])
      .filter((r) => (r.kind === 'SEEN' || r.kind === 'NOT_SEEN') && !known.has(r.eventId))
      .map((r) => `${def.eventId} -> ${'eventId' in r ? r.eventId : '?'}`),
  );
  out.push(
    check(
      'EVENT_REQUIREMENTS_RESOLVABLE',
      CONTENT,
      danglingRefs.length === 0,
      'every SEEN / NOT_SEEN requirement points at an event that exists',
      `requirements pointing nowhere: ${danglingRefs.join(', ')}`,
      'resolved every requirement against the registry',
    ),
  );

  const withoutDna = eventDefs.filter((d) => !d.dna?.emotionTarget || !d.dna?.expectedEffect);
  out.push(
    check(
      'EVENT_DNA_PRESENT',
      CONTENT,
      withoutDna.length === 0,
      'every event declares what it is for (emotionTarget + expectedEffect)',
      `events with no stated intent: ${withoutDna.map((d) => d.eventId).join(', ')}`,
      'read the dna of every event',
      'WARN',
    ),
  );

  // A repeatable event with no cooldown is fine when it is the floor of
  // its place — an innkeeper's greeting that plays when nothing else is
  // left. It is a problem only if it can outrank something.
  const crowding = eventDefs.filter((d) => {
    if (d.once || d.cooldownDays) return false;
    return eventDefs.some(
      (other) => other.location === d.location && other !== d && other.priority <= d.priority,
    );
  });
  out.push(
    check(
      'REPEATABLE_EVENTS_REST',
      CONTENT,
      crowding.length === 0,
      'repeatable events either rest, or sit at the bottom of their place',
      `repeatable with no cooldown and able to crowd out other events: ${crowding
        .map((d) => d.eventId)
        .join(', ')}`,
      'compared each cooldown-free repeatable against its neighbours',
      'WARN',
    ),
  );

  const seedIds = new Set(seedDefs.map((s) => s.seedId));
  const seedsWithoutSource = seedDefs.filter((s) => !known.has(s.sourceEventId));
  out.push(
    check(
      'SEED_SOURCES_EXIST',
      CONTENT,
      seedsWithoutSource.length === 0,
      `${seedDefs.length} seeds, each shown by an event that exists`,
      `seeds whose source event is missing: ${seedsWithoutSource.map((s) => s.seedId).join(', ')}`,
      'resolved every seed source against the event registry',
    ),
  );

  const unregisteredPlanters = eventDefs
    .filter((d) => d.dna?.seed?.role === 'PLANTS' && !seedIds.has(d.dna.seed.id))
    .map((d) => `${d.eventId} -> ${d.dna?.seed?.id}`);
  out.push(
    check(
      'SEED_PLANTERS_REGISTERED',
      CONTENT,
      unregisteredPlanters.length === 0,
      'every event that plants a question has that question on the board',
      `planted but never registered (invisible to pacing and to the hub): ${unregisteredPlanters.join(', ')}`,
      'matched every dna.seed against the seed registry',
    ),
  );

  const uncoveredRoutes = routeMemories.filter(
    ({ memory }) =>
      !eventDefs.some((d) =>
        (d.requirements ?? []).some(
          (r) =>
            (r.kind === 'MEMORY_PRESENT' && r.type === memory) ||
            (r.kind === 'ANY_MEMORY_PRESENT' && r.types.includes(memory)),
        ),
      ),
  );
  out.push(
    check(
      'RUMOR_ROUTE_COVERAGE',
      CONTENT,
      uncoveredRoutes.length === 0,
      'all four routes are talked about by somebody',
      `routes the world never mentions: ${uncoveredRoutes.map((r) => r.route).join(', ')}`,
      'looked for an event requiring each route memory',
    ),
  );

  return out;
}

function worldChecks(input: QaInput): QaCheck[] {
  const { events, futureSites, canonChapters, knownChapters } = input.world;
  const out: QaCheck[] = [];

  const eventIds = events.map((e) => e.id);
  const duplicates = eventIds.filter((id, i) => eventIds.indexOf(id) !== i);
  out.push(
    check(
      'WORLD_MEMORY_NO_DUPLICATES',
      WORLD,
      duplicates.length === 0,
      `${events.length} facts recorded, no duplicates`,
      `the same fact recorded twice: ${duplicates.join(', ')}`,
      'compared every event id in the world currently loaded',
    ),
  );

  const choices = events.filter((e) => e.type.startsWith('PLAYER_') && e.type.endsWith('_GALD'));
  const lifeChoices = choices.filter((e) =>
    ['PLAYER_KILLED_GALD', 'PLAYER_SPARED_GALD', 'PLAYER_HELPED_GALD', 'PLAYER_CAPTURED_GALD'].includes(
      e.type,
    ),
  );
  out.push(
    check(
      'LIFE_CHOICE_IS_SINGULAR',
      WORLD,
      lifeChoices.length <= 1,
      lifeChoices.length === 0 ? 'no choice made yet' : `one choice: ${lifeChoices[0].type}`,
      `${lifeChoices.length} conflicting life choices in one world: ${lifeChoices
        .map((e) => e.type)
        .join(', ')}`,
      'counted the first-encounter outcomes in WORLD MEMORY',
    ),
  );

  const outOfOrder = events.some((e, i) => {
    if (i === 0) return false;
    const prev = events[i - 1];
    return e.worldYear < prev.worldYear || (e.worldYear === prev.worldYear && e.worldDay < prev.worldDay);
  });
  out.push(
    check(
      'WORLD_MEMORY_IN_ORDER',
      WORLD,
      !outOfOrder,
      'history runs forwards',
      'a fact is dated before the one recorded ahead of it',
      'walked the event list comparing world dates',
    ),
  );

  // A place can only be on the map because a life event put it there, and
  // can only be discovered by walking in. Anything else is a causality bug.
  const impossibleDiscoveries = futureSites.filter((s) => s.discovered && !s.onMap);
  out.push(
    check(
      'FUTURE_SITE_CAUSALITY',
      WORLD,
      impossibleDiscoveries.length === 0,
      `${futureSites.filter((s) => s.onMap).length} of ${futureSites.length} sites on the map, ${futureSites.filter((s) => s.discovered).length} found`,
      `discovered without the world fact that creates it: ${impossibleDiscoveries
        .map((s) => s.id)
        .join(', ')}`,
      'compared each site discovery against its required world memory',
    ),
  );

  out.push(
    check(
      'LIFE_ARCHIVE_IS_A_PROJECTION',
      WORLD,
      knownChapters <= canonChapters,
      `${knownChapters} of ${canonChapters} chapters known to the player`,
      `the player knows ${knownChapters} chapters but canon only has ${canonChapters}`,
      'compared the player projection against the canon archive',
    ),
  );

  return out;
}

function experienceChecks(input: QaInput): QaCheck[] {
  const { eventDefs, locations } = input.registry;
  const known = new Set(eventDefs.map((d) => d.eventId));
  const out: QaCheck[] = [];

  const strangers = [
    ...new Set([...input.experience.seenEventIds, ...input.experience.recentEventIds]),
  ].filter((id) => !known.has(id));
  out.push(
    check(
      'EXPERIENCE_LOG_RESOLVES',
      EXPERIENCE,
      strangers.length === 0,
      `${input.experience.seenEventIds.length} events met, all still in the registry`,
      `met events that no longer exist (renamed or deleted): ${strangers.join(', ')}`,
      'resolved the saved experience log against the registry',
      'WARN',
    ),
  );

  const notEmptied = locations.filter((location) => {
    const eligible = findAvailableEvents(eventDefs, input.experienceView, { location });
    return eligible.length > 0 && direct(eventDefs, input.experienceView, { location }).selected === null;
  });
  out.push(
    check(
      'DIRECTOR_NEVER_EMPTIES_A_ROOM',
      EXPERIENCE,
      notEmptied.length === 0,
      'wherever something could happen, the director offers something',
      `pacing left these places empty although they had events: ${notEmptied.join(', ')}`,
      'ran the director against every location in the current world',
    ),
  );

  const unstable = locations.filter((location) => {
    const a = direct(eventDefs, input.experienceView, { location }).selected?.eventId ?? null;
    const b = direct(eventDefs, input.experienceView, { location }).selected?.eventId ?? null;
    return a !== b;
  });
  out.push(
    check(
      'DIRECTOR_IS_DETERMINISTIC',
      EXPERIENCE,
      unstable.length === 0,
      'the same world plays the same sequence',
      `the director gave two different answers for: ${unstable.join(', ')}`,
      'directed every location twice and compared',
    ),
  );

  return out;
}

/** Everything a choice can eventually cause, by walking the life chain. */
function reachableMemories(choice: string, chain: readonly { type: string; requiredMemory: string }[]): Set<string> {
  const reached = new Set<string>([choice]);
  // The chain is a handful of links; loop until it stops growing rather
  // than assuming any particular depth.
  for (let i = 0; i < chain.length + 1; i++) {
    const before = reached.size;
    for (const link of chain) {
      if (reached.has(link.requiredMemory)) reached.add(link.type);
    }
    if (reached.size === before) break;
  }
  return reached;
}

function routeChecks(input: QaInput): QaCheck[] {
  const { routeMemories, lifeEventChain } = input.registry;
  const out: QaCheck[] = [];

  for (const { route, choice, memory } of routeMemories) {
    const reached = reachableMemories(choice, lifeEventChain);
    const site = input.world.futureSites.find((s) => reached.has(s.requiredMemory));
    const ok = reached.has(memory) && !!site;
    out.push(
      check(
        `ROUTE_WIRING_${route}`,
        ROUTES,
        ok,
        `${choice} → ${[...reached].filter((m) => m !== choice).join(' → ')} → ${site?.id}`,
        !reached.has(memory)
          ? `${choice} never produces ${memory}: the route stops before anyone can hear about it`
          : `${choice} leads nowhere findable: no future site on this route`,
        'walked the life-event chain from the choice and looked for a site at the end',
      ),
    );
  }

  out.push({
    id: 'ROUTE_PLAYTHROUGH_ALL',
    group: ROUTES,
    status: 'NOT_TESTED',
    detail: 'battle -> choice -> TIME SHIFT -> discovery, played end to end for all four routes',
    how: 'not checked here — e2e/fourFutures.spec.ts plays all four in a browser',
  });

  return out;
}

function saveChecks(input: QaInput): QaCheck[] {
  const hasSave = input.world.events.length > 0 || input.experience.seenEventIds.length > 0;
  return [
    {
      id: 'SAVE_RESTORED',
      group: SAVE,
      status: hasSave ? 'PASS' : 'NOT_TESTED',
      detail: hasSave
        ? `restored ${input.world.events.length} facts and ${input.experience.seenEventIds.length} met events from IndexedDB`
        : 'nothing saved yet in this world, so there was nothing to restore',
      how: 'this world was read back from IndexedDB when the page loaded',
    },
    {
      id: 'SAVE_SURVIVES_RELOAD',
      group: SAVE,
      status: 'NOT_TESTED',
      detail: 'a reload keeps what the player met and what the world remembers',
      how: 'not checked here — e2e navigation / rumorSeeds specs reload the page and re-read',
    },
  ];
}

function mobileChecks(input: QaInput): QaCheck[] {
  const vp = input.viewport;
  if (!vp) {
    return [
      {
        id: 'NO_HORIZONTAL_SCROLL',
        group: MOBILE,
        status: 'NOT_TESTED',
        detail: 'no browser to measure',
        how: 'not checked here — e2e checks 360 / 390 / 412px across the whole flow',
      },
    ];
  }
  const overflow = vp.documentScrollWidth - vp.width;
  return [
    check(
      'NO_HORIZONTAL_SCROLL',
      MOBILE,
      overflow <= 1,
      `${vp.width}x${vp.height}: nothing spills sideways`,
      `${vp.width}px wide but the page is ${vp.documentScrollWidth}px — ${overflow}px of sideways scroll`,
      'measured this screen in this browser, right now',
    ),
    {
      id: 'VISUAL_LAYOUT',
      group: MOBILE,
      status: 'MANUAL',
      detail: 'whether it looks right, not whether it fits',
      how: 'a person has to look — see VISUAL REVIEW REQUIRED at the end of this report',
    },
  ];
}

/** Every check, in report order. */
export function runQaChecks(input: QaInput): QaCheck[] {
  return [
    ...contentChecks(input),
    ...worldChecks(input),
    ...experienceChecks(input),
    ...routeChecks(input),
    ...saveChecks(input),
    ...mobileChecks(input),
  ];
}
