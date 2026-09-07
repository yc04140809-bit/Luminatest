import { test, expect, type Page } from './fixtures';
import { PHONES, playToLifeChoice, viewportOf } from './helpers';

/**
 * AUTO AND SPEED.
 *
 * Two controls that change how a fight is WATCHED and nothing about how
 * it is fought. The rules everything here protects:
 *
 *   - a hand-played fight is exactly the fight it was;
 *   - AUTO presses the same three commands a player has, and cannot do
 *     anything a player could not;
 *   - turning AUTO off gives the turn straight back;
 *   - the two of them work at the same time;
 *   - neither leaves anything behind when the fight ends.
 */

function hpOf(text: string | null): number {
  return Number(/(\d+)\s*\/\s*(\d+)/.exec((text ?? '').replace(/\s+/g, ' '))?.[1] ?? NaN);
}

/** Wait for the fight to move on its own, or say it did not. */
async function movedBy(page: Page, ms: number): Promise<boolean> {
  const enemyHp = page.getByTestId('enemy-hp');
  const before = hpOf(await enemyHp.textContent());
  const playerHp = hpOf(await page.getByTestId('player-hp').textContent());
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (await page.getByTestId('life-choice-screen').isVisible().catch(() => false)) return true;
    const now = hpOf(await enemyHp.textContent());
    const mine = hpOf(await page.getByTestId('player-hp').textContent());
    if (now !== before || mine !== playerHp) return true;
    await page.waitForTimeout(150);
  }
  return false;
}

test.describe('watching the fight instead of playing it', () => {
  test('AUTO off: the fight waits for the player, exactly as it did', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await expect(page.getByTestId('auto-button')).toHaveAttribute('aria-pressed', 'false');
    // Three seconds of nobody pressing anything, and nothing happens.
    expect(await movedBy(page, 3000), 'nothing moved on its own').toBe(false);
    // And the commands still work.
    const before = hpOf(await page.getByTestId('enemy-hp').textContent());
    await page.getByTestId('attack-button').click();
    await page.waitForTimeout(700);
    expect(hpOf(await page.getByTestId('enemy-hp').textContent())).toBeLessThan(before);
  });

  test('AUTO on: it fights by itself, with the commands a player has', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await page.getByTestId('auto-button').click();
    await expect(page.getByTestId('auto-button')).toHaveAttribute('aria-pressed', 'true');
    expect(await movedBy(page, 8000), 'the fight moved on its own').toBe(true);
  });

  test('AUTO off again: the very next turn is the player’s', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await page.getByTestId('auto-button').click();
    expect(await movedBy(page, 8000)).toBe(true);
    await page.getByTestId('auto-button').click();
    await expect(page.getByTestId('auto-button')).toHaveAttribute('aria-pressed', 'false');
    // Let anything already in flight land, then nothing more.
    await page.waitForTimeout(1200);
    expect(await movedBy(page, 3000), 'it stopped when it was told to').toBe(false);
  });

  test('×2: the same fight, watched faster', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    const speed = page.getByTestId('speed-button');
    await expect(speed).toHaveAttribute('data-speed', '1');
    await speed.click();
    await expect(speed).toHaveAttribute('data-speed', '2');
    await expect(speed).toHaveText('×2');
    // The fight is still the fight: a swing still lands, hand-played.
    const before = hpOf(await page.getByTestId('enemy-hp').textContent());
    await page.getByTestId('attack-button').click();
    await page.waitForTimeout(600);
    expect(hpOf(await page.getByTestId('enemy-hp').textContent())).toBeLessThan(before);
    // And it comes back round to normal.
    await speed.click();
    await expect(speed).toHaveAttribute('data-speed', '1');
  });

  test('AUTO and ×2 together', async ({ page }) => {
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await page.getByTestId('speed-button').click();
    await page.getByTestId('auto-button').click();
    await expect(page.getByTestId('speed-button')).toHaveAttribute('data-speed', '2');
    await expect(page.getByTestId('auto-button')).toHaveAttribute('aria-pressed', 'true');
    expect(await movedBy(page, 8000), 'both on, and it plays').toBe(true);
  });

  test('AUTO plays the whole fight through to the four answers', async ({ page }) => {
    // The one that proves there is no state left behind: it reaches the
    // end, the life choice arrives, and it arrives once.
    await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
    await page.getByTestId('speed-button').click();
    await page.getByTestId('auto-button').click();
    await expect(page.getByTestId('life-choice-screen')).toBeVisible({ timeout: 180_000 });
    await expect(page.getByTestId('battle-screen')).toHaveCount(0);
    // Nothing is still ticking behind the four answers.
    const prompt = await page.getByTestId('life-choice-screen').textContent();
    await page.waitForTimeout(2500);
    expect(await page.getByTestId('life-choice-screen').textContent()).toBe(prompt);
  });

  test.describe('on a phone', () => {
    for (const phone of PHONES) {
      test(`both controls are reachable on a ${phone.name} phone`, async ({ page }) => {
        await page.setViewportSize(viewportOf(phone));
        await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
        for (const id of ['attack-button', 'defend-button', 'auto-button', 'speed-button']) {
          const box = await page.getByTestId(id).boundingBox();
          expect(box, id).not.toBeNull();
          // Inside the stage, and big enough to hit.
          expect(box!.height, `${id} height`).toBeGreaterThanOrEqual(40);
          expect(box!.width, `${id} width`).toBeGreaterThanOrEqual(40);
          expect(box!.x, `${id} left edge`).toBeGreaterThanOrEqual(0);
        }
        // Nothing pushed off the right edge of the stage.
        const stage = await page.getByTestId('landscape-frame').boundingBox();
        const speed = await page.getByTestId('speed-button').boundingBox();
        expect(speed!.x + speed!.width).toBeLessThanOrEqual(stage!.x + stage!.width + 1);
      });
    }
  });
});
