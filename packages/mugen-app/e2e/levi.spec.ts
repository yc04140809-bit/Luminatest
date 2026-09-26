import { test, expect, type Page } from "@playwright/test";
import { enemyHp, readyToAct } from "./battle";
import { throughTheOpening } from "./opening";

/**
 * LEVI'S PHANTOM SPEARS, IN THE DEBUG PREVIEW (STEP 5).
 *
 * A showing part, joined to no skill of the game's: she steps in where
 * he stood, six phantom spears form round the creature, go in ONE AT A
 * TIME, and she finishes it herself. Checked: the order, the six, that
 * they strike one after another at ×1 and ×2, that they are where the
 * creature is and on the screen, that the fight under it is untouched
 * (no number, no health taken, no press taken), that nothing is left
 * after — and that the game's own fight never plays it.
 */

interface Frame {
  t: number;
  step: string;
  spears: string;
  cutIn: string;
  heroAside: boolean;
  hits: number;
  told: boolean;
  enemyHp: string;
  locked: string;
}

async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __on: boolean };
    w.__frames = [];
    w.__on = true;
    const t0 = performance.now();
    const tick = () => {
      w.__frames.push({
        t: Math.round(performance.now() - t0),
        step:
          document
            .querySelector('[data-testid="levi-figure"]')
            ?.getAttribute("data-step") ?? "",
        spears: [
          ...document.querySelectorAll<HTMLElement>(
            '[data-testid="levi-spear"]',
          ),
        ]
          .map((s) => (s.dataset.state ?? "?")[0])
          .join(""),
        cutIn:
          document.querySelector('[data-testid="cut-in-name"]')?.textContent ??
          "",
        heroAside: !!document.querySelector(".bp-hero.aside"),
        hits: document.querySelectorAll(".bp-hit").length,
        told: !!document.querySelector(".bp-told"),
        enemyHp:
          document.querySelector('[data-testid="bp-enemy-hp"]')?.textContent ??
          "",
        locked:
          document
            .querySelector('[data-testid="bp-commands"]')
            ?.getAttribute("data-locked") ?? "",
      });
      if (w.__on) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}
async function stop(page: Page): Promise<Frame[]> {
  return page.evaluate(() => {
    const w = window as unknown as { __frames: Frame[]; __on: boolean };
    w.__on = false;
    return w.__frames;
  });
}

/** When each spear first reached a state (its letter: f formed, t thrust, l lodged). */
const firstAt = (f: Frame[], i: number, state: string) =>
  f.find((x) => x.spears[i] === state)?.t ?? -1;

async function openPanel(page: Page) {
  const button = page.getByTestId("debug-levi");
  if (!(await button.isVisible()))
    await page.getByTestId("debug-toggle").click();
  await expect(button).toBeVisible();
}

/** Nothing of it is left: he is back, the creature as it was, the row free. */
async function leftNothing(page: Page) {
  await expect(page.getByTestId("levi-figure")).toHaveCount(0);
  await expect(page.getByTestId("levi-spear")).toHaveCount(0);
  await expect(page.getByTestId("bp-scene-field")).toHaveCount(0);
  await expect(page.getByTestId("bp-scene-over")).toHaveCount(0);
  await expect(page.locator(".bp-hero.aside")).toHaveCount(0);
  await expect(page.locator(".bp-stage[data-scene]")).toHaveCount(0);
  await expect(page.locator(".bp-enemy[data-scene-enemy]")).toHaveCount(0);
  await expect(page.getByTestId("bp-commands")).toHaveAttribute(
    "data-locked",
    "no",
  );
}

for (const motion of ["no-preference", "reduce"] as const)
  test.describe(`motion: ${motion}`, () => {
    test.use({ reducedMotion: motion });

    test("from the DEBUG panel: her cut-in, she steps in, six spears one at a time, the finish — and nothing left", async ({
      page,
    }) => {
      await page.goto("/?preview=battle");
      await readyToAct(page);
      const hpBefore = await enemyHp(page);
      await openPanel(page);
      await record(page);
      await page.getByTestId("debug-levi").click();
      await expect(page.getByTestId("levi-figure")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByTestId("levi-spear")).toHaveCount(6);
      await expect(page.getByTestId("levi-figure")).toHaveCount(0, {
        timeout: 8000,
      });
      await leftNothing(page);
      const f = await stop(page);

      // Her cut-in first (v18's sample, its provisional name), then her.
      const cut = f.findIndex((x) => x.cutIn === "冥槍・黒葬封界");
      const in_ = f.findIndex((x) => x.step !== "");
      expect(cut).toBeGreaterThanOrEqual(0);
      expect(in_).toBeGreaterThan(cut);
      expect(f.slice(in_).some((x) => x.cutIn !== "")).toBe(false);

      // The order: her stance, the six formed, then they strike, then her finish.
      const stepAt = (s: string) => f.find((x) => x.step === s)?.t ?? -1;
      expect(stepAt("stance")).toBeGreaterThan(0);
      const allFormed = f.find((x) => x.spears === "ffffff")?.t ?? -1;
      expect(allFormed).toBeGreaterThan(stepAt("stance"));
      expect(firstAt(f, 0, "t")).toBeGreaterThan(allFormed);
      expect(stepAt("rush")).toBeGreaterThan(firstAt(f, 5, "l"));
      expect(stepAt("impact")).toBeGreaterThan(stepAt("rush"));
      expect(stepAt("leave")).toBeGreaterThan(stepAt("impact"));

      // One at a time: each goes in after the one before, never together.
      for (let i = 1; i < 6; i++) {
        expect(firstAt(f, i, "f")).toBeGreaterThan(firstAt(f, i - 1, "f"));
        expect(
          firstAt(f, i, "l") - firstAt(f, i - 1, "l"),
        ).toBeGreaterThanOrEqual(70);
      }
      // All six in before her finish.
      expect(f.some((x) => x.step === "rush" && x.spears === "llllll")).toBe(
        true,
      );

      // He steps aside for her, and is back as she goes.
      expect(f.filter((x) => x.step === "stab").every((x) => x.heroAside)).toBe(
        true,
      );
      expect(
        f.filter((x) => x.step === "leave").every((x) => !x.heroAside),
      ).toBe(true);

      // The fight under it is untouched: no number, no line, no health taken, no press.
      expect(f.some((x) => x.hits > 0)).toBe(false);
      expect(f.some((x) => x.told)).toBe(false);
      expect(new Set(f.map((x) => x.enemyHp)).size).toBe(1);
      expect(await enemyHp(page)).toEqual(hpBefore);
      expect(
        f.filter((x) => x.step !== "").every((x) => x.locked === "yes"),
      ).toBe(true);
      await expect(page.getByTestId("debug-last-levi")).toBeVisible();
    });
  });

test("×2: quicker, and the six still go in one at a time", async ({ page }) => {
  const time = async (speed: 1 | 2) => {
    await page.goto("/?preview=battle");
    await readyToAct(page);
    if (speed === 2) await page.getByTestId("bp-speed").click();
    await openPanel(page);
    await page.getByTestId("debug-levi-cutin").click(); // 先にカットイン：なし
    await expect(page.getByTestId("debug-levi-cutin")).toContainText("なし");
    await record(page);
    await page.getByTestId("debug-levi").click();
    await expect(page.getByTestId("levi-figure")).toBeVisible();
    await expect(page.getByTestId("levi-figure")).toHaveCount(0, {
      timeout: 8000,
    });
    const f = await stop(page);
    for (let i = 1; i < 6; i++)
      expect(
        firstAt(f, i, "l") - firstAt(f, i - 1, "l"),
      ).toBeGreaterThanOrEqual(70);
    await leftNothing(page);
    const on = f.filter((x) => x.step !== "");
    return on[on.length - 1].t - on[0].t;
  };
  const slow = await time(1);
  const fast = await time(2);
  expect(fast).toBeLessThan(slow);
  // The floors hold it: a showing, not a flicker.
  expect(fast).toBeGreaterThanOrEqual(1800);
});

for (const [label, query, size] of [
  ["the moss rabbit", "", { width: 844, height: 390 }],
  ["Gald", "&enemy=gald", { width: 844, height: 390 }],
  ["a small phone", "", { width: 667, height: 320 }],
] as const)
  test(`where it happens — ${label}: at the creature, on the screen, her lance short of it`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await page.goto(`/?preview=battle&debug=0&levi=bare${query}`);
    // Measured on the very frame all six are in — it lasts a moment only.
    const at = await page.evaluate(
      () =>
        new Promise<{
          W: number;
          H: number;
          inEnemy: boolean;
          spearsOnScreen: number[];
          levi: { left: number; right: number; top: number; bottom: number };
          enemyRight: number;
        }>((resolve) => {
          const measure = () => {
            const r = (e: Element) => e.getBoundingClientRect();
            const W = window.innerWidth;
            const H = window.innerHeight;
            const enemy = r(document.querySelector(".bp-enemy .bp-art")!);
            const meet = r(document.querySelector(".lv-at")!);
            const levi = r(
              document.querySelector('[data-testid="levi-figure"]')!,
            );
            const onScreen = (b: DOMRect) => {
              const w = Math.max(0, Math.min(b.right, W) - Math.max(b.left, 0));
              const h = Math.max(0, Math.min(b.bottom, H) - Math.max(b.top, 0));
              return (w * h) / Math.max(1, b.width * b.height);
            };
            return {
              W,
              inEnemy:
                meet.left >= enemy.left &&
                meet.left <= enemy.right &&
                meet.top >= enemy.top &&
                meet.top <= enemy.bottom,
              spearsOnScreen: [
                ...document.querySelectorAll('[data-testid="levi-spear"]'),
              ].map((s) => onScreen(r(s))),
              levi: {
                left: levi.left,
                right: levi.right,
                top: levi.top,
                bottom: levi.bottom,
              },
              enemyRight: enemy.right,
              H,
            };
          };
          const tick = () => {
            const lodged = document.querySelectorAll(
              '[data-testid="levi-spear"][data-state="lodged"]',
            ).length;
            if (lodged === 6) resolve(measure());
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }),
    );
    // The six meet inside the creature's drawing.
    expect(at.inEnemy).toBe(true);
    // Each spear mostly on the screen — none trailing far off it.
    for (const share of at.spearsOnScreen)
      expect(share).toBeGreaterThanOrEqual(0.7);
    // She stands on the field, her lance's point short of the creature.
    expect(at.levi.left).toBeGreaterThan(at.enemyRight);
    expect(at.levi.right).toBeLessThanOrEqual(at.W);
    expect(at.levi.top).toBeGreaterThanOrEqual(0);
    expect(at.levi.bottom).toBeLessThanOrEqual(at.H);
  });

test("stopped part-way by 「もう一度」, it is gone at once", async ({
  page,
}) => {
  await page.goto("/?preview=battle&levi=bare");
  await expect(
    page.locator('[data-testid="levi-spear"][data-state="formed"]').first(),
  ).toBeVisible({
    timeout: 5000,
  });
  await openPanel(page);
  await page.getByTestId("debug-replay").click();
  await leftNothing(page);
  // And it does not come back on its own.
  await page.waitForTimeout(3500);
  await expect(page.getByTestId("levi-figure")).toHaveCount(0);
});

test("the game's own fight never plays it", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(async () => {
    for (const d of (await indexedDB.databases?.()) ?? [])
      if (d.name) indexedDB.deleteDatabase(d.name);
  });
  await page.reload();
  await page.getByTestId("start-button").click();
  await throughTheOpening(page);
  await page.getByTestId("naming-default").click();
  await page.getByTestId("explore-button").click();
  await page.getByTestId("forest-button").click();
  await page.getByTestId("encounter-button").click();
  await record(page);
  for (let i = 0; i < 3; i++) {
    await readyToAct(page);
    await page.getByTestId("bp-attack").click();
  }
  await readyToAct(page);
  const f = await stop(page);
  expect(f.some((x) => x.step !== "" || x.spears !== "" || x.heroAside)).toBe(
    false,
  );
  await expect(page.getByTestId("debug-levi")).toHaveCount(0);
});
