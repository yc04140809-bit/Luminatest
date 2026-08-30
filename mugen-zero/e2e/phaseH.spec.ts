import { test, expect, type Page } from '@playwright/test';
import { playToLifeChoice, advanceDays } from './helpers';

// PHASE H: the post-play survey. Feedback is a separate layer — it must
// never touch world canon, never spoil unreached content, and never be
// lost by a RESET.

interface StoredFeedback {
  id: string;
  playSessionId: string;
  route: string;
  continueInterest: number;
  galdFutureInterest: number;
  reunionRecognition: string;
  worldImpactFeeling: number;
  archiveInterest: number;
  memorableMoment: string;
  freeComment: string;
}

function readFeedback(page: Page): Promise<StoredFeedback[]> {
  return page.evaluate(
    () =>
      new Promise<StoredFeedback[]>((resolve, reject) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          if (!db.objectStoreNames.contains('playtest_feedback')) {
            db.close();
            resolve([]);
            return;
          }
          const rq = db
            .transaction('playtest_feedback', 'readonly')
            .objectStore('playtest_feedback')
            .getAll();
          rq.onsuccess = () => {
            db.close();
            resolve(rq.result as StoredFeedback[]);
          };
          rq.onerror = () => reject(rq.error);
        };
      }),
  );
}

async function completeCoreExperience(page: Page) {
  await playToLifeChoice(page);
  await page.getByTestId('choice-SPARE').click();
  const result = page.getByTestId('choice-result-dialogue');
  await expect(result).toBeVisible();
  await result.click();
  await result.click();
  await result.click();
  await page.getByTestId('choice-recorded-screen').waitFor();
  await page.getByTestId('return-home-button').click();

  await advanceDays(page, 3);
  await page.getByTestId('time-shift-button').click();
  await page.getByTestId('time-shift-go').click();
  await expect(page.getByTestId('time-shift-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('time-shift-return').click();

  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-ALDEN_BAKERY').click();
  const scene = page.getByTestId('bakery-first-visit');
  await expect(scene).toBeVisible();
  for (let i = 0; i < 8; i++) await scene.click();
  await expect(page.getByTestId('bakery-reunion-done')).toBeVisible({ timeout: 10_000 });
  await page.getByTestId('bakery-leave').click();
  await page.locator('.screen-footer .btn').first().click(); // explore -> HOME
  await expect(page.getByTestId('world-clock')).toBeVisible();
}

async function answerSurvey(page: Page, comment = '再会でびっくりした。') {
  const intro = page.getByTestId('survey-intro');
  await expect(intro).toBeVisible();
  await intro.click();
  await intro.click();

  await expect(page.getByTestId('survey-screen')).toBeVisible();
  await page.getByTestId('q1-5').click();
  await page.getByTestId('q2-4').click();
  await page.getByTestId('q3-IMMEDIATE').click();
  await page.getByTestId('survey-next').click();

  await page.getByTestId('q4-5').click();
  await page.getByTestId('q5-3').click();
  await page.getByTestId('q6-REUNION').click();
  await page.getByTestId('survey-next').click();

  if (comment) await page.getByTestId('q7-input').fill(comment);
  await page.getByTestId('survey-submit').click();
  await expect(page.getByTestId('survey-done')).toBeVisible({ timeout: 10_000 });
}

test('survey is offered only after the life choice, saves locally, and shows once', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();

  // Mid-play: no survey entry point anywhere.
  await page.getByTestId('archive-button').click();
  await expect(page.getByTestId('open-survey-button')).toHaveCount(0);
  await page.getByTestId('archive-back').click();

  await completeCoreExperience(page);

  // Reached from the LIFE ARCHIVE, by the player's own choice.
  await page.getByTestId('archive-button').click();
  await expect(page.getByTestId('open-survey-button')).toBeVisible();
  await page.getByTestId('open-survey-button').click();
  await answerSurvey(page);

  const feedback = await readFeedback(page);
  expect(feedback).toHaveLength(1);
  expect(feedback[0]).toMatchObject({
    route: 'SPARE',
    continueInterest: 5,
    galdFutureInterest: 4,
    reunionRecognition: 'IMMEDIATE',
    worldImpactFeeling: 5,
    archiveInterest: 3,
    memorableMoment: 'REUNION',
    freeComment: '再会でびっくりした。',
  });
  expect(feedback[0].playSessionId).toBeTruthy();

  // World canon is untouched by answering.
  const eventTypes = await page.evaluate(
    () =>
      new Promise<string[]>((resolve) => {
        const open = indexedDB.open('mugen-zero-save');
        open.onsuccess = () => {
          const db = open.result;
          const rq = db.transaction('memory_events', 'readonly').objectStore('memory_events').getAll();
          rq.onsuccess = () => {
            db.close();
            resolve(rq.result.map((e: { type: string }) => e.type));
          };
        };
      }),
  );
  expect(eventTypes.sort()).toEqual([
    'GALD_ARRIVES_IN_ALDEN',
    'GALD_BECOMES_BAKER',
    'GALD_LEAVES_BANDITS',
    'PLAYER_REUNITED_WITH_GALD',
    'PLAYER_SPARED_GALD',
    'WORLD_TIME_SHIFTED',
  ]);

  // The archive still shows the five chapters; the survey is now closed.
  await page.getByTestId('survey-done-archive').click();
  await expect(page.getByTestId('open-survey-button')).toBeDisabled();
  await page.getByTestId('archive-entry-GALD').click();
  await expect(page.getByTestId('archive-detail').locator('.location-card')).toHaveCount(5);
  await page.getByTestId('archive-detail-back').click();

  // Reload: still one answer, still marked as answered.
  await page.reload();
  await page.getByTestId('continue-button').click();
  await page.getByTestId('archive-button').click();
  await expect(page.getByTestId('open-survey-button')).toBeDisabled();
  expect(await readFeedback(page)).toHaveLength(1);
});

test('answers survive RESET WORLD, and the dev admin can read and export them', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await completeCoreExperience(page);
  await page.getByTestId('archive-button').click();
  await page.getByTestId('open-survey-button').click();
  await answerSurvey(page, '=1+1 という書き出しのコメント');
  await page.getByTestId('survey-done-home').click();

  // Dev admin shows the answer, its comment and the aggregates.
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await expect(page.getByTestId('dev-playtest-summary')).toContainText('PLAYTEST RESPONSES: 1');
  await expect(page.getByTestId('dev-playtest-summary')).toContainText('CONTINUE INTEREST: 5.0');
  await expect(page.getByTestId('dev-playtest-summary')).toContainText('Immediate 1');
  await expect(page.getByTestId('playtest-comment')).toContainText('=1+1 という書き出しのコメント');

  // CSV export downloads with a BOM, the header and an escaped formula.
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('playtest-export-csv').click(),
  ]);
  const stream = await download.createReadStream();
  const chunks: Buffer[] = [];
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  const csv = Buffer.concat(chunks).toString('utf8');
  expect(csv.charCodeAt(0)).toBe(0xfeff);
  expect(csv).toContain('"playSessionId"');
  expect(csv).toContain(`"'=1+1 という書き出しのコメント"`);

  // RESET WORLD wipes the world but keeps the feedback.
  await page.getByTestId('reset-world-button').click();
  await page.getByTestId('confirm-reset-world').click();
  await expect(page.getByTestId('dev-clock')).toContainText('1年目 1日目');
  await expect(page.getByTestId('dev-playtest-summary')).toContainText('PLAYTEST RESPONSES: 1');
  expect(await readFeedback(page)).toHaveLength(1);

  // And so does RESET SCENARIO.
  await page.getByTestId('reset-scenario-button').click();
  await page.getByTestId('confirm-reset-scenario').click();
  await expect(page.getByTestId('dev-status')).toHaveText('完了: RESET SCENARIO');
  expect(await readFeedback(page)).toHaveLength(1);
});

test('KILL route reaches the survey without seeing bakery or reunion options', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();

  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId('preset-KILL').click();
  await page.getByTestId('time-plus-3y').click();
  await expect(page.getByTestId('dev-clock')).toContainText('4年目');
  await page.getByTestId('dev-admin-back').click();

  await page.getByTestId('archive-button').click();
  await page.getByTestId('open-survey-button').click();
  const intro = page.getByTestId('survey-intro');
  await intro.click();
  await intro.click();

  await page.getByTestId('q1-3').click();
  await page.getByTestId('q2-3').click();
  await page.getByTestId('q3-NOT_APPLICABLE').click(); // available on every route
  await page.getByTestId('survey-next').click();
  await page.getByTestId('q4-3').click();
  await page.getByTestId('q5-3').click();

  // No spoilers: futures this player never reached are not listed.
  await expect(page.getByTestId('q6-BAKERY')).toHaveCount(0);
  await expect(page.getByTestId('q6-REUNION')).toHaveCount(0);
  await expect(page.getByTestId('q6-LIFE_CHOICE')).toBeVisible();
  await page.getByTestId('q6-LIFE_CHOICE').click();
  await page.getByTestId('survey-next').click();
  await page.getByTestId('survey-submit').click();
  await expect(page.getByTestId('survey-done')).toBeVisible({ timeout: 10_000 });

  const feedback = await readFeedback(page);
  expect(feedback).toHaveLength(1);
  expect(feedback[0].route).toBe('KILL');
  expect(feedback[0].memorableMoment).toBe('LIFE_CHOICE');
});

for (const size of [
  { name: '360x800', width: 360, height: 800 },
  { name: '390x844', width: 390, height: 844 },
  { name: '412x915', width: 412, height: 915 },
]) {
  test(`survey fits ${size.name} with no horizontal scroll`, async ({ page }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('/');
    await page.getByTestId('start-button').click();
    await page.getByTestId('prologue-monologue').click();
    const kaos = page.getByTestId('kaos-intro');
    for (let i = 0; i < 6; i++) await kaos.click();

    await page.getByTestId('dev-admin-entry').click();
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
    await page.getByTestId('preset-REUNITED').click();
    await page.getByTestId('dev-admin-back').click();

    await page.getByTestId('archive-button').click();
    await page.getByTestId('open-survey-button').click();
    const intro = page.getByTestId('survey-intro');
    await intro.click();
    await intro.click();

    const noOverflow = async () => {
      const doc = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }));
      expect(doc.scrollWidth).toBeLessThanOrEqual(doc.clientWidth + 1);
    };
    await noOverflow();

    // Rating buttons stay inside the viewport and are tappable.
    const box = await page.getByTestId('q1-5').boundingBox();
    expect(box!.x + box!.width).toBeLessThanOrEqual(size.width + 1);
    expect(box!.height).toBeGreaterThanOrEqual(40);

    await page.getByTestId('q1-5').click();
    await page.getByTestId('q2-5').click();
    await page.getByTestId('q3-LATER').click();
    await page.getByTestId('survey-next').click();
    await noOverflow();
    await page.getByTestId('q4-4').click();
    await page.getByTestId('q5-4').click();
    await page.getByTestId('q6-REUNION').click();
    await page.getByTestId('survey-next').click();

    // A long comment must not blow the layout sideways.
    await page.getByTestId('q7-input').fill('とても長い感想'.repeat(60));
    await noOverflow();
    const textarea = await page.getByTestId('q7-input').boundingBox();
    expect(textarea!.x + textarea!.width).toBeLessThanOrEqual(size.width + 1);
  });
}
