import { test as base } from '@playwright/test';

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
      await use();
    },
    { auto: true },
  ],
});

export * from '@playwright/test';
