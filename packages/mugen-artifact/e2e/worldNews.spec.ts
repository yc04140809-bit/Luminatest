import { test, expect, type Page } from './fixtures';

// 村のうわさ — WORLD NEWS, as the player receives it.
//
// What is under test is mostly an ABSENCE: no importance, no marker, no
// count, nothing that would let a player pick the meaningful line out of
// the chickens by looking. Plus the one positive claim — that the
// village says different things on different days.

async function newWorld(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

test('the village says a few things, and none of them are marked', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('news-button').click();
  const news = page.getByTestId('world-news-screen');
  await expect(news).toBeVisible();
  await expect(news).toContainText('村のうわさ');
  await expect(page.getByTestId('news-day')).toContainText('アルデン村');

  const items = page.getByTestId('news-item');
  await expect(items).toHaveCount(5);

  // Nothing on the panel says how much anything matters.
  const text = await news.innerText();
  for (const word of ['SEED', 'VINE', 'BLOOM', '重要', '強度', 'IMPORTANCE', '！']) {
    expect(text, word).not.toContain(word);
  }
  expect(text).not.toContain('�');

  // And every line is rendered identically: same class, no badge, no
  // per-item styling that could carry a signal.
  const classes = await items.evaluateAll((nodes) =>
    nodes.map((node) => (node as HTMLElement).className),
  );
  expect(new Set(classes).size).toBe(1);

  const sizes = await items.evaluateAll((nodes) =>
    nodes.map((node) => {
      const style = getComputedStyle(node as HTMLElement);
      return `${style.fontSize}/${style.fontWeight}/${style.color}`;
    }),
  );
  expect(new Set(sizes).size).toBe(1);
});

test('a brand new world is all chickens, because nothing has happened', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('news-button').click();
  const text = await page.getByTestId('world-news-screen').innerText();
  // Day one: the village has nothing to report, and says so by talking
  // about a chicken rather than by being empty.
  expect(text).toMatch(/ニワトリ|洗濯物|パン|井戸|犬|屋根|荷車|汁物|猫|柵|長靴|梅/);
  // Nobody the world is growing a life for is named.
  for (const id of ['LINA', 'GALD', 'ALDEN_GUARD', 'NEL']) {
    expect(text, id).not.toContain(id);
  }
});

test('the gossip changes as the world does, and not when the screen reopens', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('news-button').click();
  const dayOne = await page.getByTestId('world-news-screen').innerText();

  // Reopening says the same thing: a day has one set of gossip.
  await page.getByTestId('news-back').click();
  await page.getByTestId('news-button').click();
  expect(await page.getByTestId('world-news-screen').innerText()).toBe(dayOne);

  // Resting moves the world, and the village moves on with it.
  await page.getByTestId('news-back').click();
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).toContainText('2日目');
  await page.getByTestId('news-button').click();
  expect(await page.getByTestId('world-news-screen').innerText()).not.toBe(dayOne);
});

test.describe('on a phone', () => {
  for (const size of [
    { width: 800, height: 360 },
    { width: 844, height: 390 },
  ]) {
    test(`reads without pushing anything sideways at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await newWorld(page);
      await page.getByTestId('news-button').click();
      await expect(page.getByTestId('world-news-screen')).toBeVisible();

      const overflow = await page.evaluate(() => {
        const root = document.querySelector('.screen') as HTMLElement | null;
        return root ? root.scrollWidth - root.clientWidth : -1;
      });
      expect(overflow).toBeLessThanOrEqual(1);

      // Every line is readable and the way out is reachable.
      await expect(page.getByTestId('news-item').last()).toBeVisible();
      await page.getByTestId('news-back').scrollIntoViewIfNeeded();
      await expect(page.getByTestId('news-back')).toBeVisible();
    });
  }
});
