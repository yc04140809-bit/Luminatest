import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import { ALDEN_EXPERIENCE_EVENTS } from '../../content/experience/aldenExperience';
import { locationsWithSomethingNew, pickEvent } from '../experience/experienceEngine';

// Which small encounters the player has met is engine bookkeeping, not
// canon. It has to survive a restart, stay out of the LIFE ARCHIVE, and
// come back empty for a save written before it existed.

let dbCounter = 0;
const freshDbName = () => `experience-test-${++dbCounter}`;
const openWorld = (dbName = freshDbName()) => World.open(new IdbMemoryStore(dbName));

describe('experience state', () => {
  it('a fresh world has met nothing', async () => {
    const world = await openWorld();
    expect(world.hasSeenExperience('MOONLIGHT_TAVERN_FIRST_VISIT')).toBe(false);
  });

  it('remembers an encounter, and survives a reopen', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.markExperienceSeen('MOONLIGHT_TAVERN_FIRST_VISIT');
    expect(world.hasSeenExperience('MOONLIGHT_TAVERN_FIRST_VISIT')).toBe(true);

    const reopened = await openWorld(dbName);
    expect(reopened.hasSeenExperience('MOONLIGHT_TAVERN_FIRST_VISIT')).toBe(true);
    expect(reopened.hasSeenExperience('ALDEN_VILLAGER_TRAVELLER')).toBe(false);
  });

  it('marking twice records once', async () => {
    const world = await openWorld();
    await world.markExperienceSeen('A');
    await world.markExperienceSeen('A');
    expect(world.getExperienceView().hasSeen('A')).toBe(true);
  });

  it('never becomes world canon or a life chapter', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.markExperienceSeen('ALDEN_VILLAGER_TRAVELLER');
    expect(world.getEvents().map((e) => e.type)).not.toContain('ALDEN_VILLAGER_TRAVELLER');
    expect(world.getLifeArchive()[0].chapters).toHaveLength(1);
  });

  it('RESET WORLD clears it', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.markExperienceSeen('A');
    await world.resetWorld();
    expect(world.hasSeenExperience('A')).toBe(false);
    expect(await openWorld(dbName).then((w) => w.hasSeenExperience('A'))).toBe(false);
  });

  it('counts as progress, so a world that was only walked around in can be continued', async () => {
    const world = await openWorld();
    expect(world.hasProgress()).toBe(false);
    await world.markExperienceSeen('ALDEN_VILLAGER_TRAVELLER');
    expect(world.hasProgress()).toBe(true);
  });

  it('drives the engine: the tavern runs dry as the player works through it', async () => {
    const world = await openWorld();
    await world.recordGaldLifeChoice('SPARE');
    await world.advanceDays(3); // GALD_LEAVES_BANDITS -> the SPARE rumour

    const seenIds: string[] = [];
    for (let i = 0; i < 10; i++) {
      const event = pickEvent(ALDEN_EXPERIENCE_EVENTS, world.getExperienceView(), {
        location: 'MOONLIGHT_TAVERN',
      });
      if (!event || !event.once) break; // the regular's greeting never runs out
      seenIds.push(event.eventId);
      await world.markExperienceSeen(event.eventId);
    }
    // News first, then the seeds, then the small talk, then being
    // recognised — and only after all of that does he settle into the
    // regular's greeting.
    expect(seenIds).toEqual([
      'MOONLIGHT_TAVERN_FIRST_VISIT',
      'ALDEN_RUMOR_GALD_LEFT_THE_BANDITS',
      'TAVERN_MASTER_OLD_GREATSWORD',
      'GREENWOOD_DEEPER_PATH_RUMOR',
      'TAVERN_MASTER_STEW',
      'TAVERN_MASTER_REVISIT_A',
      'TAVERN_MASTER_REVISIT_B',
    ]);
    // Nothing new left to mark on the map...
    expect(
      locationsWithSomethingNew(ALDEN_EXPERIENCE_EVENTS, world.getExperienceView()),
    ).not.toContain('MOONLIGHT_TAVERN');
    // ...but Grave is still behind the bar.
    expect(
      pickEvent(ALDEN_EXPERIENCE_EVENTS, world.getExperienceView(), {
        location: 'MOONLIGHT_TAVERN',
      })?.eventId,
    ).toBe('TAVERN_MASTER_IDLE');
  });

  it('a save written before this feature existed simply has nothing seen', async () => {
    const dbName = freshDbName();
    const old = await openWorld(dbName);
    await old.recordGaldLifeChoice('SPARE');
    await old.timeShift(3);
    // Reopened by the new build: no experience key in the store at all.
    const reopened = await openWorld(dbName);
    expect(reopened.hasSeenExperience('MOONLIGHT_TAVERN_FIRST_VISIT')).toBe(false);
    expect(reopened.getGaldLifeChoice()).toBe('SPARE');
    expect(reopened.isBakeryOpen()).toBe(true);
  });
});
