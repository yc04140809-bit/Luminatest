import { expect, type Page } from '@playwright/test';

/**
 * DRIVING A FIGHT, the way a thumb does.
 *
 * The battle screen shows every turn for about a second, and a press
 * while it is showing is not a turn (`bp-commands[data-locked]`). So a
 * command waits for the row to be free, and a fight is fought by
 * pressing 攻撃 whenever it is — tapping through Kaos's awakening when
 * she steps forward — until whatever the test is waiting for appears.
 */

/** The fight is on screen and the row can be pressed. */
export async function readyToAct(page: Page, timeout = 10_000): Promise<void> {
  await expect(page.getByTestId('bp-commands')).toHaveAttribute('data-locked', 'no', { timeout });
}

/** One command, once the row is free. */
export async function command(page: Page, id: 'bp-attack' | 'bp-defend'): Promise<void> {
  await readyToAct(page);
  await page.getByTestId(id).click();
}

/** Taps through her awakening, if she is stepping forward. */
export async function throughTheAwakening(page: Page): Promise<boolean> {
  const scene = page.getByTestId('magic-awakening');
  let tapped = false;
  for (let i = 0; i < 12 && (await scene.isVisible().catch(() => false)); i++) {
    await scene.click().catch(() => {});
    tapped = true;
  }
  return tapped;
}

/**
 * Attacks until `done` says so — a result screen, the four answers,
 * whatever comes next. Presses only when the row is free.
 */
export async function fightUntil(
  page: Page,
  done: () => Promise<boolean>,
  { maxTurns = 80 } = {},
): Promise<void> {
  for (let turns = 0; turns < maxTurns; ) {
    if (await done()) return;
    if (await throughTheAwakening(page)) continue;
    // Read, never waited for: once the enemy is beaten the row is gone
    // (as in the Artifact), and waiting for it would wait forever.
    const free = await page.evaluate(
      () => document.querySelector('[data-testid="bp-commands"]')?.getAttribute('data-locked') === 'no',
    );
    if (!free) {
      await page.waitForTimeout(80);
      continue;
    }
    await page.getByTestId('bp-attack').click({ timeout: 2000 }).catch(() => {});
    turns += 1;
  }
  expect(await done(), 'the fight ended the way the test was waiting for').toBe(true);
}

/** Until the fight's own result screen is up. */
export async function fightToResult(page: Page): Promise<void> {
  await fightUntil(page, () => page.getByTestId('result-exp').isVisible().catch(() => false));
  await expect(page.getByTestId('result-exp')).toBeVisible({ timeout: 20_000 });
}

/** The enemy's health, as the plate under it reads: [now, max]. */
export async function enemyHp(page: Page): Promise<[number, number]> {
  const text = (await page.getByTestId('bp-enemy-read').textContent()) ?? '';
  const [now, max] = text.split('/').map((n) => Number(n.replace(/\D/g, '')));
  return [now, max];
}
