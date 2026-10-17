import { test as base, type BrowserContext, type Page } from '@playwright/test';

/**
 * The suite's own `test`.
 *
 * `use.reducedMotion` is declared in playwright.config.ts, but in this
 * environment the runner's page fixture does not actually deliver it:
 * `matchMedia('(prefers-reduced-motion: reduce)')` reads false inside
 * the page, so every screen still fades and slides 6px on entry while
 * the tests measure it. That is where "her card hangs 1.6px off the
 * bottom of a 412px phone" came from — a card measured mid-entry, once
 * in a while, under parallel load.
 *
 * So the preference is asked for again here, on the page itself, where
 * it demonstrably lands. Everything else about `test` is unchanged.
 */
export const test = base.extend<{ stillness: void }>({
  stillness: [
    async ({ page }, use) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await pastTheSong(page);
      await use();
    },
    { auto: true },
  ],
});

/**
 * EVERY JOURNEY STARTS PAST THE SONG.
 *
 * The first screen of the game is now the question about the theme,
 * before the title — which is also the first thing anybody touches,
 * and the gesture that lets a phone make a sound at all. Almost every
 * test in this suite is about something further in, and none of them
 * should have to know that screen exists to reach the title.
 *
 * So `goto` is wrapped: land on a page, and if the question is being
 * asked, answer 「スキップ」 and carry on. That is exactly what a
 * `beforeEach` would do, done in the one place the whole suite already
 * shares, and it is the honest answer — a test about the forest starts
 * in the forest.
 *
 * The spec that IS about this screen opts out by navigating with
 * `page.goto` from the raw Playwright import, or simply by asserting
 * before anything else happens: the wrapper only ever acts when the
 * screen is actually showing.
 */
export async function pastTheSong(page: Page): Promise<void> {
  // EVERY LOAD, not only the ones Playwright started. `onReset` in the
  // game calls `window.location.reload()` itself, and a page that
  // reloads on its own lands on the first screen with nobody to answer
  // the question — which is what left a dozen specs waiting for a
  // title that was one tap away. Fire and forget: it does nothing at
  // all unless that screen is actually showing.
  page.on('load', () => {
    void answerTheQuestion(page);
  });
  const realGoto = page.goto.bind(page);
  const realReload = page.reload.bind(page);
  page.goto = (async (url: string, options?: Parameters<Page['goto']>[1]) => {
    const response = await realGoto(url, options);
    await answerTheQuestion(page);
    return response;
  }) as Page['goto'];
  // RELOAD TOO, and this is not a detail: a dozen specs wipe the save
  // and reload to get a fresh world, and a reload lands on the first
  // screen exactly as a fresh visit does. Patching only `goto` left
  // every one of them waiting for a title that was one tap away.
  page.reload = (async (options?: Parameters<Page['reload']>[0]) => {
    const response = await realReload(options);
    await answerTheQuestion(page);
    return response;
  }) as Page['reload'];
}

/**
 * If the question about the song is being asked, answer the skip.
 *
 * WAITS FOR THE APP TO BE SOMEWHERE, and this is the whole difficulty.
 * `isVisible()` answers about this instant, and when a navigation
 * resolves the app has not drawn yet — so asking then is asking before
 * there is anything to see. But a fixed little timeout is just as
 * wrong: three workers sharing four cores make a cold first paint take
 * a great deal longer than five seconds, and a wait that gives up
 * returns a page still sitting on the question with nobody left to
 * answer it. That cost fourteen specs a 240-second timeout each, all
 * of them stuck on a `start-button` that was one tap away.
 *
 * So it waits for whichever of the two places the app can be — the
 * question, or the title behind it — and only then decides. Slow is
 * fine; guessing is not.
 *
 * Failure is not an error: a page that is neither simply never shows
 * either, and the test carries on to what it came for.
 */
async function answerTheQuestion(page: Page): Promise<void> {
  const marked = page as unknown as { __keepTheSong?: boolean; __answering?: Promise<void> };
  if (marked.__keepTheSong) return;
  if (page.isClosed()) return;
  // ONE AT A TIME PER PAGE. Both the `goto` wrapper and the `load`
  // listener below want this done, and for a navigation Playwright
  // started they both want it for the SAME load. Sharing the one run
  // is what keeps them from racing each other for the same button.
  if (marked.__answering) return marked.__answering;
  const run = answerOnce(page).finally(() => {
    marked.__answering = undefined;
  });
  marked.__answering = run;
  return run;
}

async function answerOnce(page: Page): Promise<void> {
  const skip = page.getByTestId('theme-choice-skip');
  const title = page.getByTestId('start-button').or(page.getByTestId('continue-button'));
  await skip
    .or(title)
    .first()
    .waitFor({ state: 'visible', timeout: 60_000 })
    .catch(() => {});
  if (page.isClosed()) return;
  const asking = await skip.isVisible().catch(() => false);
  if (!asking) return;
  await skip.click().catch(() => {});
  await title
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .catch(() => {});
}

/**
 * THE PAGE OF A BROWSER THIS SUITE LAUNCHED ITSELF.
 *
 * A handful of specs need a real browser profile on disk — they close
 * the whole browser and open it again to prove the world survived it —
 * so they run `chromium.launchPersistentContext` and take the page out
 * of it themselves. Those pages come from Playwright direct and get
 * none of what the `page` fixture arranges: not the reduced motion the
 * whole suite measures against, and not the answer to the question
 * about the song.
 *
 * That was written out by hand, once per spec, and it was written out
 * for the FIRST session only — so every one of those specs relaunched
 * the browser, landed on the question, and waited for a title that was
 * one tap away. Seven specs, one missing line each.
 *
 * So it is a function, and there is one of it: every page this suite
 * makes for itself comes out of here, arranged the same way, whichever
 * session it belongs to.
 */
export async function pageOf(context: BrowserContext): Promise<Page> {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await pastTheSong(page);
  return page;
}

/**
 * For the one spec that is about the screen itself: leave it alone.
 *
 * Called before `goto`, so the very first navigation lands on the
 * question rather than past it.
 */
export async function keepTheSong(page: Page): Promise<void> {
  (page as unknown as { __keepTheSong?: boolean }).__keepTheSong = true;
}

export * from '@playwright/test';
