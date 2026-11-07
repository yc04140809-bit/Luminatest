// A SAVE THAT LIVES ONLY AS LONG AS THE TAB DOES.
//
// IndexedDB is not always there. A browser in private mode may refuse
// it, a strict site-data setting may block it, an embedded webview may
// simply not have it, and a disk that is full fails the open. Before
// this, all of those ended the same way: an error screen saying the
// save could not be read, and no game at all.
//
// THE DECISION, WRITTEN DOWN HERE BECAUSE THIS IS WHERE IT IS ACTED
// ON: playable without saving, rather than refusing to start. MUGEN
// ZERO is looked at far more often than it is played through — an
// Artifact somebody opens once, on whatever browser they happen to be
// holding — and for that, "you cannot play" is a worse answer than
// "you can play, and it will not be here tomorrow". A player who
// cannot start learns nothing about the game; a player who can, does.
//
// WHAT THIS IS NOT: a second save system. It is the same interface
// with a Map behind it, so every line of the game above it — the
// world, the migrations, the readers, the recovery — runs completely
// unchanged and does not know the difference. Nothing here has its own
// rules, and there is no code path where the game behaves differently
// because the save happens to be in memory. That is the whole reason
// it is safe to fall back to.
//
// WHAT IS LOST, precisely: everything, the moment the tab is closed or
// reloaded. Within one session it behaves exactly like a real save,
// 「つづきから」 included — because within one session it IS the save.

import type { MemoryEvent, MemoryEventStore, WorldStateRow } from './types';

export class MemoryOnlyStore implements MemoryEventStore {
  private events = new Map<string, MemoryEvent>();
  private state = new Map<string, unknown>();
  private meta = new Map<string, unknown>();

  async init(): Promise<void> {
    /* nothing to open */
  }

  async getAll(): Promise<MemoryEvent[]> {
    return [...this.events.values()];
  }

  async add(event: MemoryEvent): Promise<void> {
    await this.commit({ addEvents: [event] });
  }

  /**
   * One commit, all or nothing — the same promise the real store makes.
   *
   * It matters even here. The write-once rule on history is a rule
   * about the GAME, not about IndexedDB: code above this line is
   * allowed to rely on a duplicate id being refused and on a refused
   * commit leaving nothing behind, and a fallback that quietly relaxed
   * either would be a different game rather than the same game without
   * a disk.
   */
  async commit(changes: {
    addEvents?: MemoryEvent[];
    putState?: WorldStateRow[];
    deleteEventIds?: string[];
  }): Promise<void> {
    const { addEvents = [], putState = [], deleteEventIds = [] } = changes;
    for (const event of addEvents) {
      if (this.events.has(event.id)) {
        throw new Error(`Duplicate event id: ${event.id}`);
      }
    }
    for (const id of deleteEventIds) this.events.delete(id);
    for (const event of addEvents) this.events.set(event.id, event);
    for (const row of putState) this.state.set(row.key, row.value);
  }

  async getStateValue(key: string): Promise<unknown | undefined> {
    return this.state.get(key);
  }

  async getAllState(): Promise<WorldStateRow[]> {
    return [...this.state.entries()].map(([key, value]) => ({ key, value }));
  }

  async getMeta(key: string): Promise<unknown | undefined> {
    return this.meta.get(key);
  }

  async setMeta(key: string, value: unknown): Promise<void> {
    this.meta.set(key, value);
  }

  async clearAll(): Promise<void> {
    this.events.clear();
    this.state.clear();
    this.meta.clear();
  }

  close(): void {
    /* nothing to close */
  }
}
