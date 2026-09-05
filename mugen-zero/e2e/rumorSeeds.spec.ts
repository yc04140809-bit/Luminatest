import { test, expect, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';

// PHASE C + D: the world talks about itself from more than one mouth,
// carries questions it does not answer, and has small things in it that
// are only themselves.
//
// WHICH events exist, in what order, and for which route is settled
// exhaustively in the unit tests. What this file proves is narrower and
// can only be proved here: that a player reaches them by tapping, and
// that the dev admin reports the seeds honestly. Every check is a fixed
// number of visits — no sweeping a place until it runs dry.

async function newWorld(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openAdmin(page: Page) {
  await enterDevAdmin(page);
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
}

async function usePreset(page: Page, preset: string) {
  await openAdmin(page);
  await page.getByTestId(`preset-${preset}`).click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

/**
 * One visit to a place: walk in, read whatever it says, walk out.
 * Returns the words. A place with nothing new returns ''.
 */
async function visit(page: Page, spot: string): Promise<string> {
  await page.getByTestId(`location-${spot}`).click();
  const scene = page.getByTestId(`talk-${spot}`);
  const done = page.getByTestId(`talk-${spot}-done`);
  await page
    .locator(`[data-testid="talk-${spot}"], [data-testid="talk-${spot}-done"]`)
    .first()
    .waitFor({ timeout: 15_000 });

  let text = '';
  // A scene ends when its element goes; 20 taps is far more than any
  // scene has lines, and the done panel is the real stop signal.
  //
  // Every read is given its own timeout on purpose: innerText() has no
  // default one, so an element that detaches between the count and the
  // read waits for ever and the catch never runs.
  for (let i = 0; i < 20 && (await scene.count()) > 0; i++) {
    text += `\n${await scene.innerText({ timeout: 2000 }).catch(() => '')}`;
    await scene.click({ timeout: 2000 }).catch(() => {});
  }
  await done.waitFor({ timeout: 15_000 });
  text += `\n${await done.innerText({ timeout: 5000 }).catch(() => '')}`;
  await page.getByTestId(`talk-${spot}-leave`).click();
  await expect(page.getByTestId(`location-${spot}`)).toBeVisible();
  return text;
}

/** The words of the next `count` visits to a place, joined. */
async function visits(page: Page, spot: string, count: number): Promise<string> {
  let all = '';
  for (let i = 0; i < count; i++) all += await visit(page, spot);
  return all;
}

test('the same news reaches the player from more than one mouth', async ({ page }) => {
  await newWorld(page);
  await usePreset(page, 'SPARE_3Y');
  await page.getByTestId('explore-button').click();

  // Barman: introductions, then the gossip.
  const tavern = await visits(page, 'MOONLIGHT_TAVERN', 2);
  expect(tavern).toContain('一人減った');

  // Village: it has only noticed that the forest went quiet.
  const village = await visits(page, 'ALDEN_VILLAGE', 3);
  expect(village).toContain('森が静かじゃない');

  // Neither of them answers the question.
  for (const text of [tavern, village]) {
    expect(text).not.toContain('パン');
    expect(text).not.toContain('ガルド');
  }
});

test('a rumour follows the route the world actually took', async ({ page }) => {
  await newWorld(page);
  await usePreset(page, 'HELP_3Y');
  await page.getByTestId('explore-button').click();
  const village = await visits(page, 'ALDEN_VILLAGE', 3);
  expect(village).toContain('街道で助けてもらった');
  // The SPARE village rumour belongs to a different world.
  expect(village).not.toContain('森が静かじゃない');
});

test('the sword is shown, hinted, and never explained', async ({ page }) => {
  await newWorld(page);

  await openAdmin(page);
  await expect(page.getByTestId('dev-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText('[SEED]');
  await expect(page.getByTestId('dev-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText(
    'playerKnown: false',
  );
  await page.getByTestId('dev-admin-back').click();

  // Meet him, then notice the wall.
  await page.getByTestId('explore-button').click();
  const tavern = await visits(page, 'MOONLIGHT_TAVERN', 2);
  expect(tavern).toContain('両手剣');
  expect(tavern).toContain('もう振れねぇ');
  for (const spoiler of ['冒険者', '戦士団', '戦場', '傭兵', '騎士']) {
    expect(tavern, `Grave must not be explained by ${spoiler}`).not.toContain(spoiler);
  }

  await page.locator('.screen-footer .btn').click(); // back to HOME
  await openAdmin(page);
  // Carried by the player now — and still unanswered in this build.
  await expect(page.getByTestId('dev-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText('[HINTED]');
  await expect(page.getByTestId('dev-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText(
    'playerKnown: true',
  );
});

test('a letter nobody signed, belonging to nobody', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  const village = await visit(page, 'ALDEN_VILLAGE');
  expect(village).toContain('まだ、間に合います');
  expect(village).not.toContain('ガルド');

  await page.locator('.screen-footer .btn').click();
  await openAdmin(page);
  await expect(page.getByTestId('dev-seed-ALDEN_UNSIGNED_LETTER')).toContainText('[HINTED]');
});

test('the village holds more than one feeling, and not every beat is a clue', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  // Curiosity, warmth, humour — four visits, no quest log.
  const village = await visits(page, 'ALDEN_VILLAGE', 4);
  expect(village).toContain('まだ、間に合います'); // the letter: curiosity
  expect(village).toContain('冒険じゃない'); // Kaos, doing nothing: warmth
  expect(village).toContain('ぼくの'); // the button: humour
  // And it runs out of news, instead of pretending forever.
  await expect(page.getByTestId('new-mark-ALDEN_VILLAGE')).toHaveCount(0);
});

test('what the player has met survives a reload', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  const first = await visit(page, 'ALDEN_VILLAGE');

  await page.reload();
  await page.getByTestId('continue-button').click();
  await page.getByTestId('explore-button').click();
  const second = await visit(page, 'ALDEN_VILLAGE');
  expect(second).not.toBe(first);
  expect(second).not.toContain('まだ、間に合います'); // the letter does not replay
});
