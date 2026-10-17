import type { Page } from '@playwright/test';

/**
 * 「マスターと話す」 and, once he is met, 「話を聞く」 in his small menu
 * (2026-10-11: 話を聞く / 加工を頼む / やめる). Before he is met it goes
 * straight into his meeting, as always.
 */
export async function talkToMaster(page: Page) {
  await page.getByTestId('tavern-talk').click();
  const listen = page.getByTestId('tavern-master-listen');
  const line = page.getByTestId('tavern-line');
  // Whichever comes up: his menu (met) or his first words (not yet).
  await listen.or(line).first().waitFor();
  if (await listen.isVisible().catch(() => false)) await listen.click();
}
