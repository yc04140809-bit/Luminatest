// MUGEN REVIEW PACKAGE — the screenshot half.
//
// Not part of the test suite (no .spec in the name, so the default
// matcher ignores it); it is run by `npm run review` through
// playwright.review.config.ts.
//
// The rule it enforces is the whole point: a screen is photographed only
// if this build says it changed. Everything else is reported in words,
// because a screenshot of a screen nobody touched costs a reviewer time
// and tells them nothing. The declaration lives in
// src/content/qa/visualChanges.ts and is the same one the QA report
// prints, so the two can never disagree.
//
// A screen declared changed with no recipe here is a hard failure. That
// is deliberate: silently shipping no picture of the one screen that
// moved is exactly the failure this package exists to prevent.

import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { VISUAL_CHANGES } from '../src/content/qa/visualChanges';
import { playToLifeChoice } from './helpers';

const OUT_DIR = process.env.REVIEW_DIR ?? resolve(process.cwd(), '..', 'review', 'latest');

async function newWorld(page: Page) {
  await page.goto('/');
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
}

async function openHub(page: Page) {
  await newWorld(page);
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId('dev-review-hub-entry').click();
  await expect(page.getByTestId('dev-review-hub')).toBeVisible();
}

/**
 * How to get to each screen, and what counts as a picture of it. One
 * entry may produce more than one shot where a single frame genuinely
 * cannot show the change (a long screen, a generated report).
 */
type Shot = {
  suffix: string;
  /** Why a reviewer is being asked to look at this one. */
  why: string;
  go: (page: Page) => Promise<void>;
};

const RECIPES: Record<string, Shot[]> = {
  TITLE: [{ suffix: 'title', why: 'the first screen', go: async (page) => void (await page.goto('/')) }],
  'PROLOGUE / KAOS': [
    {
      suffix: 'prologue_kaos',
      why: 'Kaos, the first face',
      go: async (page) => {
        await page.goto('/');
        await page.getByTestId('start-button').click();
        await page.getByTestId('prologue-monologue').click();
        const kaos = page.getByTestId('kaos-intro');
        await expect(kaos).toBeVisible();
        await kaos.click();
      },
    },
  ],
  HOME: [{ suffix: 'home', why: 'the menu the player returns to', go: newWorld }],
  EXPLORE: [
    {
      suffix: 'explore',
      why: 'the map and its marks',
      go: async (page) => {
        await newWorld(page);
        await page.getByTestId('explore-button').click();
        await expect(page.getByTestId('location-ALDEN_VILLAGE')).toBeVisible();
      },
    },
  ],
  'TAVERN / TALK': [
    {
      suffix: 'tavern',
      why: 'the room and the man in it',
      go: async (page) => {
        await newWorld(page);
        await page.getByTestId('explore-button').click();
        await page.getByTestId('location-MOONLIGHT_TAVERN').click();
        await expect(page.getByTestId('talk-MOONLIGHT_TAVERN')).toBeVisible();
      },
    },
  ],
  'GREENWOOD / BATTLE': [
    {
      suffix: 'battle',
      why: 'the encounter, in the place it happens',
      go: async (page) => {
        await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
        await expect(page.getByTestId('gald-portrait-ready')).toBeVisible();
      },
    },
  ],
  'LIFE CHOICE / ENDING / SURVEY': [
    {
      suffix: 'life_choice',
      why: 'the choice the whole game turns on',
      go: async (page) => {
        await playToLifeChoice(page);
        await expect(page.getByTestId('life-choice-portrait')).toBeVisible();
      },
    },
  ],
  'DEV REVIEW HUB': [
    {
      suffix: 'dev_review_hub',
      why: '新規画面。折りたたみと可読性を実機で確認してほしい',
      go: openHub,
    },
    {
      suffix: 'dev_review_hub_qa_report',
      why: 'GENERATE 後のレポート表示。長文が枠内で折り返されているか',
      go: async (page) => {
        await openHub(page);
        await page.getByTestId('qa-generate').click();
        await expect(page.getByTestId('qa-report-text')).toBeVisible();
        await page.getByTestId('qa-report-text').scrollIntoViewIfNeeded();
      },
    },
    {
      suffix: 'director_decision_log',
      why: 'EXPERIENCE DIRECTOR の判断根拠が実際に読めるか',
      go: async (page) => {
        // Meet Grave first, so the log has a real decision to explain
        // rather than an empty history.
        await newWorld(page);
        await page.getByTestId('explore-button').click();
        await page.getByTestId('location-MOONLIGHT_TAVERN').click();
        const scene = page.getByTestId('talk-MOONLIGHT_TAVERN');
        for (let i = 0; i < 20 && (await scene.count()) > 0; i++) {
          await scene.click({ timeout: 2000 }).catch(() => {});
        }
        await page.getByTestId('talk-MOONLIGHT_TAVERN-leave').click();
        await page.locator('.screen-footer .btn').click();
        await page.getByTestId('dev-admin-entry').click();
        await page.getByTestId('dev-lock-input').fill('0909');
        await page.getByTestId('dev-lock-submit').click();
        await page.getByTestId('dev-review-hub-entry').click();
        await page.getByTestId('hub-director-MOONLIGHT_TAVERN').scrollIntoViewIfNeeded();
      },
    },
  ],
};

function slug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

test('capture the review package', async ({ page }) => {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const file of readdirSync(OUT_DIR)) {
    if (file.endsWith('.png') || file === 'manifest.json' || file === 'qa-report.md') {
      rmSync(join(OUT_DIR, file));
    }
  }

  const changed = VISUAL_CHANGES.filter((v) => v.changed);
  const missing = changed.filter((v) => !RECIPES[v.screen]);
  expect(
    missing.map((v) => v.screen),
    'a screen declared changed must have a way to photograph it',
  ).toEqual([]);

  const shots: { file: string; screen: string; reason: string }[] = [];
  let n = 0;
  for (const entry of changed) {
    for (const shot of RECIPES[entry.screen]) {
      n += 1;
      const file = `${String(n).padStart(2, '0')}_${slug(shot.suffix)}.png`;
      await shot.go(page);
      // A moment for art and fonts, so the picture is what a player sees.
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT_DIR, file), fullPage: true });
      shots.push({ file, screen: entry.screen, reason: shot.why });
    }
  }

  // The QA report, from the same build, next to the pictures.
  await openHub(page);
  await page.getByTestId('qa-generate').click();
  const report = await page.getByTestId('qa-report-text').inputValue();
  writeFileSync(join(OUT_DIR, 'qa-report.md'), report, 'utf-8');

  writeFileSync(
    join(OUT_DIR, 'manifest.json'),
    JSON.stringify(
      {
        capturedAt: new Date().toISOString(),
        viewport: page.viewportSize(),
        shots,
        notPhotographed: VISUAL_CHANGES.filter((v) => !v.changed).map((v) => ({
          screen: v.screen,
          reason: v.reason,
        })),
      },
      null,
      2,
    ),
    'utf-8',
  );

  expect(shots.length, 'a build with a changed screen must produce a picture of it').toBeGreaterThan(
    0,
  );
  expect(shots.length, 'a review package is 0-4 pictures, not an album').toBeLessThanOrEqual(4);
});
