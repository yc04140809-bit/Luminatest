import { expect, type Page } from '@playwright/test';

/**
 * Through the prologue — the world, then Kaos — to the naming screen.
 *
 * By what is on screen rather than by a count of taps, so the day a
 * line is added to the prologue in content, not one spec has to know.
 */
export async function throughTheOpening(page: Page, { tap = false } = {}): Promise<void> {
  const next = page.getByTestId('opening-next');
  const naming = page.getByTestId('naming-default');
  for (let i = 0; i < 30; i++) {
    await expect(next.or(naming).first()).toBeVisible();
    if (await naming.isVisible()) return;
    if (tap) await next.tap();
    else await next.click();
  }
  await expect(naming).toBeVisible();
}
