import { expect, type Locator, type Page } from '@playwright/test';

/**
 * アルデン村の縮図 (作者 改修指示書 2026-10-16): the tavern's, the bakery's and
 * the tool shop's doors — and 休息する, at the inn-tavern — are on the left
 * once their place is tapped on the village. This opens the place a door
 * belongs to when the village is showing and the door is not, and gives
 * back the door, so a spec reads as it did: `(await placeButton(page,
 * 'rest-button')).click()`.
 */
const PLACE_OF: Record<string, string> = {
  'rest-button': 'tavern',
  'tavern-button': 'tavern',
  'bakery-button': 'bakery',
  'shop-button': 'shop',
};

export async function placeButton(page: Page, testId: keyof typeof PLACE_OF | string): Promise<Locator> {
  const door = page.getByTestId(testId);
  const spot = page.getByTestId(`spot-${PLACE_OF[testId]}`);
  await expect(door.or(spot).first()).toBeVisible();
  if (!(await door.isVisible().catch(() => false))) await spot.click();
  return door;
}
