import { test, expect } from './fixtures';
import { playToLifeChoice } from './helpers';
const OUT = '/tmp/shots/ui';

test('SHOT: the six commands and the party', async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await playToLifeChoice(page, '', { stopAt: 'BATTLE' });
  await expect(page.getByTestId('bp-attack')).toBeVisible();
  await page.waitForTimeout(2600);
  await page.screenshot({ path: `${OUT}/A1-battle.png` });
  const m = await page.evaluate(() => {
    const b = (s: string) => { const e = document.querySelector(s); if (!e) return null;
      const r = e.getBoundingClientRect();
      return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), b: Math.round(r.bottom) }; };
    return { cmds: b('[data-testid="bp-commands"]'), modes: b('[data-testid="bp-modes"]'),
             arcana: b('[data-testid="bp-arcana"]'), party: b('.bx-party'),
             hero: b('.bp-hero'), kaos: b('.bp-kaos'),
             locked: b('[data-testid="bp-arcana-locked"]'),
             btns: Array.from(document.querySelectorAll('.bp-commands .bp-cmd')).map(
               (el) => (el.querySelector('.bp-cmd-jp') as HTMLElement)?.textContent),
             arcanaDisabled: (document.querySelector('[data-testid="bp-arcana"]') as HTMLButtonElement)?.disabled };
  });
  console.log(JSON.stringify(m));
});
