import { test, expect, type Page } from '@playwright/test';
import { readMemoryEvents } from './helpers';

// GALD FOUR FUTURES: whichever of the four choices the player made, three
// years later the world holds something they can go and find — and it is
// never another route's something.

interface Route {
  choice: 'KILL' | 'SPARE' | 'HELP' | 'CAPTURE';
  preset: string;
  /** The place the choice put on the map. */
  siteId: string;
  /** testid prefix of that place's scene. */
  scene: string;
  /** The world events this route, and only this route, produces. */
  chain: string[];
  discovery: string;
  /** The name the card takes once the player has been. */
  knownName: string;
  /** A word from the scene that proves the right one played. */
  sceneProof: string;
  /** Kaos's closing words for this route. */
  kaosProof: string;
  /** Chapters in the LIFE ARCHIVE once discovered. */
  chapterCount: number;
  /** A fragment of this route's event CG filename. */
  cg: string;
}

const ROUTES: Route[] = [
  {
    choice: 'SPARE',
    preset: 'SPARE_3Y',
    siteId: 'ALDEN_BAKERY',
    scene: 'bakery',
    chain: ['GALD_LEAVES_BANDITS', 'GALD_ARRIVES_IN_ALDEN', 'GALD_BECOMES_BAKER'],
    discovery: 'PLAYER_REUNITED_WITH_GALD',
    knownName: 'パン屋',
    sceneProof: '……見るな。',
    kaosProof: '続き、あったでしょ',
    chapterCount: 5,
    cg: 'gald-baker',
  },
  {
    choice: 'HELP',
    preset: 'HELP_3Y',
    siteId: 'GREENWOOD_WAYSTATION',
    scene: 'waystation',
    chain: ['GALD_WALKS_THE_ROAD', 'GALD_BECOMES_HEALER'],
    discovery: 'PLAYER_MET_GALD_ON_THE_ROAD',
    knownName: '街道の救護所',
    sceneProof: 'なんで俺を治した？',
    kaosProof: '優しさって、不思議だね',
    chapterCount: 4,
    cg: 'gald-healer',
  },
  {
    choice: 'CAPTURE',
    preset: 'CAPTURE_3Y',
    siteId: 'ALDEN_WORKYARD',
    scene: 'workyard',
    chain: ['GALD_STANDS_TRIAL', 'GALD_COMPLETES_SENTENCE', 'GALD_WORKS_FOR_ALDEN'],
    discovery: 'PLAYER_MET_GALD_IN_ALDEN',
    knownName: '村外れの作業場',
    sceneProof: '捕まったから、逃げられなかった。',
    kaosProof: '自由にすることだけが、救うことじゃない',
    chapterCount: 5,
    cg: 'gald-worker',
  },
  {
    choice: 'KILL',
    preset: 'KILL_3Y',
    siteId: 'GREENWOOD_GRAVE',
    scene: 'grave',
    chain: ['GALD_IS_BURIED', 'GALD_GRAVE_TENDED'],
    discovery: 'PLAYER_FOUND_GALD_GRAVE',
    knownName: '森の小さな墓',
    sceneProof: '誰かが時々、花を置いていくんだ。',
    kaosProof: 'これも、続きなんだよ',
    chapterCount: 4,
    cg: 'event-gald-grave',
  },
];

const ALL_CHAIN_TYPES = ROUTES.flatMap((r) => r.chain);

/** Builds a three-years-later world through the dev admin (official APIs). */
async function buildWorld(page: Page, preset: string) {
  await page.goto('/');
  // A world may already exist from an earlier preset in the same test, so
  // wait for whichever entry the title offers before deciding.
  await page
    .locator('[data-testid="start-button"], [data-testid="continue-button"]')
    .first()
    .waitFor({ timeout: 20_000 });
  const start = page.getByTestId('start-button');
  if (await start.isVisible().catch(() => false)) {
    await start.click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();
  } else {
    await page.getByTestId('continue-button').click();
  }
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId(`preset-${preset}`).click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
  await page.getByTestId('dev-admin-back').click();
}

/**
 * Clicks a tap-to-advance scene until the given testid disappears, and
 * reports every event-CG src that was on screen along the way (the grave
 * only appears partway through its scene).
 */
async function playScene(page: Page, testId: string, maxClicks = 24): Promise<string[]> {
  const scene = page.getByTestId(testId);
  const cg = page.getByTestId('scene-portrait');
  const seen: string[] = [];
  await expect(scene).toBeVisible();
  for (let i = 0; i < maxClicks; i++) {
    if (!(await scene.isVisible().catch(() => false))) break;
    // Never wait for the art: the grave has no CG for its first fourteen
    // lines, and a CG that fails to load removes itself mid-read.
    const src = await cg.getAttribute('src', { timeout: 500 }).catch(() => null);
    if (src) seen.push(src);
    await scene.click();
  }
  return seen;
}

for (const route of ROUTES) {
  test(`${route.choice}: three years on, ??? -> discovery -> archive -> ending`, async ({
    page,
  }) => {
    await buildWorld(page, route.preset);

    // --- The archive knows nothing yet, on every route alike ---
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    await expect(page.getByTestId('archive-unknown')).toBeVisible();
    await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(2);
    await page.getByTestId('archive-detail-back').click();
    await page.getByTestId('archive-back').click();

    // --- The place is on the map, and says nothing about itself ---
    await page.getByTestId('explore-button').click();
    const card = page.getByTestId(`location-${route.siteId}`);
    await expect(card).toBeVisible();
    await expect(card).toContainText('？？？');
    await expect(card).not.toContainText('ガルド');
    await expect(card).not.toContainText(route.knownName);
    // No other route's place exists in this world.
    for (const other of ROUTES.filter((r) => r.siteId !== route.siteId)) {
      await expect(page.getByTestId(`location-${other.siteId}`)).toHaveCount(0);
    }

    // --- The discovery itself ---
    await card.click();
    const cgSeen = await playScene(page, `${route.scene}-first-visit`);
    // The route's own event CG was on screen during its own scene, and no
    // other route's picture ever was.
    expect(cgSeen.some((src) => src.includes(route.cg))).toBe(true);
    for (const other of ROUTES.filter((r) => r.cg !== route.cg)) {
      expect(cgSeen.some((src) => src.includes(other.cg))).toBe(false);
    }
    if (route.choice === 'HELP') {
      // The one optional reply: flavour, never canon.
      await expect(page.getByTestId('waystation-reply')).toBeVisible();
      await page.getByTestId('waystation-reply-DONT_KNOW').click();
      await playScene(page, 'waystation-after-reply');
    }
    const done = page.getByTestId(`${route.scene}-reunion-done`);
    await expect(done).toBeVisible({ timeout: 10_000 });
    await expect(done).toContainText(route.kaosProof);

    // --- WORLD MEMORY holds the chain, caused by the choice ---
    const events = await readMemoryEvents(page);
    const types = events.map((e) => e.type);
    for (const type of route.chain) expect(types).toContain(type);
    for (const foreign of ALL_CHAIN_TYPES.filter((t) => !route.chain.includes(t))) {
      expect(types).not.toContain(foreign);
    }
    const discovery = events.find((e) => e.type === route.discovery)!;
    expect(discovery).toBeDefined();
    expect(discovery.location).toBe(route.siteId);

    // --- Leaving closes the playtest arc, on every route ---
    await page.getByTestId(`${route.scene}-leave`).click();
    const ending = page.getByTestId('ending-kaos');
    await expect(ending).toBeVisible();
    for (let i = 0; i < 4; i++) await ending.click();
    await expect(page.getByTestId('ending-screen')).toBeVisible();
    await page.getByTestId('ending-keep-playing').click();

    // --- Now the record is one connected life ---
    await page.getByTestId('archive-button').click();
    await page.getByTestId('archive-entry-GALD').click();
    await expect(page.getByTestId('archive-detail')).toContainText('ガルド の人生');
    await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(
      route.chapterCount,
    );
    await expect(page.getByTestId('archive-unknown')).toHaveCount(0);
    await page.getByTestId('archive-detail-back').click();
    await page.getByTestId('archive-back').click();

    // --- And the place has a name now ---
    await page.getByTestId('explore-button').click();
    await expect(page.getByTestId(`location-${route.siteId}`)).toContainText(route.knownName);
  });

  test(`${route.choice}: the discovery survives a reload and never doubles`, async ({ page }) => {
    await buildWorld(page, route.preset);
    await page.getByTestId('explore-button').click();
    await page.getByTestId(`location-${route.siteId}`).click();
    await playScene(page, `${route.scene}-first-visit`);
    if (route.choice === 'HELP') {
      await page.getByTestId('waystation-reply-SILENT').click();
      await playScene(page, 'waystation-after-reply');
    }
    await expect(page.getByTestId(`${route.scene}-reunion-done`)).toBeVisible({ timeout: 10_000 });
    await page.getByTestId(`${route.scene}-leave`).click();
    const ending = page.getByTestId('ending-kaos');
    await expect(ending).toBeVisible();
    for (let i = 0; i < 4; i++) await ending.click();
    await page.getByTestId('ending-keep-playing').click();

    await page.reload();
    await page.getByTestId('continue-button').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();

    // A revisit is an ordinary place — no second discovery, no second arc.
    await page.getByTestId('explore-button').click();
    await page.getByTestId(`location-${route.siteId}`).click();
    await playScene(page, `${route.scene}-revisit`);
    await expect(page.getByTestId(`${route.scene}-revisit-done`)).toBeVisible();
    await page.getByTestId(`${route.scene}-leave`).click();
    await expect(page.getByTestId('location-GREENWOOD_FOREST')).toBeVisible();

    const events = await readMemoryEvents(page);
    expect(events.filter((e) => e.type === route.discovery)).toHaveLength(1);
    for (const type of route.chain) {
      expect(events.filter((e) => e.type === type)).toHaveLength(1);
    }
  });

  test(`${route.choice}: the survey is reachable after the discovery`, async ({ page }) => {
    await buildWorld(page, route.preset);
    await page.getByTestId('explore-button').click();
    await page.getByTestId(`location-${route.siteId}`).click();
    await playScene(page, `${route.scene}-first-visit`);
    if (route.choice === 'HELP') {
      await page.getByTestId('waystation-reply-COULD_NOT_LEAVE').click();
      await playScene(page, 'waystation-after-reply');
    }
    await expect(page.getByTestId(`${route.scene}-reunion-done`)).toBeVisible({ timeout: 10_000 });
    await page.getByTestId(`${route.scene}-leave`).click();
    const ending = page.getByTestId('ending-kaos');
    await expect(ending).toBeVisible();
    for (let i = 0; i < 4; i++) await ending.click();
    await page.getByTestId('ending-survey-button').click();
    const intro = page.getByTestId('survey-intro');
    await expect(intro).toBeVisible();
    await intro.click();
    await intro.click();
    await expect(page.getByTestId('q1-5')).toBeVisible();
  });
}

test('a picture that will not load never stops the world from recording', async ({ page }) => {
  // Art is presentation. Block every event CG and play the KILL route:
  // the scene must still finish, the discovery must still commit, and the
  // LIFE ARCHIVE must still open.
  await page.route('**/*.webp', (route) => route.abort());
  await buildWorld(page, 'KILL_3Y');

  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_GRAVE').click();
  await playScene(page, 'grave-first-visit');
  await expect(page.getByTestId('grave-reunion-done')).toBeVisible({ timeout: 10_000 });

  const events = await readMemoryEvents(page);
  expect(events.map((e) => e.type)).toContain('PLAYER_FOUND_GALD_GRAVE');

  await page.getByTestId('grave-leave').click();
  const ending = page.getByTestId('ending-kaos');
  await expect(ending).toBeVisible();
  for (let i = 0; i < 4; i++) await ending.click();
  await page.getByTestId('ending-archive-button').click();
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(4);
});

test('the scene shown is the one the route earned', async ({ page }) => {
  // Read each route's own scene text once, and prove no other route's
  // words appear in it.
  for (const route of ROUTES) {
    await buildWorld(page, route.preset);
    await page.getByTestId('explore-button').click();
    await page.getByTestId(`location-${route.siteId}`).click();
    const scene = page.getByTestId(`${route.scene}-first-visit`);
    await expect(scene).toBeVisible();
    let text = '';
    for (let i = 0; i < 24; i++) {
      if (!(await scene.isVisible().catch(() => false))) break;
      text += `\n${await scene.innerText({ timeout: 2000 }).catch(() => '')}`;
      await scene.click();
    }
    expect(text).toContain(route.sceneProof);
    for (const other of ROUTES.filter((r) => r !== route)) {
      expect(text, `${route.choice} must not speak ${other.choice}'s lines`).not.toContain(
        other.sceneProof,
      );
    }
  }
});
