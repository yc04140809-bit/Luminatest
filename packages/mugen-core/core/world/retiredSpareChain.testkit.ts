import { World } from './world';
import { IdbMemoryStore } from '../memory/idbStore';
import type { MemoryEvent } from '../memory/types';
import { INITIAL_GALD_STATE } from '../../content/characters/gald';

/**
 * A SAVE THAT ALREADY LIVED THE RETIRED SPARE CHAIN (tests only).
 *
 * ROUTE D (作者 2026-10-20) retired the Ver0.1 SPARE chain — the let-go man
 * drifting into Alden and opening a bakery of his own. No new world takes
 * it; a save written before then may already hold it, and must still read
 * its own past: the bakery open, the reunion there, the record of his life.
 * This writes exactly such a save: the answer, his leaving, his arrival in
 * Alden on day 34 and the bakery on day 94 — the dates that chain always
 * gave — with Gald where it left him. `shifted` adds what the old TIME
 * SHIFT did: three real years on the clock, after all of it.
 */
export async function openSaveThatLivedTheRetiredSpareChain(
  dbName: string,
  { shifted = false }: { shifted?: boolean } = {},
): Promise<World> {
  const world = await World.open(new IdbMemoryStore(dbName));
  await world.recordGaldLifeChoice('SPARE');
  await world.advanceDays(3); // day 4: he leaves the bandits
  const event = (type: MemoryEvent['type'], worldDay: number, causedBy: MemoryEvent['type']): MemoryEvent => ({
    id: type === 'GALD_ARRIVES_IN_ALDEN' ? 'evt_gald_arrives_in_alden' : 'evt_gald_becomes_baker',
    type,
    worldYear: 1,
    worldDay,
    location: 'ALDEN_VILLAGE',
    actors: ['GALD'],
    importance: 'MAJOR',
    createdAt: new Date(0).toISOString(),
    causedBy: [causedBy],
  });
  const store = (world as unknown as { store: IdbMemoryStore }).store;
  await store.commit({
    addEvents: [
      event('GALD_ARRIVES_IN_ALDEN', 34, 'GALD_LEAVES_BANDITS'),
      event('GALD_BECOMES_BAKER', 94, 'GALD_ARRIVES_IN_ALDEN'),
    ],
    putState: [
      { key: 'world_clock', value: { worldYear: 1, worldDay: 94 } },
      { key: 'character_GALD', value: { ...INITIAL_GALD_STATE, occupation: 'BAKER', location: 'ALDEN_VILLAGE' } },
    ],
  });
  const reopened = await World.open(new IdbMemoryStore(dbName));
  if (shifted) await reopened.timeShift(3);
  return reopened;
}
