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

/**
 * After the name: the way into Alden (第0話), left through its own SKIP —
 * asked, confirmed — and the arrival card tapped away, into the village.
 * Skipping leaves the world exactly as seeing it does (intro.spec), so
 * every spec that is not about the way in comes this way.
 */
export async function pastTheIntro(page: Page, { tap = false } = {}): Promise<void> {
  const skip = page.getByTestId('intro-skip');
  await expect(skip).toBeVisible();
  if (tap) await skip.tap();
  else await skip.click();
  const yes = page.getByTestId('intro-skip-yes');
  if (tap) await yes.tap();
  else await yes.click();
  const card = page.getByTestId('intro-arrival');
  await expect(card).toBeVisible();
  if (tap) await card.tap();
  else await card.click();
}

/** The way into Alden read to its end, card and all; returns every line shown. */
export async function watchTheIntro(page: Page): Promise<string[]> {
  const seen: string[] = [];
  const next = page.getByTestId('intro-next');
  for (let i = 0; i < 60; i++) {
    await expect(next.or(page.getByTestId('intro-arrival')).first()).toBeVisible({ timeout: 5000 });
    if (await page.getByTestId('intro-arrival').isVisible()) break;
    // A held moment: the way on comes after it.
    await expect(next).toBeEnabled({ timeout: 5000 });
    await expect(next).toHaveCSS('visibility', 'visible');
    seen.push((await page.getByTestId('intro-line').textContent()) ?? '');
    await next.click();
  }
  await page.getByTestId('intro-arrival').click();
  return seen;
}
