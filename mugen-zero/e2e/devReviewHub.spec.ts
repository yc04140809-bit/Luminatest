import { test, expect, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';

// PHASE E: the review itself is the thing under test here.
//
// The claim this build makes is that a reviewer can read one block of
// text instead of a phone full of screenshots. So these tests check the
// text: that it exists, that it reaches the clipboard, that it is honest
// about what was never checked, and that it fits on a phone.

async function newWorld(page: Page) {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function openHub(page: Page) {
  await enterDevAdmin(page);
  await page.getByTestId('dev-review-hub-entry').click();
  await expect(page.getByTestId('dev-review-hub')).toBeVisible();
}

test('the hub says, in one line, whether this build is broken', async ({ page }) => {
  await newWorld(page);
  await openHub(page);

  await expect(page.getByTestId('hub-verdict')).toContainText('NO FAILED CHECKS');
  // And it is reached and left without touching the game.
  await page.getByTestId('hub-back').click();
  await expect(page.getByTestId('dev-admin-screen')).toBeVisible();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
});

test('one tap produces a report a reviewer can read', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await page.getByTestId('qa-generate').click();

  const text = await page.getByTestId('qa-report-text').inputValue();
  for (const heading of [
    '# MUGEN ZERO QA REPORT',
    '## CURRENT WORLD',
    '## CONTENT',
    '## NARRATIVE SEEDS',
    '## GALD ROUTES',
    '## FAILED CHECKS',
    '## VISUAL REVIEW REQUIRED',
  ]) {
    expect(text, `the report must carry ${heading}`).toContain(heading);
  }
  expect(text).toContain('## FAILED CHECKS\n- none');
  // The real registry, not a placeholder.
  expect(text).toContain('MOONLIGHT_TAVERN');
  expect(text).toContain('TAVERN_MASTER_OLD_GREATSWORD');
});

test('it never claims to have checked what it did not check', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await page.getByTestId('qa-generate').click();
  const text = await page.getByTestId('qa-report-text').inputValue();

  // Playing all four routes end to end is an e2e job, and the report
  // says so by name rather than quietly passing itself.
  const playthrough = text
    .split('\n')
    .find((l) => l.includes('ROUTE_PLAYTHROUGH_ALL'));
  expect(playthrough).toContain('NOT TESTED');
  expect(text).toContain('e2e/fourFutures.spec.ts');
  // Wiring, which it can check, is checked.
  expect(text).toContain('ROUTE_WIRING_SPARE');
});

test('the report knows which world it is describing', async ({ page }) => {
  await newWorld(page);
  await enterDevAdmin(page);
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId('dev-review-hub-entry').click();
  await page.getByTestId('qa-generate').click();

  const text = await page.getByTestId('qa-report-text').inputValue();
  expect(text).toContain('Route: SPARE');
  expect(text).toContain('ALDEN_BAKERY:ON MAP');
  expect(text).toContain('4年目');
});

test('COPY puts the whole report on the clipboard', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await newWorld(page);
  await openHub(page);
  await page.getByTestId('qa-generate').click();
  await page.getByTestId('qa-copy').click();

  await expect(page.getByTestId('qa-copy-status')).toContainText('コピーしました');
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toContain('# MUGEN ZERO QA REPORT');
  expect(clipboard).toContain('## VISUAL REVIEW REQUIRED');
  expect(clipboard.length).toBeGreaterThan(1000);
});

test('the director explains why an event was chosen', async ({ page }) => {
  await newWorld(page);
  await page.getByTestId('explore-button').click();
  // Meet Grave, so there is a reason for the next choice to explain.
  await page.getByTestId('location-MOONLIGHT_TAVERN').click();
  const scene = page.getByTestId('talk-MOONLIGHT_TAVERN');
  for (let i = 0; i < 20 && (await scene.count()) > 0; i++) {
    await scene.click({ timeout: 2000 }).catch(() => {});
  }
  await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();
  await page.locator('.screen-footer .btn').click(); // back to HOME
  await openHub(page);

  const tavern = page.getByTestId('hub-director-MOONLIGHT_TAVERN');
  await expect(tavern).toContainText('MOONLIGHT_TAVERN →');
  // The face just met is named, and the rule that acts on it is shown
  // with its number — no unexplained ranking anywhere.
  await expect(tavern).toContainText('GRAVE');
  await expect(tavern).toContainText('CHARACTER_REPEAT');
});

test('the hub reports the seeds exactly as the world holds them', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await expect(page.getByTestId('hub-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText('[SEED]');
  await expect(page.getByTestId('hub-seed-TAVERN_MASTER_OLD_GREATSWORD')).toContainText(
    'playerKnown: false',
  );
  await expect(page.getByTestId('hub-seed-GREENWOOD_DEEP_PATH')).toContainText('unanswered');
});

/** The hub keeps its sections closed so it stays scannable; open one. */
async function openSection(page: Page, id: string) {
  const section = page.getByTestId(`hub-section-${id}`);
  if (!(await section.evaluate((el) => (el as HTMLDetailsElement).open))) {
    await section.locator('summary').click();
  }
}

test('the observer can write down what the tester cannot', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await newWorld(page);
  await openHub(page);
  await openSection(page, 'observation');

  await page.getByTestId('obs-session').fill('tester-01');
  await page.getByTestId('obs-character-repeat').fill('酒場で剣の話より先に猟師の噂が出た');
  await page.getByTestId('obs-director').fill('村で手紙が最初に来たのが唐突に見えた');

  // The note carries the notes AND what the director was doing, so the
  // observation and its evidence never get separated.
  const note = await page.getByTestId('obs-note-text').inputValue();
  expect(note).toContain('# MUGEN PLAYTEST OBSERVATION NOTE');
  expect(note).toContain('tester-01');
  expect(note).toContain('酒場で剣の話より先に猟師の噂が出た');
  expect(note).toContain('MOONLIGHT_TAVERN:');

  await page.getByTestId('obs-copy').click();
  await expect(page.getByTestId('obs-copy-status')).toContainText('コピーしました');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('tester-01');

  // A stray tap must not lose a session's notes.
  await page.reload();
  // A world that was only walked into is not progress, so the title may
  // offer either entry; take whichever is there.
  await page
    .locator('[data-testid="start-button"], [data-testid="continue-button"]')
    .first()
    .waitFor({ timeout: 20_000 });
  if (await page.getByTestId('continue-button').isVisible().catch(() => false)) {
    await page.getByTestId('continue-button').click();
  } else {
    await newWorld(page);
  }
  await enterDevAdmin(page);
  await page.getByTestId('dev-review-hub-entry').click();
  await openSection(page, 'observation');
  await expect(page.getByTestId('obs-session')).toHaveValue('tester-01');

  await page.getByTestId('obs-clear').click();
  await expect(page.getByTestId('obs-session')).toHaveValue('');
});

test('an observation note is not world canon and never leaves the hub', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await openSection(page, 'observation');
  await page.getByTestId('obs-other').fill('これはメモです');
  await page.getByTestId('qa-generate').click();
  // The QA report describes the world; an observer's opinion is not part
  // of it, and must never turn up in an export of world state.
  expect(await page.getByTestId('qa-report-text').inputValue()).not.toContain('これはメモです');
  await page.getByTestId('obs-clear').click();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 360, height: 800 } });

  test('the hub reads without scrolling sideways, report and all', async ({ page }) => {
    await newWorld(page);
    await openHub(page);
    await page.getByTestId('qa-generate').click();
    await expect(page.getByTestId('qa-report-text')).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, 'the hub must not push the page sideways').toBeLessThanOrEqual(1);

    // The report measures the same thing and agrees with the browser.
    const text = await page.getByTestId('qa-report-text').inputValue();
    expect(text).toContain('360x800');
    expect(text).toContain('nothing spills sideways');

    // And COPY is reachable without hunting for it.
    await expect(page.getByTestId('qa-copy')).toBeVisible();
  });
});
