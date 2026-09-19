import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { LifeChoiceId } from '../flow/types';

/**
 * THE FIVE STATES THE ONE TIME SHIFT CAN BE IN, and which of them the
 * save can actually tell apart.
 *
 *   A. never offered
 *   B. offered, on screen
 *   C. offered and declined
 *   D. running
 *   E. done
 *
 * This pins what is TRUE TODAY, before anything is changed, because
 * the fix for resuming out of B needs to know exactly which of these
 * properties it is allowed to disturb. Three of them already hold and
 * must keep holding; the fourth is the gap, and it is written down
 * here as a fact rather than left as a sentence in a report.
 */

let dbCounter = 0;
const freshDbName = () => `shift-resume-${++dbCounter}`;
const openWorld = (dbName: string) => World.open(new IdbMemoryStore(dbName));

const shifted = (w: World) => w.hasEventOfType('WORLD_TIME_SHIFTED');

describe('resuming into the one TIME SHIFT', () => {
  it('E is the only state the world records, and it survives a reopen', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    expect(shifted(world), 'A: nothing done yet').toBe(false);

    await world.timeShift(3);
    expect(shifted(world)).toBe(true);
    expect(shifted(await openWorld(dbName)), 'E survives being closed').toBe(true);
  });

  /**
   * WHO ACTUALLY ENFORCES "ONCE".
   *
   * Not the world. `timeShift` guards only against a shift running
   * while another is running; it has no opinion about one having
   * happened before, and the event id encodes the DESTINATION
   * (`evt_world_time_shifted_y4d1`), so a second shift lands on a
   * fresh id and is written without complaint.
   *
   * That is deliberate for the Artifact, whose TIME SHIFT is a
   * repeatable player action. It means the App's once-only beat rests
   * entirely on one check before it ever navigates —
   * `!hasEventOfType('WORLD_TIME_SHIFTED')` — and this test says so
   * out loud, because a property defended in exactly one place is
   * worth knowing about.
   */
  it('the world permits a second shift: "once" is the caller\'s rule', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    await world.timeShift(3);
    expect(world.getClock().worldYear).toBe(4);

    await world.timeShift(3);
    expect(world.getClock().worldYear, 'the world simply moved again').toBe(7);
    expect(world.getEvents().filter((e) => e.type === 'WORLD_TIME_SHIFTED')).toHaveLength(2);
  });

  it('and the flag the App gates on is true from the first one onward', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    expect(shifted(world)).toBe(false);
    await world.timeShift(3);
    // This is the whole of the App's guard, and it survives a reopen.
    expect(shifted(world)).toBe(true);
    expect(shifted(await openWorld(dbName))).toBe(true);
  });

  it('D cannot tear: a shift that fails leaves no trace of itself', async () => {
    const dbName = freshDbName();
    const world = await openWorld(dbName);
    await world.recordGaldLifeChoice('SPARE');
    const before = world.getClock();

    // The commit is one IndexedDB transaction over both stores, so the
    // only two outcomes are all of it and none of it. Breaking it is
    // how that gets demonstrated rather than asserted.
    const store = (world as unknown as { store: { commit: (c: unknown) => Promise<void> } }).store;
    const real = store.commit.bind(store);
    store.commit = async () => {
      throw new Error('the disk said no');
    };
    await expect(world.timeShift(3)).rejects.toThrow(/the disk said no/);
    store.commit = real;

    expect(world.getClock(), 'the clock did not move').toEqual(before);
    expect(shifted(world), 'and nothing was recorded').toBe(false);
    const reopened = await openWorld(dbName);
    expect(reopened.getClock(), 'nor on disk').toEqual(before);
    expect(shifted(reopened)).toBe(false);
    // AND THE WORLD IS STILL USABLE afterwards: the failure released
    // the queue rather than wedging it (see timeSafety.test.ts).
    await reopened.timeShift(3);
    expect(shifted(reopened)).toBe(true);
  });

  it.each(['SPARE', 'HELP', 'KILL', 'CAPTURE'] as LifeChoiceId[])(
    '%s: a shift leaks nothing, before or after a reopen',
    async (choice) => {
      const dbName = freshDbName();
      const world = await openWorld(dbName);
      await world.recordGaldLifeChoice(choice);
      await world.timeShift(3);

      // Their own decision and the fact that time passed. His three
      // years are still not theirs until they go and look.
      const known = (w: World) => w.getKnownEvents().map((e) => e.type).sort();
      expect(known(world)).toEqual(['WORLD_TIME_SHIFTED', `PLAYER_${
        { SPARE: 'SPARED', HELP: 'HELPED', KILL: 'KILLED', CAPTURE: 'CAPTURED' }[choice]
      }_GALD`].sort());
      expect(world.getEvents().length, 'while the world knows more').toBeGreaterThan(2);
      expect(known(await openWorld(dbName)), 'and a reopen tells them no more').toEqual(known(world));
    },
  );

  it('an old save that predates the shift still opens, and can still take it', async () => {
    // A world saved before any of this existed has no
    // WORLD_TIME_SHIFTED row, which is exactly what "not yet" looks
    // like — so nothing needed migrating and nothing needs to now.
    const dbName = freshDbName();
    const old = await openWorld(dbName);
    await old.recordGaldLifeChoice('SPARE');
    await old.advanceDays(5);

    const reopened = await openWorld(dbName);
    expect(shifted(reopened)).toBe(false);
    await reopened.timeShift(3);
    expect(shifted(reopened)).toBe(true);
    expect(reopened.getClock().worldYear).toBe(4);
  });

  /**
   * THE GAP, WRITTEN DOWN.
   *
   * A, B and C leave the world in byte-identical states: the choice is
   * recorded, no shift has happened, and nothing anywhere says whether
   * Kaos has asked yet or been turned down. That is why resuming out
   * of B cannot currently be told from resuming out of C, and why the
   * fix needs either a new piece of saved information or a ruling that
   * resume re-offers to both.
   *
   * When that lands, THIS TEST SHOULD FAIL, and its failure is the
   * signal that the states became distinguishable on purpose.
   */
  it('A, B and C are indistinguishable in the save — the known gap', async () => {
    const rows = async (label: string) => {
      const dbName = freshDbName();
      const world = await openWorld(dbName);
      await world.recordGaldLifeChoice('SPARE');
      // Whatever the screen did next — never shown, shown, or shown and
      // declined — it wrote nothing, so all three read the same.
      return {
        label,
        shifted: shifted(world),
        clock: world.getClock(),
        events: world.getEvents().map((e) => e.type),
        resumeArea: world.getResumeArea(),
      };
    };
    const a = await rows('A never offered');
    const b = await rows('B offered');
    const c = await rows('C declined');
    expect({ ...b, label: '' }).toEqual({ ...a, label: '' });
    expect({ ...c, label: '' }).toEqual({ ...a, label: '' });
  });
});
