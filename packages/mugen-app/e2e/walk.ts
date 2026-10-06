import { expect, type Page } from '@playwright/test';

/**
 * WALKING A PLACE BY TOUCH, as a player does — for the walk specs.
 *
 * The walk screen has no step buttons: the ground is touched and the
 * party walks there, stopping beside a thing when the touch was meant for
 * it. These helpers touch the ground the same way a finger would (a real
 * pointer press on the scene), and read where things are from the
 * scene's own `data-stops`.
 */

const scene = (page: Page) => page.getByTestId('walk-scene');

/** Height at which the ground is touched: on the floor, clear of the controls. */
const GROUND_Y = 0.62;

export interface Stop {
  id: string;
  px: number;
  t: number;
}

export async function stops(page: Page): Promise<Stop[]> {
  const raw = (await scene(page).getAttribute('data-stops')) ?? '';
  return raw
    .split(' ')
    .filter(Boolean)
    .map((s) => {
      const [id, px, t] = s.split(':');
      return { id, px: Number(px), t: Number(t) };
    })
    .sort((a, b) => a.t - b.t);
}

export async function walkT(page: Page): Promise<number> {
  return Number(await scene(page).getAttribute('data-t'));
}

export async function settled(page: Page) {
  await expect(scene(page)).toHaveAttribute('data-walking', 'no');
}

/** Touch the ground at this share of the screen's width. */
export async function tapGround(page: Page, xFrac: number, yFrac = GROUND_Y) {
  const vp = page.viewportSize()!;
  await page.mouse.click(Math.round(xFrac * vp.width), Math.round(yFrac * vp.height));
}

/**
 * Walk to stand beside the thing at painting fraction `px` — touching it
 * where it is on screen, or, while it is still off the edge, the edge
 * nearest it, as a finger would.
 */
export async function walkToThing(page: Page, px: number, onWay?: () => Promise<void>) {
  const vp = page.viewportSize()!;
  for (let i = 0; i < 5; i++) {
    const x = await page.evaluate((p) => {
      const r = document.querySelector('.walk-painting')!.getBoundingClientRect();
      return r.left + p * r.width;
    }, px);
    const cx = Math.min(vp.width - 6, Math.max(6, x));
    await page.mouse.click(cx, Math.round(GROUND_Y * vp.height));
    if (onWay) await onWay();
    await settled(page);
    if (cx === x) return;
  }
}

/** Walk on to the next thing to the left, or to the far end when there is none. Returns where they went. */
export async function nextLeft(page: Page, onWay?: () => Promise<void>): Promise<Stop | 'END' | null> {
  if (await atFarEnd(page)) return null;
  const t = await walkT(page);
  const next = (await stops(page)).find((s) => s.t > t + 0.02);
  if (next) {
    await walkToThing(page, next.px, onWay);
    return next;
  }
  for (let i = 0; i < 4 && !(await atFarEnd(page)); i++) {
    await tapGround(page, 0.01);
    if (onWay) await onWay();
    await settled(page);
  }
  return 'END';
}

/** Walk back to the previous thing to the right, or to where they came in. */
export async function nextRight(page: Page): Promise<void> {
  const t = await walkT(page);
  const prev = [...(await stops(page))].reverse().find((s) => s.t < t - 0.02);
  if (prev) return walkToThing(page, prev.px);
  for (let i = 0; i < 4 && (await walkT(page)) > 0.005; i++) {
    await tapGround(page, 0.99);
    await settled(page);
  }
}

/** True once there is nowhere further left to go: no thing ahead, and at (or beside a thing at) the end. */
export async function atFarEnd(page: Page): Promise<boolean> {
  const t = await walkT(page);
  const ahead = (await stops(page)).some((s) => s.t > t + 0.02);
  return !ahead && t >= 0.95;
}
