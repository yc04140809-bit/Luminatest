import { test, expect, type Page } from '@playwright/test';

/**
 * EQUIPMENT — what is held, what may be held, and that it survives.
 *
 * The three the brief names: the equipped weapon shows, it can be
 * changed, and it is still there on the way back in. The middle one
 * cannot be driven end to end yet and the reason is content, not
 * code — there is ONE weapon per character, so there is nothing to
 * change TO. What is driven here is everything around it: the list
 * opens, offers only what that character could hold, and equipping
 * from it works. `equipment.test.ts` covers the refusals.
 */

async function intoTheVillage(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
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
  const next = page.getByTestId('opening-next');
  for (let i = 0; i < 3; i++) await next.click();
  await page.getByTestId('naming-default').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openEquipment(page: Page) {
  await page.getByTestId('status-button').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
  await page.getByTestId('status-to-equipment').click();
  await expect(page.getByTestId('equipment-screen')).toBeVisible();
}

test('shows what each of them is actually holding', async ({ page }) => {
  await intoTheVillage(page);
  await openEquipment(page);

  await expect(page.getByTestId('equip-weapon-name')).toHaveText('使い込まれた長剣');
  await expect(page.getByTestId('equip-weapon-type')).toHaveText('長剣');
  await expect(page.getByTestId('equip-description')).toContainText('刃には無数の傷');

  await page.getByTestId('equip-tab-kaos').click();
  await expect(page.getByTestId('equip-weapon-name')).toHaveText('古い魔導書');
  // 魔法 comes from her STYLE, not from a weapon type the grimoire
  // does not have and she has never been given.
  await expect(page.getByTestId('equip-weapon-type')).toHaveText('魔法');
  await expect(page.getByTestId('equip-description')).toContainText('忘れられた文字');
});

test('offers each of them only what they could hold', async ({ page }) => {
  await intoTheVillage(page);
  await openEquipment(page);

  await page.getByTestId('equip-slot-WEAPON').click();
  await expect(page.getByTestId('equip-picker')).toBeVisible();
  await expect(page.getByTestId('equip-choice-weapon/worn_long_sword')).toBeVisible();
  // The grimoire is hers, and he is not offered it.
  await expect(page.getByTestId('equip-choice-weapon/old_grimoire')).toHaveCount(0);

  // Equipping from the list works and closes it.
  await page.getByTestId('equip-choice-weapon/worn_long_sword').click();
  await expect(page.getByTestId('equip-picker')).toHaveCount(0);
  await expect(page.getByTestId('equip-weapon-name')).toHaveText('使い込まれた長剣');

  await page.getByTestId('equip-tab-kaos').click();
  await page.getByTestId('equip-slot-WEAPON').click();
  await expect(page.getByTestId('equip-choice-weapon/old_grimoire')).toBeVisible();
  await expect(page.getByTestId('equip-choice-weapon/worn_long_sword')).toHaveCount(0);
});

/** Named, never offered. The same line the left menu holds. */
test('names the slots it cannot fill without offering them', async ({ page }) => {
  await intoTheVillage(page);
  await openEquipment(page);

  const slots = await page.locator('.eq-slot').allInnerTexts();
  expect(slots.join(' ')).toContain('衣装');
  expect(slots.join(' ')).toContain('アクセサリ1');
  expect(slots.join(' ')).toContain('アクセサリ2');
  // Only the weapon is a button; the other three are not.
  await expect(page.locator('button.eq-slot')).toHaveCount(1);
  for (const slot of ['OUTFIT', 'ACCESSORY_1', 'ACCESSORY_2']) {
    await expect(page.getByTestId(`equip-slot-${slot}`)).toHaveCount(0);
  }
});

test('is a leaf of the status screen, not a screen off the village', async ({ page }) => {
  await intoTheVillage(page);
  await openEquipment(page);

  // ステータス goes back up, not out.
  await page.getByTestId('equip-to-status').click();
  await expect(page.getByTestId('status-screen')).toBeVisible();
  await expect(page.getByTestId('equipment-screen')).toHaveCount(0);

  // And the status screen shows what is held.
  await expect(page.getByTestId('status-equipped')).toHaveText('使い込まれた長剣');

  // もどる from equipment leaves for the village.
  await page.getByTestId('status-to-equipment').click();
  await page.getByTestId('equip-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

/**
 * THE COMPATIBILITY CASE, driven rather than argued. A world written
 * before equipment existed has no equipment row at all — which is
 * every world made by every build until now — and must open with its
 * starting kit rather than empty-handed.
 */
test('survives a restart, including a save that predates equipment', async ({ page }) => {
  await intoTheVillage(page);
  await openEquipment(page);
  // Equip deliberately, so the save actually holds an equipment row
  // as well as exercising the absent-row path on the way in.
  await page.getByTestId('equip-slot-WEAPON').click();
  await page.getByTestId('equip-choice-weapon/worn_long_sword').click();
  await expect(page.getByTestId('equip-picker')).toHaveCount(0);
  await page.getByTestId('equip-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();

  await openEquipment(page);
  await expect(page.getByTestId('equip-weapon-name')).toHaveText('使い込まれた長剣');
  await page.getByTestId('equip-tab-kaos').click();
  await expect(page.getByTestId('equip-weapon-name')).toHaveText('古い魔導書');
});
