import { test, expect, chromium, type BrowserContext, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = 'http://localhost:5173';

function launch(userDataDir: string): Promise<BrowserContext> {
  return chromium.launchPersistentContext(userDataDir, {
    executablePath: '/opt/pw-browsers/chromium',
    viewport: { width: 390, height: 844 },
  });
}

function readFeedbackCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('playtest_feedback')) {
            db.close();
            resolve(0);
            return;
          }
          const rq = db
            .transaction('playtest_feedback', 'readonly')
            .objectStore('playtest_feedback')
            .count();
          rq.onsuccess = () => {
            db.close();
            resolve(rq.result);
          };
        };
        open.onerror = () => resolve(-1);
      }),
  );
}

async function goHomeFresh(page: Page) {
  await page.goto(`${BASE}/`);
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

// Feedback must outlive the browser itself — a tester closing the app
// must not cost the team the answer.
test('playtest feedback survives a full browser restart', async () => {
  const userDataDir = mkdtempSync(join(tmpdir(), 'mugen-zero-h-'));
  try {
    let context = await launch(userDataDir);
    let page = context.pages()[0] ?? (await context.newPage());
    await goHomeFresh(page);

    // Reach the end state quickly through the admin (official APIs).
    await page.getByTestId('dev-admin-entry').click();
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
    await page.getByTestId('preset-REUNITED').click();
    await page.getByTestId('dev-admin-back').click();

    await page.getByTestId('archive-button').click();
    await page.getByTestId('open-survey-button').click();
    const ending = page.getByTestId('ending-kaos');
    await expect(ending).toBeVisible();
    for (let i = 0; i < 4; i++) await ending.click();
    await page.getByTestId('ending-survey-button').click();
    const intro = page.getByTestId('survey-intro');
    await intro.click();
    await intro.click();
    await page.getByTestId('q1-5').click();
    await page.getByTestId('q2-5').click();
    await page.getByTestId('q3-IMMEDIATE').click();
    await page.getByTestId('survey-next').click();
    await page.getByTestId('q4-4').click();
    await page.getByTestId('q5-4').click();
    await page.getByTestId('q6-REUNION').click();
    await page.getByTestId('survey-next').click();
    await page.getByTestId('q7-input').fill('続きが見たい');
    await page.getByTestId('survey-submit').click();
    await expect(page.getByTestId('survey-done')).toBeVisible({ timeout: 10_000 });
    expect(await readFeedbackCount(page)).toBe(1);
    await context.close(); // full browser shutdown

    // Restart: the answer is still there, and this session cannot answer twice.
    context = await launch(userDataDir);
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(`${BASE}/`);
    expect(await readFeedbackCount(page)).toBe(1);

    await page.getByTestId('continue-button').click();
    await page.getByTestId('archive-button').click();
    await expect(page.getByTestId('open-survey-button')).toBeDisabled();

    // The dev admin still reads it after the restart.
    await page.getByTestId('archive-back').click();
    await page.getByTestId('dev-admin-entry').click();
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
    await expect(page.getByTestId('dev-playtest-summary')).toContainText('PLAYTEST RESPONSES: 1');
    await expect(page.getByTestId('playtest-comment')).toContainText('続きが見たい');

    await context.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
});
