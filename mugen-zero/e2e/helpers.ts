import { expect, type Page } from './fixtures';
import { GREENWOOD_GROUND_SPOTS } from '../src/game/exploration/discovery';
import { GREENWOOD_GROUND, groundFraction } from '../src/game/exploration/walkable';

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
          const rq = db
            .transaction('memory_events', 'readonly')
            .objectStore('memory_events')
            .getAll();
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
          const rq = db
            .transaction('meta', 'readonly')
            .objectStore('meta')
            .get('saveSchemaVersion');
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
          const rq = db
            .transaction('world_state', 'readonly')
            .objectStore('world_state')
            .get(stateKey);
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
  await page.mouse.click(box.x + box.width * GALD_TAP.fx, box.y + box.height * GALD_TAP.fy);
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

  // The game's battle screen — the story's fight is on it now, the
  // same one the forest's is. Every spec that only wants to GET here
  // reads these two ids from this helper and nowhere else, which is
  // why moving the fight cost one line each rather than twenty.
  await expect(page.getByTestId('battle-prototype')).toBeVisible();
  if (stopAt === 'BATTLE') return;
  await swingUntil(page, 'bp-attack', () =>
    page.getByTestId('life-choice-screen').isVisible().catch(() => false),
  );
  await expect(page.getByTestId('life-choice-screen')).toBeVisible({
    timeout: 10_000,
  });
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

/**
 * Where to tap on the forest canvas to walk to each gold ring.
 *
 * Fractions of the canvas, derived from the game's own definition of
 * the eight places — not eight pairs of pixels copied into eight spec
 * files, which is what these were, and which is why moving the forest
 * broke seventy tests at once. If the rings move again, this moves with
 * them and nothing else has to.
 */
export const RING_TAPS: readonly { fx: number; fy: number }[] = GREENWOOD_GROUND_SPOTS.map((s) =>
  groundFraction(GREENWOOD_GROUND, s.along, s.depth),
);

/** And where the scripted first meeting stands, the same way. */
export const GALD_TAP = groundFraction(GREENWOOD_GROUND, 0.28, 0.3);

/** Tap a place on the forest canvas given as fractions of it. */
export async function tapField(
  page: Page,
  at: { fx: number; fy: number } = GALD_TAP,
): Promise<void> {
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  await page.mouse.click(box.x + box.width * at.fx, box.y + box.height * at.fy);
}

/**
 * Walk the rings in turn until something happens.
 *
 * One copy of the loop that every forest spec was keeping its own
 * version of, with its own count of how many times to try — and
 * bounded by TIME rather than by that count, for the same reason
 * swingUntil is: a walk across the clearing takes as long as it takes,
 * and on a machine running three browsers at once that is a good deal
 * longer than fourteen frames. A tries-bounded loop gives up mid-walk
 * and taps somewhere else, which cancels the walk it was waiting for.
 */
export async function walkTheForestUntil(
  page: Page,
  arrived: () => Promise<boolean>,
  budgetMs = 60_000,
): Promise<boolean> {
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  const perSpot = Math.max(1500, Math.round(budgetMs / RING_TAPS.length));
  for (const at of RING_TAPS) {
    await page.mouse.click(box.x + box.width * at.fx, box.y + box.height * at.fy);
    const until = Date.now() + perSpot;
    while (Date.now() < until) {
      await page.waitForTimeout(180);
      if (await arrived()) return true;
    }
  }
  return false;
}

/**
 * Keep swinging until the fight is over.
 *
 * Bounded by TIME rather than by a count of iterations, which is the
 * property that actually matters now that a fight is twenty-odd
 * exchanges instead of three: a swing that arrives mid-animation is
 * retried rather than counted, so a loaded machine costs the loop
 * seconds instead of turns. Every forest and story fight in the suite
 * goes through here, so there is one place that knows how long a fight
 * is allowed to take.
 *
 * The budget is generous because four of these run at once on a
 * four-core machine, and a fight the player would finish in ninety
 * seconds takes considerably longer when the browser running it is
 * sharing a core with three others.
 */
export async function swingUntil(
  page: Page,
  attackTestId: string,
  done: () => Promise<boolean>,
  budgetMs = 150_000,
): Promise<boolean> {
  const attack = page.getByTestId(attackTestId);
  // Fail loudly and immediately if there is no fight to swing at.
  // Without this, a walk that never reached the enemy spends the whole
  // budget pressing a button that is not there and then reports the
  // wrong thing entirely — "the life choice never appeared" rather than
  // "the fight never started".
  await expect(attack, `${attackTestId} must be on screen before swinging`).toBeVisible({
    timeout: 15_000,
  });
  const deadline = Date.now() + budgetMs;
  while (Date.now() < deadline) {
    if (await done()) return true;
    // PRESSED BY IDENTITY, NOT BY POSITION.
    //
    // Between one blow and the next the commands are mid-animation, and
    // Playwright will not press a button that is still moving — on a
    // loaded machine that is most of them, and a fight that takes
    // twenty-four swings never lands them. That is why this used to pass
    // `force: true`.
    //
    // But forcing does not just skip the "is it still moving" check, it
    // skips "is this element the one under the cursor" as well, and this
    // loop runs right up to the moment the fight ends. What replaces the
    // commands is the four answers — 殺す / 逃がす / 助ける / 捕らえる —
    // so a forced swing dispatched a frame after the last blow landed on
    // whichever answer had taken that spot, and the helper every story
    // test in the suite depends on could choose a life while believing
    // it swung a sword. (The awakening scene, a full-screen button laid
    // over the fight at `inset: 0`, is the same hazard earlier in the
    // same fight.)
    //
    // Resolving the test id and pressing THAT element has neither
    // problem: no coordinate is involved, so nothing else can receive
    // it, and there is no actionability wait to lose the race in. The
    // `disabled` check is the one rule worth keeping from the real
    // thing — it is what stops the fight being swung at after it is
    // over — and it is read and acted on in the same page task, so
    // nothing can change in between.
    //
    // The budget is not optional. The commands are unmounted outright
    // while Kaos intervenes, while an accident plays, and for good once
    // the creature is down — and without a timeout this waits for a
    // button that is never coming back, so the loop stops re-reading its
    // own deadline and the test dies of old age instead of reporting
    // that the fight never ended.
    //
    // 800ms, DOWN FROM 2500, and the number matters now. Once the
    // commands are gone this timeout IS the loop's blind spot: `done()`
    // is not asked again until it expires. An ordinary win used to sit
    // on screen behind a 森へ戻る button until somebody pressed it, so a
    // blind spot of any size was harmless; the screen walks the player
    // back by itself after VICTORY_WAIT_MS now, and at 2500 the loop
    // stepped clean over that whole window — the fight was won, the
    // creature lay down, the screen moved on, and every test watching
    // for the beaten creature found the next screen instead. Anything
    // comfortably under the victory wait works; this leaves a margin of
    // more than a second and still lets a present button through at
    // once.
    await attack
      .evaluate(
        (el) => {
          if (el instanceof HTMLButtonElement && !el.disabled) el.click();
        },
        undefined,
        { timeout: 800 },
      )
      .catch(() => {});
    await page.waitForTimeout(70);
  }
  return done();
}
