import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { LifeChoiceId } from '../flow/types';
import { OFF_SCREEN_FACTS } from '../../content/events/offScreenLife';

/**
 * WHAT A PLAYER MAY BE TOLD.
 *
 * The world knows more than the player does, on purpose: Gald's life
 * carries on off screen and none of it is theirs until they go and
 * look. Two projections are the player-facing ones —
 * `getKnownEvents()` and `getLifeArchive()` — and the property that
 * matters is that NEITHER can be made to hand over something the
 * player has not witnessed.
 *
 * This is checked as a property rather than by example: at each stage
 * the whole of world truth is compared against the whole of what is
 * offered, so a new event type added later is covered the day it is
 * added rather than the day somebody remembers to extend a list.
 *
 * The four stages are the ones a player actually passes through:
 *   1. straight after the choice
 *   2. after the world has moved on, before they have seen any of it
 *   3. after they have been to the place their choice led to — or, on
 *      the bakery route (HELP, OFF-SCREEN LIFE PoC 2026-10-17), after
 *      somebody has told them part of what happened while they were not
 *      there (PLAYER KNOWLEDGE): then only what they were told
 *   4. after closing the game and opening it again
 */

let dbCounter = 0;
const freshDbName = () => `known-only-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

/**
 * Route → the place it opens, and how long the world takes to open it.
 * HELP opens none (the bakery route, off screen): the player is TOLD instead.
 */
const ROUTES: Array<{ choice: LifeChoiceId; site: string | null; days: number; told?: string[] }> = [
  // ROUTE D (2026-10-20): no place opens, and nobody tells them anything of it.
  { choice: 'SPARE', site: null, days: 6 },
  // リナ tells them she was saved; a rumour of a new face at the bakery
  // (part of a fact: who, it does not say); nothing of the rest.
  { choice: 'HELP', site: null, days: 6, told: ['GALD_SAVED_LINA', 'NEW_HAND_AT_BAKERY'] },
  { choice: 'KILL', site: 'GREENWOOD_GRAVE', days: 331 },
  { choice: 'CAPTURE', site: 'ALDEN_WORKYARD', days: 745 },
];

/**
 * The rule the filter is supposed to implement, stated independently
 * of the filter: a player knows a thing if they were there, or if it
 * is the world itself moving, or if they have since gone and seen what
 * became of him.
 */
function mayKnow(
  event: { actors: string[]; type: string },
  discoveredHisFuture: boolean,
  toldWhole: ReadonlySet<string>,
): boolean {
  if (event.actors.includes('PLAYER')) return true;
  if (event.type === 'WORLD_TIME_SHIFTED') return true;
  // Told the whole of it (a fact that lists its event), and nothing else.
  if (toldWhole.has(event.type)) return true;
  return discoveredHisFuture && event.actors.includes('GALD');
}

/** The event types the player has been told the whole of, read from the facts table independently. */
function toldWholeOf(world: World): Set<string> {
  const known = world.getPlayerKnowledge();
  return new Set(OFF_SCREEN_FACTS.filter((f) => f.listsEvent && known[f.id]).map((f) => f.truth));
}

function checkDisclosure(world: World, stage: string) {
  const truth = world.getEvents();
  const offered = world.getKnownEvents();
  const discovered = world.hasDiscoveredGaldFuture();
  const told = toldWholeOf(world);

  // NOTHING IS OFFERED THAT IS NOT ALLOWED.
  for (const event of offered) {
    expect(mayKnow(event, discovered, told), `${stage}: leaked ${event.type}`).toBe(true);
  }
  // AND NOTHING ALLOWED IS WITHHELD — a filter that hid everything
  // would pass the check above and be useless.
  const allowed = truth.filter((e) => mayKnow(e, discovered, told));
  expect(offered.map((e) => e.id).sort(), `${stage}: withheld something`).toEqual(
    allowed.map((e) => e.id).sort(),
  );

  // THE ARCHIVE IS A PROJECTION OVER THE SAME KNOWLEDGE, so every
  // chapter it shows must be sourced from an event the player may know.
  const knownIds = new Set(offered.map((e) => e.id));
  for (const entry of world.getLifeArchive()) {
    for (const chapter of entry.chapters) {
      for (const sourceId of chapter.sourceEventIds) {
        expect(knownIds.has(sourceId), `${stage}: chapter ${chapter.id} cites unknown ${sourceId}`)
          .toBe(true);
      }
    }
  }
}

describe('the player is told only what they have seen', () => {
  it.each(ROUTES.map((r) => [r.choice, r] as const))(
    '%s: through all four stages, on the route’s own schedule',
    async (_c, route) => {
      const dbName = freshDbName();
      const world = await openWorld(dbName);

      // 1. STRAIGHT AFTER THE CHOICE.
      await world.recordGaldLifeChoice(route.choice);
      checkDisclosure(world, `${route.choice} after the choice`);
      expect(world.getKnownEvents(), 'only their own decision').toHaveLength(1);
      expect(world.hasDiscoveredGaldFuture()).toBe(false);

      // 2. THE WORLD MOVES ON, UNWATCHED.
      await world.advanceDays(route.days);
      checkDisclosure(world, `${route.choice} before seeing`);
      expect(
        world.getEvents().length,
        'the world really did get on with it',
      ).toBeGreaterThan(world.getKnownEvents().length);
      expect(world.getKnownEvents(), 'still only their own decision').toHaveLength(1);
      // AND THE 「？？？」 CARD READS THE SAME ON ALL FOUR ROUTES, which
      // is what stops its presence from being a spoiler.
      expect(world.getLifeArchive()[0]?.hasUnknownContinuation).toBe(true);

      // 3. THEY GO AND LOOK — or, where no place opens, they are told some of it.
      if (route.site) {
        await world.recordFutureSiteDiscovery(route.site);
        checkDisclosure(world, `${route.choice} after seeing`);
        expect(world.getKnownEvents().length, 'his life is theirs now').toBeGreaterThan(1);
        expect(world.getLifeArchive()[0]?.hasUnknownContinuation).toBe(false);
      } else if (!route.told) {
        // Nobody tells them: the let-go world (ROUTE D) has nothing for the
        // player to hear, so they still know only their own decision.
        expect(world.getKnownEvents(), 'still only their own decision').toHaveLength(1);
        expect(world.getLifeArchive()[0]?.hasUnknownContinuation).toBe(true);
      } else {
        await world.learnFacts(route.told, 'talk:TEST');
        checkDisclosure(world, `${route.choice} after being told`);
        // Saved: listed. A new face at the bakery: known, and lists nothing.
        expect(world.getKnownEvents().map((e) => e.type)).toEqual(['PLAYER_HELPED_GALD', 'GALD_SAVES_LINA']);
        expect(world.knows('NEW_HAND_AT_BAKERY')).toBe(true);
        // What they were not told stays theirs to find out, and the card says so.
        expect(world.getLifeArchive()[0]?.hasUnknownContinuation).toBe(true);
      }

      // 4. CLOSED AND OPENED AGAIN.
      const reopened = await openWorld(dbName);
      checkDisclosure(reopened, `${route.choice} after a restart`);
      expect(reopened.getKnownEvents().map((e) => e.type).sort()).toEqual(
        world.getKnownEvents().map((e) => e.type).sort(),
      );
    },
  );

  it('a brand new world offers nothing at all', async () => {
    const world = await openWorld(freshDbName());
    checkDisclosure(world, 'a new world');
    expect(world.getKnownEvents()).toHaveLength(0);
    expect(world.getLifeArchive()).toHaveLength(0);
  });
});
