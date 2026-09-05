import { test, expect, type Page } from './fixtures';
import { PHONES, viewportOf } from './helpers';

/**
 * ADMIN DEV TOOLS — the lock, and the cinematic preview behind it.
 *
 * Two things are being protected. The first is that an ordinary player
 * never falls into the developer tools by accident. The second, and
 * the one with teeth, is that looking at a piece of theatre changes
 * nothing at all: not health, not the book, not what has been
 * observed, not a cooldown, not the save. The last describe block
 * takes a photograph of the whole world before and after and insists
 * they are identical.
 */

async function freshWorld(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    localStorage.clear();
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function unlock(page: Page) {
  await page.getByTestId('dev-admin-entry').click();
  const lock = page.getByTestId('dev-lock-screen');
  const admin = page.getByTestId('open-cinematic-preview');
  // Both screens are lazy-loaded, so asking "is the lock showing?" the
  // instant after the click asks it of a page that has not finished
  // arriving. Wait for whichever one turns up.
  await expect(lock.or(admin)).toBeVisible({ timeout: 20_000 });
  if (await lock.isVisible()) {
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
  }
  await expect(admin).toBeVisible({ timeout: 20_000 });
}

/** Into the preview of the one thing there is to preview. */
async function openPreview(page: Page) {
  await unlock(page);
  await page.getByTestId('open-cinematic-preview').click();
  await expect(page.getByTestId('cinematic-preview')).toBeVisible();
  await page.getByTestId('preview-UNKNOWN_ANCIENT_DRAGON_001').click();
  await expect(page.getByTestId('preview-play-FULL')).toBeVisible();
}

/**
 * Everything the game remembers, as one comparable object.
 *
 * Read straight out of the store rather than off the screen: a preview
 * that quietly bumped a counter would still look right in the UI, and
 * this is the assertion that would catch it.
 */
async function snapshot(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    const out: Record<string, unknown> = {};
    for (const info of dbs) {
      if (!info.name) continue;
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open(info.name!);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      for (const store of Array.from(db.objectStoreNames)) {
        const rows = await new Promise<unknown[]>((resolve) => {
          const req = db.transaction(store, 'readonly').objectStore(store).getAll();
          req.onsuccess = () => resolve(req.result as unknown[]);
          req.onerror = () => resolve([]);
        });
        out[`${info.name}/${store}`] = rows;
      }
      db.close();
    }
    out['localStorage'] = { ...localStorage };
    return JSON.stringify(out);
  });
}

// ---------------------------------------------------------------
// PHASE 1 — the lock
// ---------------------------------------------------------------

test.describe('the way in', () => {
  test('is not somewhere a player falls into', async ({ page }) => {
    await freshWorld(page);
    // Nothing on HOME that reads as a feature: one small mark, and a
    // lock behind it. The buttons a player actually uses are elsewhere.
    const entry = page.getByTestId('dev-admin-entry');
    await expect(entry).toBeVisible();
    const box = (await entry.boundingBox())!;
    const explore = (await page.getByTestId('explore-button').boundingBox())!;
    expect(box.width * box.height, 'the dev entry is far smaller than a real one').toBeLessThan(
      explore.width * explore.height * 0.35,
    );
    await entry.click();
    // And it opens a lock, not the tools.
    await expect(page.getByTestId('dev-lock-screen')).toBeVisible();
    await expect(page.getByTestId('open-cinematic-preview')).toHaveCount(0);
  });

  test('asks for a number, and says so in the player’s language', async ({ page }) => {
    await freshWorld(page);
    await page.getByTestId('dev-admin-entry').click();
    const screen = page.getByTestId('dev-lock-screen');
    await expect(screen).toContainText('管理者ページ');
    await expect(screen).toContainText('ロックNo.を入力');
    const input = page.getByTestId('dev-lock-input');
    // Not shown as it is typed, and a phone gets a number pad.
    await expect(input).toHaveAttribute('type', 'password');
    await expect(input).toHaveAttribute('inputmode', 'numeric');
  });

  test('refuses the wrong number without touching anything', async ({ page }) => {
    await freshWorld(page);
    const before = await snapshot(page);
    await page.getByTestId('dev-admin-entry').click();
    for (const wrong of ['1234', '909', '09090', '']) {
      await page.getByTestId('dev-lock-input').fill(wrong);
      await page.getByTestId('dev-lock-submit').click();
      await expect(page.getByTestId('dev-lock-error')).toContainText('ロックNo.が違います');
      await expect(page.getByTestId('dev-lock-screen')).toBeVisible();
    }
    // No reload, no reset, no write.
    expect(await snapshot(page)).toBe(before);
  });

  test('takes 0909 — as four characters, not as nine hundred and nine', async ({ page }) => {
    // The leading zero is the whole point of comparing strings. "0909"
    // through a number would be 909, and 909 would open the lock.
    await freshWorld(page);
    await page.getByTestId('dev-admin-entry').click();
    await page.getByTestId('dev-lock-input').fill('909');
    await page.getByTestId('dev-lock-submit').click();
    await expect(page.getByTestId('dev-lock-error')).toBeVisible();

    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
    await expect(page.getByTestId('open-cinematic-preview')).toBeVisible();
  });

  test('remembers within a run of the app, and forgets when it closes', async ({ page }) => {
    await freshWorld(page);
    await unlock(page);
    await expect(page.getByTestId('open-cinematic-preview')).toBeVisible();

    // Same run: no second interrogation.
    await page.getByTestId('dev-admin-back').click();
    await page.getByTestId('dev-admin-entry').click();
    await expect(page.getByTestId('open-cinematic-preview')).toBeVisible();

    // Nothing about being unlocked was written down.
    const stored = await page.evaluate(() => JSON.stringify({ ...localStorage }));
    expect(stored.toLowerCase()).not.toContain('unlock');
    expect(stored).not.toContain('0909');

    // A closed app asks again. (This world has no history to continue,
    // so the title offers 「はじめる」 — either way it is a fresh run of
    // the app, which is exactly what the unlock must not survive.)
    await page.reload();
    const cont = page.getByTestId('continue-button');
    const start = page.getByTestId('start-button');
    await expect(cont.or(start)).toBeVisible({ timeout: 20_000 });
    if (await cont.isVisible()) {
      await cont.click();
    } else {
      await start.click();
      await page.getByTestId('prologue-monologue').click();
      const kaos = page.getByTestId('kaos-intro');
      for (let i = 0; i < 6; i++) await kaos.click();
    }
    await expect(page.getByTestId('world-clock')).toBeVisible();
    await page.getByTestId('dev-admin-entry').click();
    await expect(page.getByTestId('dev-lock-screen')).toBeVisible();
  });
});

// ---------------------------------------------------------------
// PHASE 2 — the preview
// ---------------------------------------------------------------

test.describe('the preview', () => {
  test('is reached through ARCANA ＞ 召喚事故 ＞ UNKNOWN #001', async ({ page }) => {
    await freshWorld(page);
    await unlock(page);
    await page.getByTestId('open-cinematic-preview').click();
    const list = page.getByTestId('cinematic-preview');
    await expect(list).toContainText('ARCANA');
    await expect(list).toContainText('召喚事故');
    await expect(list).toContainText('UNKNOWN #001');
    // The internal id is fine for a developer; the creature's real
    // name does not exist yet and is not invented here.
    await expect(list).toContainText('UNKNOWN_ANCIENT_DRAGON_001');
    await expect(list).not.toContainText('古代龍');
  });

  test('shows the thing at the size it will actually be', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    await page.getByTestId('preview-play-DRAGON').click();
    await expect(page.getByTestId('bp-dragon')).toBeVisible();

    const art = (await page.locator('.bp-dragon-art').boundingBox())!;
    const stage = (await page.locator('.bp-stage').boundingBox())!;
    expect((art.width * art.height) / (stage.width * stage.height)).toBeGreaterThan(0.5);
    // Facing the side an enemy stands on, by mirroring and nothing else.
    const transform = await page
      .locator('.bp-dragon-art')
      .evaluate((el) => getComputedStyle(el).transform);
    expect(transform.startsWith('matrix(-1')).toBe(true);
    // Held still: a single piece must not walk on into the next one.
    await page.waitForTimeout(2500);
    await expect(page.getByTestId('bp-dragon')).toBeVisible();
    await expect(page.getByTestId('bp-breath')).toHaveCount(0);
  });

  test('plays the cut-in without printing its name a second time', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    await page.getByTestId('preview-play-BREATH').click();
    const breath = page.getByTestId('bp-breath');
    await expect(breath).toBeVisible();
    await expect(page.locator('.bp-breath-art')).toHaveJSProperty('naturalWidth', 1536);
    // The lettering is in the artwork. Nothing on this screen repeats
    // it — not even the caption naming what is being previewed.
    const text = await page.getByTestId('cinematic-preview').innerText();
    expect(text).not.toContain('エンシェントブレス');
    expect(text).not.toContain('ANCIENT BREATH');
  });

  test('plays the whole thing in the order the fight plays it', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    await page.getByTestId('preview-play-FULL').click();

    // Her reaction and the page coming apart.
    const card = page.getByTestId('bp-accident-card');
    await expect(card).toBeVisible({ timeout: 8_000 });
    await expect(card).toContainText('え？');
    await expect(card).toContainText('UNKNOWN');
    await expect(card).not.toContainText('#001モスラビット');
    // Then the thing, then its move.
    await expect(page.getByTestId('bp-dragon')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('bp-breath')).toBeVisible({ timeout: 10_000 });
    // Then nobody explains it.
    const talk = page.getByTestId('bp-accident-talk');
    await expect(talk).toBeVisible({ timeout: 15_000 });
    await expect(talk).toContainText('今の、何だったんだ？');
    await expect(talk).toContainText('知らない');
    await talk.click();
    // And it is over, with a way to see it again.
    await expect(page.getByTestId('preview-caption')).toContainText('PREVIEW END');
    await expect(page.getByTestId('preview-replay')).toBeVisible();
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
  });

  test('replays without going anywhere', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    await page.getByTestId('preview-play-DRAGON').click();
    await expect(page.getByTestId('bp-dragon')).toBeVisible();
    await page.getByTestId('preview-replay').click();
    await expect(page.getByTestId('bp-dragon')).toBeVisible();
    // And leaves cleanly, mid-sequence if need be.
    await page.getByTestId('preview-exit').click();
    await expect(page.getByTestId('preview-play-FULL')).toBeVisible();
    await page.getByTestId('preview-play-FULL').click();
    await expect(page.getByTestId('bp-accident-card')).toBeVisible({ timeout: 8_000 });
    await page.getByTestId('preview-exit').click();
    await expect(page.getByTestId('preview-play-FULL')).toBeVisible();
    await expect(page.getByTestId('bp-dragon')).toHaveCount(0);
    await page.getByTestId('preview-list-back').click();
    await page.getByTestId('preview-back').click();
    await expect(page.getByTestId('open-cinematic-preview')).toBeVisible();
  });

  test('says it is a preview, without covering what is being previewed', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    await page.getByTestId('preview-play-DRAGON').click();
    const badge = page.getByTestId('preview-badge');
    await expect(badge).toBeVisible();
    await expect(badge).toContainText('PREVIEW');
    const box = (await badge.boundingBox())!;
    const stage = (await page.locator('.bp-stage').boundingBox())!;
    expect((box.width * box.height) / (stage.width * stage.height)).toBeLessThan(0.05);
    // No enemy exists here, and the plates hold no numbers.
    await expect(page.getByTestId('preview-dummy')).toContainText('DUMMY');
    await expect(page.getByTestId('preview-dummy')).not.toContainText('モスラビット');
  });

  test('is not a fight: nothing in it can be attacked or decided', async ({ page }) => {
    await freshWorld(page);
    await openPreview(page);
    await page.getByTestId('preview-play-FULL').click();
    for (const id of ['bp-attack', 'bp-skill', 'bp-arcana', 'bp-mugen-choice', 'bp-summon-card']) {
      await expect(page.getByTestId(id)).toHaveCount(0);
    }
  });
});

// ---------------------------------------------------------------
// The rule the whole screen exists under
// ---------------------------------------------------------------

test.describe('a preview changes nothing', () => {
  test('the whole save is byte-for-byte what it was', async ({ page }) => {
    await freshWorld(page);
    // Give the world something to lose: a book with progress in it, a
    // sighting already recorded, and a cooldown running.
    await unlock(page);
    await page.getByTestId('arcana-set-中').click();
    await page.getByTestId('force-summon-ACCIDENT').click();
    await page.getByTestId('force-story-off').click();
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-accident-talk')).toBeVisible({ timeout: 16_000 });
    await page.getByTestId('bp-accident-talk').click();
    await page.reload();
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();

    const before = await snapshot(page);
    expect(before).toContain('UNKNOWN_ANCIENT_DRAGON_001');

    // Now play every piece of theatre there is.
    await openPreview(page);
    for (const piece of ['DRAGON', 'BREATH', 'FULL'] as const) {
      await page.getByTestId(`preview-play-${piece}`).click();
      if (piece === 'FULL') {
        await expect(page.getByTestId('bp-accident-talk')).toBeVisible({ timeout: 16_000 });
        await page.getByTestId('bp-accident-talk').click();
      } else {
        await expect(page.getByTestId('bp-dragon')).toBeVisible({ timeout: 10_000 });
      }
      await page.getByTestId('preview-exit').click();
    }
    await page.getByTestId('preview-list-back').click();
    await page.getByTestId('preview-back').click();

    // Health, the book, the sighting, the count, the cooldown, the
    // clock, WORLD MEMORY — all of it, unchanged.
    expect(await snapshot(page)).toBe(before);
  });

  test('and the game on the other side of it still works', async ({ page }) => {
    await freshWorld(page);
    await unlock(page);
    await page.getByTestId('arcana-set-中').click();
    await page.getByTestId('open-cinematic-preview').click();
    await page.getByTestId('preview-UNKNOWN_ANCIENT_DRAGON_001').click();
    await page.getByTestId('preview-play-FULL').click();
    await expect(page.getByTestId('bp-dragon')).toBeVisible({ timeout: 12_000 });
    await page.getByTestId('preview-exit').click();
    await page.getByTestId('preview-list-back').click();
    await page.getByTestId('preview-back').click();

    // Straight back into a real fight, which behaves exactly as it did.
    await page.getByTestId('force-summon-SUCCESS').click();
    await page.getByTestId('force-story-off').click();
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-message')).toContainText(/森の加護|回復/, {
      timeout: 8_000,
    });
    await expect(page.getByTestId('bp-player-hp')).toContainText('40 / 40');

    // And the book is where it was: 30%, one page, no sighting.
    await page.reload();
    await page.getByTestId('continue-button').click();
    await page.getByTestId('arcana-button').click();
    await expect(page.getByTestId('arcana-pct-moss_rabbit')).toContainText('30%');
    await expect(page.getByTestId('arcana-count')).toContainText('1 / 1');
    await expect(page.getByTestId('arcana-unknown-count')).toHaveCount(0);
  });
});

test.describe('the accident pool', () => {
  test('TEST 4 — the preview plays whatever the save owns', async ({ page }) => {
    // The gameplay pool and the preview pool are different lists on
    // purpose. A creature the player has acquired never crosses them
    // by chance again, and its cut-in can still break — so the admin
    // must be able to look at it either way. The preview is not handed
    // a world at all, so there is nothing for ownership to hide.
    await freshWorld(page);
    await unlock(page);
    // Finish an ARCANA outright, so the save genuinely owns something.
    await page.getByTestId('arcana-set-COMPLETE').click();
    await page.getByTestId('open-cinematic-preview').click();
    await page.getByTestId('preview-UNKNOWN_ANCIENT_DRAGON_001').click();
    await page.getByTestId('preview-play-FULL').click();
    await expect(page.getByTestId('bp-dragon')).toBeVisible({ timeout: 12_000 });
  });

  test('the admin panel says why a candidate is in or out', async ({ page }) => {
    await freshWorld(page);
    await unlock(page);
    const state = page.getByTestId('accident-state');
    await expect(state).toContainText('UNKNOWN #001');
    // Ownership is read from the book, not from a flag of its own.
    await expect(state).toContainText('ancient_dragon');
    await expect(state).toContainText('未入手 → 候補');
  });

  test('seeing it does not make the game think it is owned', async ({ page }) => {
    await freshWorld(page);
    await unlock(page);
    await page.getByTestId('arcana-set-中').click();
    await page.getByTestId('force-summon-ACCIDENT').click();
    await page.getByTestId('force-story-off').click();
    await page.getByTestId('open-battle-prototype').click();
    await expect(page.getByTestId('battle-prototype')).toBeVisible();
    await page.getByTestId('bp-summon-card').click();
    await expect(page.getByTestId('bp-accident-talk')).toBeVisible({ timeout: 16_000 });
    await page.getByTestId('bp-accident-talk').click();
    await page.reload();
    await page.getByTestId('continue-button').click();
    await unlock(page);
    // Observed once, and still not owned — so still a candidate.
    await expect(page.getByTestId('accident-state')).toContainText('観測1回');
    await expect(page.getByTestId('accident-state')).toContainText('未入手 → 候補');
  });
});

for (const phone of PHONES) {
  test(`the preview fits a ${phone.name} phone`, async ({ page }) => {
    await page.setViewportSize(viewportOf(phone));
    await freshWorld(page);
    await openPreview(page);
    await page.getByTestId('preview-play-FULL').click();

    for (const id of ['bp-accident-card', 'bp-dragon', 'bp-breath', 'bp-accident-talk']) {
      const node = page.getByTestId(id);
      await expect(node).toBeVisible({ timeout: 15_000 });
      const scrolls = await page.evaluate(() => ({
        x: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        y: document.documentElement.scrollHeight > document.documentElement.clientHeight + 1,
      }));
      expect(scrolls.x, `no sideways scroll at ${id}`).toBe(false);
      expect(scrolls.y, `no vertical scroll at ${id}`).toBe(false);
      const box = (await node.boundingBox())!;
      expect(box.x + box.width, 'inside the phone').toBeLessThanOrEqual(phone.width + 1);
      // The mark stays readable through the whole of it.
      await expect(page.getByTestId('preview-badge')).toBeVisible();
    }
  });
}
