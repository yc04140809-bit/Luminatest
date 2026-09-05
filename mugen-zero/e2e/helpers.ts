import { expect, type Page } from './fixtures';

export interface StoredMemoryEvent {
  id: string;
  type: string;
  worldYear: number;
  worldDay: number;
  location: string;
  actors: string[];
  importance: string;
  createdAt: string;
}

/**
 * Reads all MEMORY_EVENTs straight out of IndexedDB (the source of truth).
 * RESET WORLD reloads the page, so a read can land mid-navigation; retry
 * once after the load settles rather than failing the test.
 */
export async function readMemoryEvents(page: Page): Promise<StoredMemoryEvent[]> {
  try {
    return await readMemoryEventsOnce(page);
  } catch (e) {
    if (!String(e).includes('Execution context was destroyed')) throw e;
    await page.waitForLoadState('load');
    return readMemoryEventsOnce(page);
  }
}

function readMemoryEventsOnce(page: Page): Promise<StoredMemoryEvent[]> {
  return page.evaluate(
    () =>
      new Promise<StoredMemoryEvent[]>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('memory_events')) {
            db.close();
            resolve([]);
            return;
          }
          const rq = db.transaction('memory_events', 'readonly').objectStore('memory_events').getAll();
          rq.onsuccess = () => {
            db.close();
            resolve(rq.result as StoredMemoryEvent[]);
          };
          rq.onerror = () => reject(rq.error);
        };
      }),
  );
}

/** Reads the saveSchemaVersion from the meta store. */
export function readSchemaVersion(page: Page): Promise<number | null> {
  return page.evaluate(
    () =>
      new Promise<number | null>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('meta')) {
            db.close();
            resolve(null);
            return;
          }
          const rq = db.transaction('meta', 'readonly').objectStore('meta').get('saveSchemaVersion');
          rq.onsuccess = () => {
            db.close();
            resolve(rq.result ? rq.result.value : null);
          };
          rq.onerror = () => reject(rq.error);
        };
      }),
  );
}

/** Reads one current-state row (world_clock, character_GALD, …) from IndexedDB. */
export function readWorldStateValue(page: Page, key: string): Promise<unknown> {
  return page.evaluate(
    (stateKey) =>
      new Promise((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('world_state')) {
            db.close();
            resolve(undefined);
            return;
          }
          const rq = db.transaction('world_state', 'readonly').objectStore('world_state').get(stateKey);
          rq.onsuccess = () => {
            db.close();
            resolve(rq.result ? rq.result.value : undefined);
          };
          rq.onerror = () => reject(rq.error);
        };
      }),
    key,
  );
}

/** Clicks REST on the HOME screen n times, waiting out each day advance. */
export async function advanceDays(page: Page, n: number): Promise<void> {
  const button = page.getByTestId('rest-button');
  const clock = page.getByTestId('world-clock');
  for (let i = 0; i < n; i++) {
    const before = await clock.textContent();
    await expect(button).toBeEnabled();
    await button.click();
    await expect(clock).not.toHaveText(before ?? '');
  }
}

/** Walks the player to the "!" marker in the Greenwood Phaser scene. */
export async function walkToEncounterMarker(page: Page): Promise<void> {
  const canvas = page.locator('.phaser-wrap canvas');
  await expect(canvas).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(500); // let the scene finish booting
  const box = await canvas.boundingBox();
  if (!box) throw new Error('canvas bounding box unavailable');
  await page.mouse.click(box.x + box.width * (180 / 360), box.y + box.height * (120 / 520));
}

/** Fresh world: plays TITLE through BATTLE until the life choice appears. */
export async function playToLifeChoice(
  page: Page,
  base = '',
  options: { stopAt?: 'ENCOUNTER' | 'BATTLE' | 'LIFE_CHOICE' } = {},
): Promise<void> {
  const stopAt = options.stopAt ?? 'LIFE_CHOICE';
  await page.goto(`${base}/`);
  await page.getByTestId('start-button').click();

  const monologue = page.getByTestId('prologue-monologue');
  await expect(monologue).toBeVisible();
  await monologue.click();
  const kaos = page.getByTestId('kaos-intro');
  await expect(kaos).toBeVisible();
  for (let i = 0; i < 6; i++) await kaos.click();

  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await walkToEncounterMarker(page);

  const encounter = page.getByTestId('gald-encounter');
  await expect(encounter).toBeVisible({ timeout: 15_000 });
  if (stopAt === 'ENCOUNTER') return;
  await encounter.click();
  await encounter.click();

  await expect(page.getByTestId('battle-screen')).toBeVisible();
  if (stopAt === 'BATTLE') return;
  const attack = page.getByTestId('attack-button');
  for (let i = 0; i < 8; i++) {
    if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) break;
    if (await attack.isEnabled().catch(() => false)) await attack.click();
    await page.waitForTimeout(150);
  }
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 10_000 });
}


/**
 * Into DEV ADMIN, whether or not the lock is standing in the way.
 *
 * The lock is opened once per run of the app rather than once per
 * visit, so a test that goes in, comes out and goes in again meets it
 * the first time and not the second. Both screens are lazy-loaded, so
 * "is the lock showing?" has to be waited for rather than asked.
 *
 * Every spec that needs the developer tools goes through here, so
 * there is one place that knows this and not twenty-three.
 */
export async function enterDevAdmin(page: Page): Promise<void> {
  await page.getByTestId('dev-admin-entry').click();
  const lock = page.getByTestId('dev-lock-screen');
  const admin = page.getByTestId('dev-admin-back');
  await expect(lock.or(admin)).toBeVisible({ timeout: 20_000 });
  if (await lock.isVisible()) {
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
  }
  await expect(admin).toBeVisible({ timeout: 20_000 });
}

/**
 * The three phones the game is judged on — held the way it is played.
 *
 * MUGEN ZERO is landscape now, so a "360px phone" is 800x360 on screen.
 * The numbers are the same three devices as before, turned; one place
 * knows that, and every spec that checks the layout reads it from here.
 */
export const PHONES = [
  { name: '800x360', width: 800, height: 360 },
  { name: '844x390', width: 844, height: 390 },
  { name: '915x412', width: 915, height: 412 },
] as const;

export type Phone = (typeof PHONES)[number];

/** The viewport for one of them, without its name. */
export function viewportOf(phone: Phone): { width: number; height: number } {
  return { width: phone.width, height: phone.height };
}
