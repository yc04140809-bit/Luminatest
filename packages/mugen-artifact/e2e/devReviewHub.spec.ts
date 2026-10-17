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
  // Wait for the preset to LAND before reading a report about it.
  //
  // Building SPARE_3Y is a reset, a choice and three years of world. The
  // hub entry is now `disabled` while that runs, like every other button
  // on the admin screen, so the click below waits by itself — but these
  // two lines say what the report is supposed to be about, which is the
  // thing the assertions further down actually depend on. Without either
  // guard this test read `Route: NONE` on day 1 of a world four years
  // into SPARE.
  await expect(page.getByTestId('dev-choice')).toContainText('SPARE');
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
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

// WORLD LIFE ENGINE.
//
// The round's own success condition, checked where a person can
// actually look at it rather than only in a unit test: the chain from
// an action to a candidate future has to be readable on a screen, in
// order, by somebody who has not read the code.
test('the hub shows the causal chain from an action to a possible future', async ({ page }) => {
  await newWorld(page);
  await openHub(page);

  // Closed by default, like every section that is not the snapshot.
  await page.getByTestId('hub-section-world-life').locator('summary').click();

  const steps = page.getByTestId('hub-world-life-steps');
  await expect(steps).toBeVisible();
  // Each link of the chain, named.
  await expect(steps).toContainText('ACTION SHOW_MAGIC');
  await expect(steps).toContainText('MEMORY');
  await expect(steps).toContainText('SEED 新規 MAGIC_DREAM');
  await expect(steps).toContainText('STORY_TIME_ADVANCE');
  await expect(steps).toContainText('SEED 補強');
  await expect(steps).toContainText('BLOOM 候補が立った');

  const trace = page.getByTestId('hub-world-life-trace');
  await expect(trace).toContainText('CORE');
  await expect(trace).toContainText('SEED   MAGIC_DREAM ROOTED');
  await expect(trace).toContainText('VINE   BECAUSE_OF → PLAYER');
  await expect(trace).toContainText('LINA_PRACTISES_ALONE CANDIDATE');

  // And it changed nothing: the hub is read-only, so the world the
  // player is in is exactly where they left it.
  await page.getByTestId('hub-back').click();
  await page.getByTestId('dev-admin-back').click();
  await expect(page.getByTestId('world-clock')).toContainText('1年目');
});

// GALD, HELP ROUTE — the engine's first vertical slice on a canonical
// character, read where a person can actually look at it.
test('the hub shows what three years did to a man who was helped', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await page.getByTestId('hub-section-gald-life').locator('summary').click();

  const steps = page.getByTestId('hub-gald-life-steps');
  await expect(steps).toBeVisible();
  await expect(steps).toContainText('ACTION PLAYER_HELPED_GALD (PLAYER → GALD');
  await expect(steps).toContainText('SEED 新規 GALD_REDEMPTION');
  // The line that says the round's constraint out loud.
  await expect(steps).toContainText('この時点で更生は確定していない');
  await expect(steps).toContainText('CANON  +124日 GALD_BECOMES_HEALER');
  await expect(steps).toContainText('かつて追われていた男が、衛兵と普通に話している');

  const trace = page.getByTestId('hub-gald-life-trace');
  // His side: the debt, what fed it, and who it points at.
  await expect(trace).toContainText('SEED   GALD_REDEMPTION ROOTED');
  await expect(trace).toContainText('FROM ACTION PLAYER_HELPED_GALD by PLAYER');
  await expect(trace).toContainText('VINE   BECAUSE_OF → PLAYER');
  // And the guard's, which nobody acted on at all.
  await expect(trace).toContainText('SEED   GUARD_WARINESS FADED');
  await expect(trace).toContainText('GUARD_STOPS_WATCHING_HIM CANDIDATE');
  // The future this route does not reach, with the reason it is waiting.
  await expect(trace).toContainText('GALD_RETURNS_TO_THE_VILLAGE まだ');

  // Nothing the player can read as a score.
  await expect(trace).not.toContainText('+5');
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
});

// And the same rules read off the world the tester is actually in.
// On a fresh world that is almost nothing, which is exactly what it
// should say: the player has not done anything to him yet.
test('the hub reads this playthrough through the same engine', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await page.getByTestId('hub-section-gald-live').locator('summary').click();

  const live = page.getByTestId('hub-gald-live');
  await expect(live).toBeVisible();
  // The greenwood's own past is there before the player does anything.
  await expect(live).toContainText('SEED   GUARD_WARINESS');
  // And nothing of the player's is, because they have not met him.
  await expect(live).toContainText('SEED   なし');
  await expect(live).toContainText('GALD_AND_THE_GUARD_SPEAK まだ');
});

// LINA — the claim the engine rests on, laid out so it can be
// disbelieved: four worlds, one childhood, four women.
test('the hub shows one seed becoming four different lives', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await page.getByTestId('hub-section-lina-futures').locator('summary').first().click();

  const futures = page.getByTestId('hub-lina-futures');
  await expect(futures).toBeVisible();

  // Each world says what happened in it, and what her life could become.
  await expect(page.getByTestId('hub-lina-A')).toContainText('盗賊の襲撃');
  await expect(page.getByTestId('hub-lina-A')).toContainText('村の魔導士として頼られはじめている');
  await expect(page.getByTestId('hub-lina-B')).toContainText('傷の手当て');
  await expect(page.getByTestId('hub-lina-B')).toContainText('傷を診るための魔法');
  await expect(page.getByTestId('hub-lina-C')).toContainText('外の世界を語る');
  await expect(page.getByTestId('hub-lina-C')).toContainText('見たことのない場所');
  await expect(page.getByTestId('hub-lina-D')).toContainText('四年間なにもない');
  await expect(page.getByTestId('hub-lina-D')).toContainText('もう話さない');

  // And they genuinely differ: the village mage only appears in A.
  await expect(page.getByTestId('hub-lina-B')).not.toContainText('村の魔導士');
  await expect(page.getByTestId('hub-lina-C')).not.toContainText('村の魔導士');

  // The full reasoning behind one of them is one tap away.
  await page.getByTestId('hub-lina-why').locator('summary').click();
  await expect(page.getByTestId('hub-lina-why')).toContainText('SEED   MAGIC_DREAM ROOTED');
  await expect(page.getByTestId('hub-lina-why')).toContainText('aptitude MAGIC ≥ 0.6');
  await expect(page.getByTestId('hub-lina-why')).toContainText('LINA_WANDERING_MAGE まだ');
});

// 交差と伝播 — the furthest the engine reaches, and the one claim that
// is easiest to fake: a player action in Alden changing somebody in a
// town the player has never been to.
test('the hub follows one decision into a town the player never visits', async ({ page }) => {
  await newWorld(page);
  await openHub(page);
  await page.getByTestId('hub-section-crossings').locator('summary').first().click();

  const steps = page.getByTestId('hub-crossings-steps');
  await expect(steps).toContainText('PLAYERがガルドをHELP（森）');

  // Four meetings, in order, and the player is in none of them.
  const meetings = page.getByTestId('hub-crossings-meetings');
  await expect(meetings).toContainText('GALD_WALKS_INTO_ALDEN');
  await expect(meetings).toContainText('GALD_TELLS_LINA_OF_THE_ROAD');
  await expect(meetings).toContainText('BAKER_GIVES_GALD_A_CORNER');
  await expect(meetings).toContainText('GALD_TAKES_THE_ROAD_TO_THE_PORT');
  await expect(meetings).toContainText('GALD → NEL @ PORT_TOWN');
  await expect(meetings).not.toContainText('PLAYER');

  // And the far end: a boy with a seed, a line back to Gald, and a
  // future of his own.
  const far = page.getByTestId('hub-crossings-far');
  await expect(far).toContainText('── NEL @');
  await expect(far).toContainText('SEED   HEALING_CALL');
  await expect(far).toContainText('FROM ACTION TENDED_THE_HURT by GALD @ PORT_TOWN');
  await expect(far).toContainText('VINE   BECAUSE_OF → GALD');
  await expect(far).toContainText('NEL_LEARNS_TO_BIND_WOUNDS CANDIDATE');
  await expect(far).toContainText('港町の荷運びの少年');
});
