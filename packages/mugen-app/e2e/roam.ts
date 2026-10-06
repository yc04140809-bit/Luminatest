import { expect, type Page } from '@playwright/test';

/**
 * WALKING ABOUT IN A PLACE BY TOUCH — for the two-dimensional walk's spec.
 *
 * Everything is read off the scene's own attributes, in the painting's
 * fractions: where he stands (`data-hero`), the camera and the painting
 * (`data-view`), and the things there to look at (`data-things`), so a
 * touch can be aimed at a spot in the painting the way a finger would.
 */

const scene = (page: Page) => page.getByTestId('walk-scene');

export interface P {
  x: number;
  y: number;
}

export interface RoamThing {
  kind: 'point' | 'find';
  id: string;
  stand: P;
  mark: P;
  grade: 'NORMAL' | 'RARE' | 'RAINBOW';
}

const pair = (s: string): P => {
  const [x, y] = s.split(',').map(Number);
  return { x, y };
};

export async function settled(page: Page) {
  await expect(scene(page)).toHaveAttribute('data-walking', 'no', { timeout: 20_000 });
}

export async function hero(page: Page): Promise<P> {
  return pair((await scene(page).getAttribute('data-hero'))!);
}

export async function kaos(page: Page): Promise<P> {
  return pair((await scene(page).getAttribute('data-kaos'))!);
}

export async function scale(page: Page, who: 'hero' | 'kaos' = 'hero'): Promise<number> {
  return Number(await scene(page).getAttribute(who === 'hero' ? 'data-scale' : 'data-kaos-scale'));
}

export async function things(page: Page): Promise<RoamThing[]> {
  const raw = (await scene(page).getAttribute('data-things')) ?? '';
  return raw
    .split(' ')
    .filter(Boolean)
    .map((s) => {
      const [kind, id, stand, mark, grade] = s.split(':');
      return { kind: kind as RoamThing['kind'], id, stand: pair(stand), mark: pair(mark), grade: grade as RoamThing['grade'] };
    });
}

export async function noticed(page: Page): Promise<string[]> {
  return ((await scene(page).getAttribute('data-noticed')) ?? '').split(' ').filter(Boolean);
}

/** As the eye measures, in painting widths. */
export const dist = (a: P, b: P) => Math.hypot(a.x - b.x, ((a.y - b.y) * 941) / 1672);

/** Where a painting point is on screen right now. */
export async function onScreen(page: Page, p: P): Promise<P> {
  const [cam, w, top, h] = ((await scene(page).getAttribute('data-view')) ?? '').split(',').map(Number);
  return { x: p.x * w + cam, y: top + p.y * h };
}

/** Touch the painting at this point (kept on the screen), and wait until they stop. */
export async function touch(page: Page, p: P, wait = true) {
  const vp = page.viewportSize()!;
  const s = await onScreen(page, p);
  await page.mouse.click(Math.min(vp.width - 4, Math.max(4, s.x)), Math.min(vp.height - 4, Math.max(4, s.y)));
  if (wait) {
    await page.waitForTimeout(80);
    await settled(page);
  }
}

/** Walk to where a thing is looked at from (touching the thing itself, as a player would). */
export async function goTo(page: Page, id: string) {
  for (let i = 0; i < 3; i++) {
    const t = (await things(page)).find((x) => x.id === id)!;
    await touch(page, t.mark);
    if (dist(await hero(page), t.stand) < 0.01) return;
  }
}

/** A spot on open floor at height y, out of notice of every thing there. */
export async function openFloor(page: Page, y: number, xs = [0.62, 0.7, 0.55, 0.78, 0.48, 0.85, 0.4, 0.3]): Promise<P> {
  const ts = await things(page);
  const p = xs.map((x) => ({ x, y })).find((q) => ts.every((t) => dist(q, t.stand) > 0.2));
  expect(p, `open floor at ${y}`).toBeTruthy();
  return p!;
}
