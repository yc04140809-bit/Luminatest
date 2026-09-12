import { test, expect, type Page } from './fixtures';
import { enterDevAdmin } from './helpers';

/**
 * WHERE THE FIGHT'S CAST STANDS — a lock, not a description.
 *
 * The forest fight's four actors used to be placed by the stylesheet.
 * They are now placed from `src/ui/battle/formation.ts`, which the
 * screen reads and puts on the element as an inline style. Nothing about
 * the picture was supposed to change in that move.
 *
 * The numbers below ARE THE STYLESHEET'S, copied out of it before it was
 * touched, and they are written here as literals on purpose: the point
 * of the file is that a future edit to the formation table has to come
 * past a test that still remembers where everybody stood.
 *
 *   .bp-enemy         left: 8%    bottom: 38%   (no z-index)
 *   .bp-enemy.downed  left: 4%    bottom: 30%   (no z-index)
 *   .bp-hero          right: 25%  bottom: 7%    z-index: 2
 *   .bp-kaos          right: 0    bottom: 19%   z-index: 1
 *   .bp-summon        right: 42%  bottom: 9%    z-index: 2
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
  '.bp-enemy:not(.downed)': { edge: 'left', inset: 0.08, bottom: 0.38, zIndex: 'auto' },
  '.bp-enemy.downed': { edge: 'left', inset: 0.04, bottom: 0.3, zIndex: 'auto' },
  '.bp-hero': { edge: 'right', inset: 0.25, bottom: 0.07, zIndex: '2' },
  '.bp-kaos': { edge: 'right', inset: 0.0, bottom: 0.19, zIndex: '1' },
  '.bp-summon': { edge: 'right', inset: 0.42, bottom: 0.09, zIndex: '2' },
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
  test(`the three of them stand where they always did (${size.width}x${size.height})`, async ({
    page,
  }) => {
    await page.setViewportSize(size);
    await openPrototype(page);
    for (const sel of ['.bp-enemy:not(.downed)', '.bp-hero', '.bp-kaos']) {
      expectPlaced(await read(page, sel), EXPECTED[sel], `${sel} @ ${size.width}`);
    }
  });
}

test('the beaten creature lies where the stylesheet used to put it', async ({ page }) => {
  await openPrototype(page, { finishable: true });
  await page.getByTestId('bp-attack').click();
  await expect(page.getByTestId('bp-enemy-downed')).toBeVisible({ timeout: 5_000 });
  // The settling drop is a transform; let it finish before measuring.
  await page.waitForTimeout(500);
  expectPlaced(await read(page, '.bp-enemy.downed'), EXPECTED['.bp-enemy.downed'], 'downed');
});

test('a summoned memory stands where the stylesheet used to put it', async ({ page }) => {
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
