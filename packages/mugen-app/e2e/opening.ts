import { expect, type Page } from '@playwright/test';

/**
 * Through the opening (触る漫画形式, 2026-10-16) to the naming screen — by its
 * DEBUG SKIP, which the dev server has (e2e/openingComic.spec.ts taps the
 * whole way). By what is on screen, so a page added to the opening touches
 * no spec.
 */
export async function throughTheOpening(page: Page, { tap = false } = {}): Promise<void> {
  const skip = page.getByTestId('opening-debug-skip');
  const naming = page.getByTestId('naming-default');
  await expect(skip.or(naming).first()).toBeVisible();
  if (await skip.isVisible()) {
    if (tap) await skip.tap();
    else await skip.click();
  }
  await expect(naming).toBeVisible();
}

/**
 * After the name: the village (作者決定 2026-10-16 — 第0話 no longer plays on a
 * new game; it is in 回想). Kept, so every spec that came this way still does.
 */
export async function pastTheIntro(page: Page, _opts: { tap?: boolean } = {}): Promise<void> {
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/** 第0話 read to its end from 回想 (人生の記録); returns every line shown. Ends back on the archive. */
export async function watchTheIntro(page: Page): Promise<string[]> {
  const seen: string[] = [];
  const next = page.getByTestId('intro-next');
  for (let i = 0; i < 60; i++) {
    await expect(next.or(page.getByTestId('archive-screen')).first()).toBeVisible({ timeout: 5000 });
    if (await page.getByTestId('archive-screen').isVisible()) break;
    // A held moment: the way on comes after it.
    await expect(next).toBeEnabled({ timeout: 5000 });
    await expect(next).toHaveCSS('visibility', 'visible');
    seen.push((await page.getByTestId('intro-line').textContent()) ?? '');
    await next.click();
  }
  return seen;
}
