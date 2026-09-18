// WHERE THE APP KEEPS A WORLD.
//
// THE POINT OF THIS FILE IS THAT IT IS SMALL. The world, the
// migrations, the validating readers, the backup and the corruption
// recovery are all in the shared core and none of them is repeated
// here; what an app gets to decide is only WHERE the rows go. That is
// the whole of the platform boundary for saving, and it is a dozen
// lines because the core was built with a `MemoryEventStore`
// interface rather than a database.
//
// TODAY it is IndexedDB, which is what a WebView gives us for nothing
// and what the Artifact already uses. The day this wants SQLite
// through a Capacitor plugin — and on iOS it probably will, because
// WKWebView will throw IndexedDB away under storage pressure — that is
// a new class implementing the same interface and no change anywhere
// above this line.
//
// A DIFFERENT DATABASE NAME FROM THE ARTIFACT, on purpose. They are
// two builds of the same game at different stages, and a player
// testing both on one phone must not have the older one's save quietly
// migrated by the newer one.
import { World } from '@mugen/core/world/world';
import { IdbMemoryStore } from '@mugen/core/memory/idbStore';
import { MemoryOnlyStore } from '@mugen/core/memory/memoryOnlyStore';

export const APP_DB_NAME = 'mugen-zero-app';

export interface OpenedWorld {
  world: World;
  /** False when nothing written this session will outlive the session. */
  saving: boolean;
}

/**
 * Opens the app's world, and never refuses to start.
 *
 * The same bargain the Artifact makes: a device that will not give us
 * a database still gets the game, and is told plainly that nothing is
 * being kept. The fallback is the same class, so there is no second,
 * less-tested game hiding behind the failure.
 */
export async function openAppWorld(): Promise<OpenedWorld> {
  try {
    return { world: await World.open(new IdbMemoryStore(APP_DB_NAME)), saving: true };
  } catch (e) {
    console.error('No save is available — playing without one', e);
    return { world: await World.open(new MemoryOnlyStore()), saving: false };
  }
}
