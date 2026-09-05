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

import { test, expect, type Page } from './fixtures';
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

/**
 * A world with nothing in it. The shots run one after another in one
 * browser, so a recipe that must start from 「はじめる」 has to put the
 * page back to that state first.
 */
async function freshStart(page: Page) {
  await page.goto('/');
  await page.evaluate(async () => {
    const dbs = (await indexedDB.databases?.()) ?? [];
    await Promise.all(
      dbs.map(
        (d) =>
          new Promise((resolve) => {
            if (!d.name) return resolve(null);
            const req = indexedDB.deleteDatabase(d.name);
            req.onsuccess = req.onerror = req.onblocked = () => resolve(null);
          }),
      ),
    );
  });
  await page.reload();
  await page.getByTestId('start-button').waitFor({ timeout: 20_000 });
}

/** Into Greenwood, from nothing, with the art and the tweens running. */
async function enterForest(page: Page) {
  await freshStart(page);
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await openForest(page);
}

/** From HOME, straight through the map into the trees. */
async function openForest(page: Page) {
  await page.getByTestId('explore-button').click();
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await page.locator('.phaser-wrap canvas').waitFor({ timeout: 20_000 });
  // The scene boots, loads its art and starts its tweens; the shot
  // should be of the forest, not of a black canvas.
  await page.waitForTimeout(1800);
}

/**
 * Every spot a gold ring may stand on, in scene coordinates.
 *
 * Which one is standing today is chosen at random, and a review shot
 * cannot wait for luck — so the walk visits them in turn until an
 * arrival happens. The same list as the game's, deliberately duplicated:
 * a capture that silently followed a change in the real list would stop
 * photographing what it claims to.
 */
const RING_SPOTS: readonly [number, number][] = [
  [180, 118], [138, 166], [224, 158], [120, 250],
  [172, 232], [238, 258], [206, 322], [134, 330],
];

/**
 * A world where Gald's story is already settled, with the next arrival
 * forced, so the three routes can each be photographed.
 */
async function forestWith(
  page: Page,
  force: 'EVENT' | 'ITEM' | 'BATTLE',
  story?: 'on' | 'off',
  battleUi?: 'OLD' | 'PROTOTYPE',
  startFinishable?: boolean,
) {
  await newWorld(page);
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId('preset-SPARE_3Y').click();
  await page.getByTestId(`force-encounter-${force}`).click();
  if (story) await page.getByTestId(story === 'on' ? 'force-story-on' : 'force-story-off').click();
  if (battleUi) await page.getByTestId(`battle-ui-${battleUi}`).click();
  if (startFinishable) await page.getByTestId('battle-start-finishable').click();
  await page.getByTestId('dev-admin-back').click();
  await openForest(page);
}

/** Walks the ring spots in turn until something happens. */
async function walkUntil(page: Page, arrived: () => Promise<boolean>) {
  const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
  for (const [x, y] of RING_SPOTS) {
    await page.mouse.click(box.x + box.width * (x / 360), box.y + box.height * (y / 520));
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(180);
      if (await arrived()) return;
    }
  }
}

/** The prototype, opened straight from DEV ADMIN with the book set. */
async function summonBattle(
  page: Page,
  preset: string,
  summon?: 'SUCCESS' | 'FAILURE' | 'ACCIDENT',
  options: { story?: 'on' | 'off'; finishable?: boolean } = {},
) {
  await newWorld(page);
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId(options.story === 'on' ? 'force-story-on' : 'force-story-off').click();
  await page.getByTestId(`arcana-set-${preset}`).click();
  // These shots run one after another in one browser, and newWorld does
  // not wipe the save. A sighting is remembered — deliberately, it is
  // what the cooldown is made of — so the second accident shot would
  // otherwise get an ordinary summon and photograph nothing.
  if (summon === 'ACCIDENT') await page.getByTestId('accident-forget').click();
  await page.getByTestId(summon ? `force-summon-${summon}` : 'force-summon-none').click();
  if (!summon) await page.getByTestId('force-chaos-NONE').click();
  if (options.finishable) {
    const finishable = page.getByTestId('battle-start-finishable');
    if ((await finishable.textContent())?.includes('OFF')) await finishable.click();
  }
  // Opening the prototype IS leaving DEV ADMIN; there is no back click.
  await page.getByTestId('open-battle-prototype').click();
  await expect(page.getByTestId('battle-prototype')).toBeVisible();
}

/** Into ADMIN HOME, through the lock if it is still shut. */
async function adminHome(page: Page) {
  await newWorld(page);
  await page.getByTestId('dev-admin-entry').click();
  const lock = page.getByTestId('dev-lock-screen');
  const admin = page.getByTestId('open-cinematic-preview');
  await expect(lock.or(admin)).toBeVisible({ timeout: 20_000 });
  if (await lock.isVisible()) {
    await page.getByTestId('dev-lock-input').fill('0909');
    await page.getByTestId('dev-lock-submit').click();
  }
  await expect(admin).toBeVisible({ timeout: 20_000 });
}

/** ADMIN HOME → the preview → one piece of it, playing. */
async function previewPiece(page: Page, piece: 'DRAGON' | 'BREATH' | 'FULL') {
  await adminHome(page);
  await page.getByTestId('open-cinematic-preview').click();
  await page.getByTestId('preview-UNKNOWN_ANCIENT_DRAGON_001').click();
  await page.getByTestId(`preview-play-${piece}`).click();
}

/** A fresh world with ARCANA #001 put into one of the states worth seeing. */
async function arcanaAt(page: Page, preset: string) {
  await newWorld(page);
  await page.getByTestId('dev-admin-entry').click();
  await page.getByTestId('dev-lock-input').fill('0909');
  await page.getByTestId('dev-lock-submit').click();
  await page.getByTestId(`arcana-set-${preset}`).click();
  await page.getByTestId('dev-admin-back').click();
}

/** The same, with the book already open on the list. */
async function arcanaBook(page: Page, preset: string) {
  await arcanaAt(page, preset);
  await page.getByTestId('arcana-button').click();
  await expect(page.getByTestId('arcana-list')).toBeVisible();
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
      why: '最初の一文と、彼女の登場',
      go: async (page) => {
        await freshStart(page);
        await page.getByTestId('start-button').click();
        await page.getByTestId('prologue-monologue').click();
        const kaos = page.getByTestId('kaos-intro');
        await expect(kaos).toBeVisible();
        await kaos.click();
      },
    },
  ],
  HOME: [
    {
      suffix: 'home_new_world',
      why: '始めたばかりの世界。まだ何も覚えていない状態の第一印象',
      go: newWorld,
    },
    {
      // The same screen with something in it. An empty world cannot show
      // whether WORLD MEMORY reads as the subject of the game.
      suffix: 'home_remembering',
      why: '記憶を持った世界。数字と最新の記憶が入ったときの見え方',
      go: async (page) => {
        await newWorld(page);
        await page.getByTestId('dev-admin-entry').click();
        await page.getByTestId('dev-lock-input').fill('0909');
        await page.getByTestId('dev-lock-submit').click();
        await page.getByTestId('preset-SPARE_3Y').click();
        await page.getByTestId('dev-admin-back').click();
        await expect(page.getByTestId('home-latest-memory')).toBeVisible();
      },
    },
  ],
  EXPLORE: [
    {
      suffix: 'explore',
      why: 'カードと ✦ 印のコントラスト',
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
      why: '絵本来の色・暗さ・コントラストが戻っているか。白は UI だけか',
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
      suffix: 'greenwood_forest',
      why: '主人公とケイオスちゃんが二人の人物に見えるか。発見の気配が世界に馴染んでいるか',
      go: enterForest,
    },
    {
      // The back view is what the player sees almost always, so the
      // turn has to be photographed separately or nobody ever sees it.
      suffix: 'greenwood_walking_side',
      why: '横に歩いたときに向きが変わるか。足元がタップ地点に来ているか。ケイオスちゃんが道をなぞって付いてくるか',
      go: async (page) => {
        await enterForest(page);
        const box = (await page.locator('.phaser-wrap canvas').boundingBox())!;
        await page.mouse.click(box.x + box.width * 0.14, box.y + box.height * 0.5);
        await page.waitForTimeout(420);
      },
    },
    {
      suffix: 'greenwood_found_item',
      why: 'アイテム発見カード。森の上で読めるか、文字が画面外に出ていないか',
      go: async (page) => {
        await forestWith(page, 'ITEM');
        const card = page.getByTestId('forest-item');
        await walkUntil(page, () => card.isVisible().catch(() => false));
        await expect(card).toBeVisible();
        await page.waitForTimeout(300);
      },
    },
    {
      suffix: 'greenwood_forest_event',
      why: '森の小さな出来事。世界を映したまま会話できているか（白いveilを被せていないか）',
      go: async (page) => {
        await forestWith(page, 'EVENT');
        const scene = page.getByTestId('forest-event');
        await walkUntil(page, () => scene.isVisible().catch(() => false));
        await expect(scene).toBeVisible();
        // The 「▼ タップ」 prompt fades in over about a second.
        await page.waitForTimeout(1600);
      },
    },
    {
      suffix: 'moss_rabbit_battle',
      why: 'モスラビットの絵が正しく出ているか。名前・HP・行動が読めるか',
      go: async (page) => {
        await forestWith(page, 'BATTLE');
        const battle = page.getByTestId('battle-screen');
        await walkUntil(page, () => battle.isVisible().catch(() => false));
        await expect(battle).toBeVisible();
        await page.waitForTimeout(400);
      },
    },
    {
      suffix: 'moss_rabbit_life_choice',
      why: '特殊個体の4択。どれかが「正解」に見えていないか。文字が画面外へ出ていないか',
      go: async (page) => {
        await forestWith(page, 'BATTLE', 'on');
        const battle = page.getByTestId('battle-screen');
        await walkUntil(page, () => battle.isVisible().catch(() => false));
        const attack = page.getByTestId('attack-button');
        for (let i = 0; i < 20; i++) {
          if (await page.getByTestId('enemy-defeated-line').isVisible().catch(() => false)) break;
          if (await attack.isEnabled().catch(() => false)) await attack.click();
          await page.waitForTimeout(140);
        }
        const scene = page.getByTestId('creature-scene-moss_rabbit');
        await expect(scene).toBeVisible({ timeout: 20_000 });
        for (let i = 0; i < 6; i++) {
          if (!(await scene.isVisible().catch(() => false))) break;
          await scene.click();
          await page.waitForTimeout(140);
        }
        await expect(page.getByTestId('creature-life-choice-screen')).toBeVisible();
      },
    },
  ],
  'ADMIN DEV TOOLS': [
    {
      suffix: 'admin_A_lock',
      why: 'A：管理者ロック。控えめな入口の先にあり、入力はそのまま表示されないか',
      go: async (page) => {
        await newWorld(page);
        await page.getByTestId('dev-admin-entry').click();
        await expect(page.getByTestId('dev-lock-screen')).toBeVisible();
      },
    },
    {
      suffix: 'admin_B_home',
      why: 'B：ADMIN HOME。「演出プレビュー」が最初にあり、既存の開発スイッチは下に残っているか',
      go: async (page) => {
        await adminHome(page);
        await expect(page.getByTestId('open-cinematic-preview')).toBeVisible();
      },
    },
    {
      suffix: 'admin_C_preview_list',
      why: 'C：演出プレビュー一覧。ARCANA ＞ 召喚事故 ＞ UNKNOWN #001。正式名称は出していないか',
      go: async (page) => {
        await adminHome(page);
        await page.getByTestId('open-cinematic-preview').click();
        await expect(page.getByTestId('preview-UNKNOWN_ANCIENT_DRAGON_001')).toBeVisible();
      },
    },
    {
      suffix: 'admin_D_dragon',
      why: 'D：巨大召喚。左向き・敵側・画面の半分以上。DUMMY表示で実戦と誤認しないか',
      go: async (page) => {
        await previewPiece(page, 'DRAGON');
        await expect(page.getByTestId('bp-dragon')).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(700);
      },
    },
    {
      suffix: 'admin_E_breath',
      why: 'E：カットイン。顔・口元・ブレス・文字が読めるか。技名の二重表示がないか',
      go: async (page) => {
        await previewPiece(page, 'BREATH');
        await expect(page.getByTestId('bp-breath')).toBeVisible({ timeout: 10_000 });
        await page.waitForTimeout(900);
      },
    },
    {
      suffix: 'admin_F_unknown',
      why: 'F：フルシーケンス中の ARCANA #??? / UNKNOWN。実戦と同じカードか',
      go: async (page) => {
        await previewPiece(page, 'FULL');
        await expect(page.getByTestId('bp-accident-card')).toBeVisible({ timeout: 10_000 });
      },
    },
    {
      suffix: 'admin_G_talk',
      why: 'G：フルシーケンス終盤の会話。実戦と同じ4行か',
      go: async (page) => {
        await previewPiece(page, 'FULL');
        await expect(page.getByTestId('bp-accident-talk')).toBeVisible({ timeout: 18_000 });
      },
    },
    {
      suffix: 'admin_H_end',
      why: 'H：PREVIEW END。もう一度／一覧へ。戦場に何も残っていないか',
      go: async (page) => {
        await previewPiece(page, 'FULL');
        await expect(page.getByTestId('bp-accident-talk')).toBeVisible({ timeout: 18_000 });
        await page.getByTestId('bp-accident-talk').click();
        await expect(page.getByTestId('preview-replay')).toBeVisible();
      },
    },
  ],
  'BATTLE UI PROTOTYPE': [
    {
      suffix: 'battle_prototype',
      why: '世界が主役に見えるか。敵と味方の大きさ・接地・HP・メッセージ・攻撃/スキル',
      go: async (page) => {
        await forestWith(page, 'BATTLE', 'off', 'PROTOTYPE');
        await walkUntil(page, () =>
          page.getByTestId('battle-prototype').isVisible().catch(() => false),
        );
        await expect(page.getByTestId('battle-prototype')).toBeVisible();
        await page.waitForTimeout(400);
      },
    },
  ],
  'LIFE CHOICE / ENDING': [
    {
      suffix: 'life_choice',
      why: '背景を持つ絵に額を付けた結果',
      go: async (page) => {
        await freshStart(page);
        await playToLifeChoice(page);
        await expect(page.getByTestId('life-choice-portrait')).toBeVisible();
      },
    },
  ],
  'PLAYTEST SURVEY': [
    {
      suffix: 'survey_core_questions',
      why: '第3ラウンドの新しい設問ページ。スマホで長すぎないか、入力欄が押せるか',
      go: async (page) => {
        // A preset world, because the survey only asks about a choice
        // that has already been made — and the questions are the point
        // here, not the road to them.
        await newWorld(page);
        await page.getByTestId('dev-admin-entry').click();
        await page.getByTestId('dev-lock-input').fill('0909');
        await page.getByTestId('dev-lock-submit').click();
        await page.getByTestId('preset-SPARE_3Y').click();
        await page.getByTestId('dev-admin-back').click();
        await page.getByTestId('archive-button').click();
        await page.getByTestId('open-survey-button').click();
        const ending = page.getByTestId('ending-kaos');
        await expect(ending).toBeVisible();
        for (let i = 0; i < 4; i++) await ending.click();
        await page.getByTestId('ending-survey-button').click();
        const intro = page.getByTestId('survey-intro');
        await expect(intro).toBeVisible();
        await intro.click();
        await intro.click();
        // Walk to the first of the new pages.
        await page.getByTestId('q1-4').click();
        await page.getByTestId('q2-4').click();
        await page.getByTestId('q3-IMMEDIATE').click();
        await page.getByTestId('survey-next').click();
        await page.getByTestId('q4-4').click();
        await page.getByTestId('q5-4').click();
        // Never the reunion: this preset has not been to the bakery, and
        // the survey rightly does not offer a moment nobody reached.
        await page.getByTestId('q6-LIFE_CHOICE').click();
        await page.getByTestId('survey-next').click();
        await page.getByTestId('q7-4').click();
        await page.getByTestId('q8-4').click();
        await page.getByTestId('q9-NONE').click();
        await page.getByTestId('survey-next').click();
        await page.getByTestId('survey-next').click();
        await page.getByTestId('q12-4').click();
        await expect(page.getByTestId('q13')).toBeVisible();
      },
    },
  ],
  'WORLD MEMORY': [
    {
      suffix: 'world_memory',
      why: '記憶の糸と輪。作品の主題がここで一番はっきり見える',
      go: async (page) => {
        await newWorld(page);
        await page.getByTestId('dev-admin-entry').click();
        await page.getByTestId('dev-lock-input').fill('0909');
        await page.getByTestId('dev-lock-submit').click();
        await page.getByTestId('preset-SPARE_3Y').click();
        await page.getByTestId('dev-admin-back').click();
        await page.getByTestId('world-memory-button').click();
        await expect(page.getByTestId('world-memory-list')).toBeVisible();
      },
    },
  ],
  'ARCANA / アルカナ図鑑': [
    {
      suffix: 'arcana_summon_ability',
      why: '100%でだけ開く「呼べるもの」。ステータスやレアリティになっていないこと',
      go: async (page) => {
        await arcanaBook(page, 'COMPLETE');
        await page.getByTestId('arcana-card-moss_rabbit').click();
        const section = page.getByTestId('arcana-summon');
        await section.scrollIntoViewIfNeeded();
        await expect(section).toBeVisible();
      },
    },
    {
      suffix: 'arcana_H_unknown',
      why: 'H：観測後のUNKNOWN行。通常ARCANAの件数に足していないか、%を出していないか',
      go: async (page) => {
        await summonBattle(page, '中', 'ACCIDENT');
        await page.getByTestId('bp-summon-card').click();
        await expect(page.getByTestId('bp-accident-talk')).toBeVisible({ timeout: 16_000 });
        await page.getByTestId('bp-accident-talk').click();
        await page.waitForTimeout(400);
        // Back to HOME with the save intact, then into the book.
        await page.reload();
        await page.getByTestId('continue-button').click();
        await page.getByTestId('arcana-button').click();
        await expect(page.getByTestId('arcana-unknown-unknown_001')).toBeVisible();
      },
    },
  ],
  'DEV REVIEW HUB': [
    {
      suffix: 'dev_review_hub',
      why: 'DEV 画面もテーマに追従しているか。観察メモ欄が入力できるか',
      go: async (page) => {
        await openHub(page);
        const section = page.getByTestId('hub-section-observation');
        await section.locator('summary').click();
        await section.scrollIntoViewIfNeeded();
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
  // The usual few-pictures rule exists so a person is not collecting
  // screenshots by hand; the machine does that now. A theme change is
  // still allowed to be a theme change.
  expect(shots.length, 'a review package is a set, not a gallery').toBeLessThanOrEqual(12);
});
