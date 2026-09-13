import { test, expect, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';

/**
 * WHERE THE FIGHT'S CAST STANDS — a lock, not a description.
 *
 * The forest fight's four actors used to be placed by the stylesheet.
 * They are placed from `src/ui/battle/formation.ts` now, which the
 * screen reads and puts on the element as an inline style.
 *
 * THE NUMBERS MOVED ONCE, in the BATTLE SCREEN OVERHAUL, and only
 * because what they are shares OF moved: the field was the middle band
 * of a three-band screen and is now the whole of it, so a creature 38%
 * up the old field was 38% up the new screen and halfway into the panel
 * above it. Everybody came down out of the top corners and up out of
 * the commands, and these are where they landed.
 *
 * They are written here as literals on purpose: the point of the file
 * is that the NEXT edit to the formation table has to come past a test
 * that still remembers where everybody stood.
 *
 * Measured as SHARES OF THE FIELD rather than pixels, because the field
 * is allowed to be a different size on a different phone and a placement
 * is not. Three widths, so a test passing by coincidence at one of them
 * has to manage it three times.
 */
test.describe.configure({ mode: 'parallel' });

interface Placed {
  edge: 'left' | 'right';
  /** Share of the field's width in from that edge. */
  inset: number;
  /** Share of the field's height up from the ground line. */
  bottom: number;
  /** The computed `z-index`. `auto` is not `0` and the difference matters. */
  zIndex: string;
}

const EXPECTED: Record<string, Placed> = {
  '.bp-enemy:not(.downed)': { edge: 'left', inset: 0.1, bottom: 0.42, zIndex: 'auto' },
  '.bp-enemy.downed': { edge: 'left', inset: 0.06, bottom: 0.36, zIndex: 'auto' },
  '.bp-hero': { edge: 'right', inset: 0.33, bottom: 0.27, zIndex: '2' },
  '.bp-kaos': { edge: 'right', inset: 0.15, bottom: 0.31, zIndex: '1' },
  '.bp-summon': { edge: 'right', inset: 0.48, bottom: 0.28, zIndex: '2' },
};

const VIEWPORTS = [
  { width: 800, height: 360 },
  { width: 844, height: 390 },
  { width: 915, height: 412 },
];

interface Read {
  stage: { w: number; h: number };
  left: number;
  right: number;
  bottom: number;
  zIndex: string;
  position: string;
}

/**
 * Reads an actor's offsets from the field's own edges.
 *
 * Both horizontal edges, because only one of them is the anchored one:
 * a right-anchored box's left edge moves whenever its picture's width
 * changes, and that is not a placement changing.
 */
function read(page: Page, selector: string): Promise<Read> {
  return page.evaluate((sel) => {
    const stage = document.querySelector('.bp-stage') as HTMLElement;
    const el = document.querySelector(sel) as HTMLElement | null;
    if (!el) throw new Error(`no element for ${sel}`);
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      stage: { w: s.width, h: s.height },
      left: r.left - s.left,
      right: s.right - r.right,
      bottom: s.bottom - r.bottom,
      zIndex: cs.zIndex,
      position: cs.position,
    };
  }, selector);
}

function expectPlaced(got: Read, want: Placed, where: string) {
  const anchored = want.edge === 'left' ? got.left : got.right;
  // A pixel of slack: the field's height is fractional and a share of it
  // rarely lands on a whole device pixel.
  expect(anchored, `${where}: ${want.edge} inset`).toBeCloseTo(want.inset * got.stage.w, 0);
  expect(got.bottom, `${where}: bottom`).toBeCloseTo(want.bottom * got.stage.h, 0);
  expect(got.zIndex, `${where}: z-index`).toBe(want.zIndex);
  expect(got.position, `${where}: position`).toBe('absolute');
}

async function openPrototype(page: Page, opts: { summon?: boolean; finishable?: boolean } = {}) {
  await page.goto('/');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByTestId('start-button').click();
  await page.getByTestId('prologue-monologue').click();
  const kaos = page.getByTestId('kaos-intro');
  for (let i = 0; i < 6; i++) await kaos.click();
  await enterDevAdmin(page);
  await page.getByTestId('force-story-off').click();
  if (opts.summon) {
    await page.getByTestId('arcana-set-高').click();
    await page.getByTestId('force-summon-SUCCESS').click();
  }
  if (opts.finishable) {
    const finishable = page.getByTestId('battle-start-finishable');
    if ((await finishable.textContent())?.includes('OFF')) await finishable.click();
  }
  await page.getByTestId('open-battle-prototype').click();
  await page.getByTestId('bp-modes').waitFor();
  // A right-anchored actor measured before its picture has loaded is a
  // zero-width box whose left edge reads as its right one.
  await page.waitForFunction(() =>
    [...document.querySelectorAll('.bp-stage img')].every(
      (i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth > 0,
    ),
  );
  await page.waitForTimeout(300);
}

for (const size of VIEWPORTS) {
  test(`the three of them stand where the overhaul stood them (${size.width}x${size.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openPrototype(page);
    for (const sel of ['.bp-enemy:not(.downed)', '.bp-hero', '.bp-kaos']) {
      expectPlaced(await read(page, sel), EXPECTED[sel], `${sel} @ ${size.width}`);
    }
  });
}

test('the beaten creature lies where the formation puts it', async ({ page }) => {
  await openPrototype(page, { finishable: true });
  await page.getByTestId('bp-attack').click();
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible({ timeout: 5_000 });
  // The settling drop is a transform; let it finish before measuring.
  await page.waitForTimeout(500);
  expectPlaced(await read(page, '.bp-enemy.downed'), EXPECTED['.bp-enemy.downed'], 'downed');
});

test('a summoned memory stands where the formation puts it', async ({ page }) => {
  await openPrototype(page, { summon: true });
  await expect(page.getByTestId('bp-summoned')).toBeVisible({ timeout: 10_000 });
  await page.waitForTimeout(500);
  expectPlaced(await read(page, '.bp-summon'), EXPECTED['.bp-summon'], 'summon');
});

test('the stylesheet no longer pins any of them', async ({ page }) => {
  // The migration's other half. If a rule still placed an actor, a camera
  // leaning towards somebody would be silently overridden by it — and the
  // measurements above could not tell the difference, because a stylesheet
  // saying `left: 8%` and a formation saying the same thing look identical
  // on screen. So this reads the RULES, not the result.
  //
  // Computed style is no help here: `left` on a positioned element reports
  // its used value, so an unplaced actor still answers `0px`.
  await openPrototype(page);
  const offenders = await page.evaluate(() => {
    // The actor box itself, and only it: one compound selector, no
    // descendant. `.bp-enemy.downed .bp-shadow` is a contact patch and is
    // entitled to a `bottom` of its own; `.bp-summon-ring` is not an actor
    // at all despite the name.
    const isActor = (sel: string) => /^\.bp-(enemy|hero|kaos|summon)(\.[\w-]+)*$/.test(sel.trim());
    const PLACING = ['left', 'right', 'top', 'bottom', 'z-index'];
    const found: string[] = [];
    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
        if (rule instanceof CSSGroupingRule) walk(rule.cssRules);
        if (!(rule instanceof CSSStyleRule)) continue;
        if (!rule.selectorText.split(',').some(isActor)) continue;
        for (const prop of PLACING) {
          const v = rule.style.getPropertyValue(prop);
          if (v) found.push(`${rule.selectorText} { ${prop}: ${v} }`);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      try {
        walk(sheet.cssRules);
      } catch {
        // A cross-origin sheet cannot be read; there are none of ours.
      }
    }
    return found;
  });
  expect(offenders, 'placement left behind in the stylesheet').toEqual([]);
});


/**
 * THE CAMERA, WHICH IS THE ONLY THING ALLOWED TO MOVE ANYBODY.
 *
 * The tests above fix where the cast stands. These are about the one
 * thing permitted to draw them anywhere else — a swing being filmed —
 * and about the promise that it always puts them back.
 *
 * RECORDED IN THE PAGE, not polled. A camera move is a couple of
 * hundred milliseconds and the phases inside it are shorter than that,
 * so asking from the driver on an interval would miss most of them and
 * report whichever it happened to catch. A MutationObserver on the
 * stage sees every phase as it is set, which is both exact and
 * unaffected by how loaded the machine is.
 */
interface Filmed {
  phases: string[];
  /** The hero's anchored edge, in stage-relative pixels, at each phase. */
  heroRight: number[];
  kaosBottom: number[];
}

async function watchCamera(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __cam: { phases: string[]; heroRight: number[]; kaosBottom: number[] } };
    const stage = document.querySelector('.bp-stage') as HTMLElement;
    const record = () => {
      const phase = stage.getAttribute('data-camera') ?? 'NONE';
      const seen = w.__cam.phases;
      if (seen[seen.length - 1] === phase) return;
      const s = stage.getBoundingClientRect();
      const hero = document.querySelector('.bp-hero')!.getBoundingClientRect();
      const kaos = document.querySelector('.bp-kaos')!.getBoundingClientRect();
      seen.push(phase);
      w.__cam.heroRight.push(Math.round(s.right - hero.right));
      w.__cam.kaosBottom.push(Math.round(s.bottom - kaos.bottom));
    };
    w.__cam = { phases: [], heroRight: [], kaosBottom: [] };
    record();
    new MutationObserver(record).observe(stage, {
      attributes: true,
      attributeFilter: ['data-camera'],
    });
  });
}

const filmed = (page: Page): Promise<Filmed> =>
  page.evaluate(() => (window as unknown as { __cam: Filmed }).__cam);

test('a swing is filmed: the party leans, stands back, and comes home', async ({ page }) => {
  await openPrototype(page);
  await watchCamera(page);

  const idle = await read(page, '.bp-hero');
  await page.getByTestId('bp-attack').click();

  // The whole shot, ending at rest. Waiting for the LAST phase rather
  // than for a duration: the turn is over when the camera says it is.
  await expect
    .poll(async () => (await filmed(page)).phases.join(' '), { timeout: 15_000 })
    .toMatch(/IDLE FOCUS RETREAT IMPACT RETURN IDLE/);

  const shot = await filmed(page);
  const at = (phase: string) => shot.phases.lastIndexOf(phase);

  // He leans toward the creature — further in from his own edge — and
  // reaches furthest at the moment of contact.
  expect(shot.heroRight[at('FOCUS')], 'leans in').toBeGreaterThan(shot.heroRight[0]);
  expect(shot.heroRight[at('IMPACT')], 'reaches furthest on contact').toBeGreaterThan(
    shot.heroRight[at('FOCUS')],
  );

  // She stands back, up the path, and only once he has leaned.
  expect(shot.kaosBottom[at('RETREAT')], 'stands back').toBeGreaterThan(shot.kaosBottom[0]);
  expect(shot.kaosBottom[at('FOCUS')], 'but not before').toBe(shot.kaosBottom[0]);

  // And everybody is home — AT RETURN, which is the phase that is
  // supposed to do it. Checking only the resting position afterwards
  // would pass just as well for a camera that held the lean through the
  // whole return and was saved by IDLE zeroing everything.
  expect(shot.heroRight[at('RETURN')], 'home by RETURN').toBe(shot.heroRight[0]);
  expect(shot.kaosBottom[at('RETURN')], 'home by RETURN').toBe(shot.kaosBottom[0]);
  expect(shot.heroRight[at('IDLE')]).toBe(shot.heroRight[0]);
  expect(shot.kaosBottom[at('IDLE')]).toBe(shot.kaosBottom[0]);
  expectPlaced(await read(page, '.bp-hero'), EXPECTED['.bp-hero'], 'hero after the swing');
  expectPlaced(await read(page, '.bp-kaos'), EXPECTED['.bp-kaos'], 'kaos after the swing');
  expect((await read(page, '.bp-hero')).right).toBe(idle.right);
});

test('the creature is never moved by the camera filming a swing', async ({ page }) => {
  await openPrototype(page);
  // What the blow is aimed at, and what the player is reading. It holds
  // its place through every phase of the shot.
  const before = await read(page, '.bp-enemy:not(.downed)');
  await watchCamera(page);
  await page.getByTestId('bp-attack').click();
  await expect
    .poll(async () => (await filmed(page)).phases.includes('IMPACT'), { timeout: 15_000 })
    .toBe(true);
  expectPlaced(await read(page, '.bp-enemy:not(.downed)'), EXPECTED['.bp-enemy:not(.downed)'], 'enemy mid-swing');
  expect((await read(page, '.bp-enemy:not(.downed)')).left).toBe(before.left);
});

test('twice speed films the same shot, and the field still comes home', async ({ page }) => {
  await openPrototype(page);
  const speed = page.getByTestId('bp-speed');
  await speed.click();
  await expect(speed).toHaveAttribute('data-speed', '2');

  await watchCamera(page);
  await page.getByTestId('bp-attack').click();
  await expect
    .poll(async () => (await filmed(page)).phases.join(' '), { timeout: 15_000 })
    .toMatch(/IDLE FOCUS RETREAT IMPACT RETURN IDLE/);

  const shot = await filmed(page);
  expect(shot.heroRight[shot.phases.lastIndexOf('IMPACT')]).toBeGreaterThan(shot.heroRight[0]);
  expectPlaced(await read(page, '.bp-hero'), EXPECTED['.bp-hero'], 'hero after a fast swing');
  expectPlaced(await read(page, '.bp-kaos'), EXPECTED['.bp-kaos'], 'kaos after a fast swing');
});

test('a fight that ends mid-shot still puts everybody back', async ({ page }) => {
  // The return that is not a return: the creature goes down while the
  // party is still leaning, the screen changes underneath the camera,
  // and the phase it was holding must not be what the player is left
  // looking at.
  await openPrototype(page, { finishable: true });
  await watchCamera(page);
  await page.getByTestId('bp-attack').click();
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible({ timeout: 8_000 });

  await expect
    .poll(async () => (await filmed(page)).phases[(await filmed(page)).phases.length - 1], {
      timeout: 10_000,
    })
    .toBe('IDLE');
  expectPlaced(await read(page, '.bp-hero'), EXPECTED['.bp-hero'], 'hero after the fight');
  expectPlaced(await read(page, '.bp-kaos'), EXPECTED['.bp-kaos'], 'kaos after the fight');
  expectPlaced(await read(page, '.bp-enemy.downed'), EXPECTED['.bp-enemy.downed'], 'downed');
});

test('guarding is not filmed, and leaves the field where it found it', async ({ page }) => {
  // One case is connected, and it is the swing. Everything else plays
  // exactly as it did — which is a thing worth holding, because "the
  // camera only does what it was taught" is the whole of this pass.
  await openPrototype(page);
  await watchCamera(page);
  await page.getByTestId('bp-defend').click();
  await page.waitForTimeout(1200);
  const shot = await filmed(page);
  expect(shot.phases.filter((p) => p !== 'IDLE'), 'nothing was filmed').toEqual([]);
  expectPlaced(await read(page, '.bp-hero'), EXPECTED['.bp-hero'], 'hero after a guard');
  expectPlaced(await read(page, '.bp-kaos'), EXPECTED['.bp-kaos'], 'kaos after a guard');
});
