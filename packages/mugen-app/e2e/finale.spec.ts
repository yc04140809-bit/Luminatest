import { test, expect, type Page } from '@playwright/test';
import { throughTheOpening, pastTheIntro } from './opening';

/**
 * 第1章終盤 (2026-10-12, 作者指示「遺跡最奥→襲撃→草原誘導→ヴァルシール戦 接続」):
 *
 *   the signs at their heaviest (PHASE 3) → a night's rest (or coming back
 *   in) is the night before → the ruins' depths (hymn: dark, the room, the
 *   unsealing, the refusal, its eye — he leaves — head, foreleg, upper body,
 *   fully awake) → the morning (立ち向かう背中) → the raid in the half-broken
 *   village → the lure → the village meanwhile → the grassland's words → the
 *   first form → its HP at nought: the shell breaks → the second form (the
 *   party carried) → the finishers, the stop (quiet), the return… Aria and
 *   Levi → 「つづく」 (the village after is the next step).
 *
 * Saved at each point (襲撃発生済み RAID, 草原誘導済み LURED, 第2形態移行済み
 * FORM1_WON, 戦闘終了済み FORM2_WON, STOPPED): closing the game mid-way resumes
 * at the point it was in, never the ordinary village. A lost first form starts
 * again from the grassland's words, never the raid.
 */

type DevWorld = {
  addIncident(kind: string, id?: string): Promise<boolean>;
  getIncidentPhase(): number;
  getFinaleStage(): string;
  markRead(ids: string[]): Promise<unknown>;
  recordGaldLifeChoice(c: string): Promise<unknown>;
  advanceSekiryugaArc(s: string): Promise<boolean>;
};
const world = <T,>(page: Page, src: string) =>
  page.evaluate(
    (code) => new Function('w', `return (${code})(w)`)((window as unknown as { __mugenWorld: DevWorld }).__mugenWorld),
    src,
  ) as Promise<T>;
const stage = (page: Page) => world<string>(page, `(w) => w.getFinaleStage()`);
const playing = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __mugenAudio?: { bgmState(): { current: string | null } } }).__mugenAudio?.bgmState().current ?? null,
  );

/** A village at the signs' heaviest: fresh, Gald answered and seen ahead, セキリュウガ's part over, PHASE 3. */
async function heaviestVillage(page: Page, places = 10) {
  await page.goto('/');
  await page.evaluate(async () => {
    await Promise.all(
      ((await indexedDB.databases?.()) ?? []).map(
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
  await page.getByTestId('start-button').click();
  await throughTheOpening(page);
  await page.getByTestId('naming-default').click();
  await pastTheIntro(page);
  await expect(page.getByTestId('world-clock')).toBeVisible();
  await world(page, `(w) => w.recordGaldLifeChoice('SPARE')`);
  await page.reload();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('future-vision')).toBeVisible();
  for (let i = 0; i < 6; i++) {
    if (await page.getByTestId('future-vision-done').isVisible().catch(() => false)) break;
    await page.getByTestId('future-vision-next').click();
  }
  await page.getByTestId('future-vision-done').click();
  await expect(page.getByTestId('world-clock')).toBeVisible();
  for (const s of ['RUMOR', 'TOLD', 'BEATEN', 'SETTLED']) await world(page, `(w) => w.advanceSekiryugaArc('${s}')`);
  for (let i = 0; i < places; i++) await world(page, `(w) => w.addIncident('PLACE', 'P${i}')`);
  if (places >= 10) expect(await world<number>(page, `(w) => w.getIncidentPhase()`)).toBe(3);
}

/** Reads scenes while they are among `scenes`, collecting their words (each line once). */
async function readWhile(page: Page, scenes: readonly string[], words: string[] = []): Promise<string[]> {
  const seen: string[] = [];
  const scene = page.getByTestId('finale-scene');
  const next = page.getByTestId('finale-next');
  let last = '';
  let clickedAt = 0;
  for (let i = 0; i < 600; i++) {
    if (!(await scene.isVisible().catch(() => false))) break;
    const id = (await scene.getAttribute('data-scene').catch(() => null)) ?? '';
    if (!scenes.includes(id)) break;
    const key = `${id}:${await scene.getAttribute('data-at').catch(() => '')}`;
    // Between one line and the next (a stage being kept): wait for it.
    if (key === last || !(await next.isEnabled().catch(() => false))) {
      // A tap that did not land (the line still there a second later, the button free): tap again.
      if (key === last && Date.now() - clickedAt > 2_000 && (await next.isEnabled().catch(() => false))) {
        // …only if it is still the very same line, read again right before the tap.
        const now = `${await scene.getAttribute('data-scene').catch(() => '')}:${await scene.getAttribute('data-at').catch(() => '')}`;
        if (now === last) {
          clickedAt = Date.now();
          await next.click({ timeout: 5_000 }).catch(() => {});
        }
      }
      await page.waitForTimeout(50);
      continue;
    }
    last = key;
    if (seen[seen.length - 1] !== id) seen.push(id);
    words.push((await page.getByTestId('finale-line').textContent()) ?? '');
    clickedAt = Date.now();
    await next.click({ timeout: 5_000 }).catch(() => {});
  }
  return seen;
}

/** Who is speaking the line on screen ('' for none). */
const speakerNow = async (page: Page) => ((await page.locator('.finale-speaker').count()) ? ((await page.locator('.finale-speaker').textContent()) ?? '') : '');

const DEATH = /死|亡|殺|息を引き取|帰らぬ|犠牲|遺体|墓/;

test('PHASE 3: the rest is the night before — ruins, raid, lure, the grassland’s words, the first form; saved at each point; no death anywhere', async ({ page }) => {
  test.setTimeout(180_000);
  await heaviestVillage(page);
  expect(await stage(page)).toBe('NONE');
  const words: string[] = [];

  await page.getByTestId('rest-button').click();
  const scene = page.getByTestId('finale-scene');
  await expect(scene).toHaveAttribute('data-scene', 'EVE');
  await expect(page.getByTestId('finale-line')).toHaveText('その夜は、風がなかった。');
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
  expect(await readWhile(page, ['EVE'], words)).toEqual(['EVE']);

  // The ruins' depths: the hymn; dark, the room, the unsealing, the refusal; the creature a little at a time.
  await expect(scene).toHaveAttribute('data-scene', 'RUINS_SEAL');
  await expect.poll(() => stage(page)).toBe('EVE');
  await expect.poll(() => playing(page)).toBe('CHURCH_HYMN');
  const pictures: string[] = [];
  const frames: string[] = [];
  const hooded: string[] = [];
  for (let i = 0; i < 60 && (await scene.getAttribute('data-scene')) === 'RUINS_SEAL'; i++) {
    const at = (await scene.getAttribute('data-at')) ?? '';
    const b = (await scene.getAttribute('data-backdrop')) ?? '';
    const f = (await scene.getAttribute('data-frame')) ?? '';
    if (pictures[pictures.length - 1] !== b) pictures.push(b);
    if (f !== 'ALL' && frames[frames.length - 1] !== f) frames.push(f);
    const line = (await page.getByTestId('finale-line').textContent()) ?? '';
    words.push(line);
    if ((await speakerNow(page)) === 'フードの男') hooded.push(line);
    await page.getByTestId('finale-next').click();
    // The next line drawn (or the next scene) before it is read — never two lines on one look.
    await expect
      .poll(async () => ((await scene.getAttribute('data-scene')) === 'RUINS_SEAL' ? await scene.getAttribute('data-at') : 'next'))
      .not.toBe(at);
  }
  expect(pictures).toEqual(['DARK', 'RUINS_DEPTHS', 'RUINS_UNSEALING', 'RUINS_REFUSED', 'VALSHEEL_AWAKENING', 'RUINS_DEPTHS']);
  expect(frames).toEqual(['EYE', 'HEAD', 'PAW', 'UPPER']);
  expect(hooded).toEqual(['「……第一封鎖、解除。」', '「次だ。」', '「……違う。」', '「第二封鎖が……逆流している？」', '「……まずい。」', '「まだ起きるはずじゃなかった。」']);

  // The morning and the raid: 立ち向かう背中; the raid in the half-broken village.
  await expect(scene).toHaveAttribute('data-scene', 'MORNING');
  await expect.poll(() => playing(page)).toBe('CHAPTER1_FINAL_BOSS');
  expect(await readWhile(page, ['MORNING'], words)).toEqual(['MORNING']);
  await expect(scene).toHaveAttribute('data-backdrop', 'VILLAGE_BROKEN');
  expect(await readWhile(page, ['RAID'], words)).toEqual(['RAID']);
  await expect.poll(() => stage(page)).toBe('RAID');
  expect(await readWhile(page, ['LURE', 'VILLAGE_MIREI'], words)).toEqual(['LURE', 'VILLAGE_MIREI']);
  await expect.poll(() => stage(page)).toBe('LURED');

  // Closed here, and opened again: the grassland's words — not the raid, not the square.
  await page.goto('/');
  await page.getByTestId('continue-button').click();
  await expect(scene).toHaveAttribute('data-scene', 'FORM1_START');
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
  expect(await readWhile(page, ['FORM1_START'], words)).toEqual(['FORM1_START']);

  // The first form, by the three, on the grassland; it cannot be fled.
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  for (const id of ['hero', 'kaos', 'grave']) await expect(page.getByTestId(`pb-member-${id}`)).toBeVisible();
  await expect(page.getByTestId('pb-enemy-plate')).toContainText('ヴァルシール');
  await expect(page.getByTestId('pb-enemy-art')).toHaveAttribute('src', /valsheel-form1/);
  await expect(page.getByTestId('pb-escape')).toBeDisabled();
  await expect.poll(() => playing(page)).toBe('CHAPTER1_FINAL_BOSS');
  expect(await stage(page)).toBe('LURED');
  expect(words.join('\n')).not.toMatch(DEATH);
});

test('the first form at nought: the shell breaks, the second form (the party carried) — then the finishers, the stop in quiet, the return… つづく; 「つづきから」 comes back to つづく', async ({ page }) => {
  test.setTimeout(240_000);
  await heaviestVillage(page);
  await page.evaluate(() => ((window as unknown as { __mugenFinaleFoeHp?: number }).__mugenFinaleFoeHp = 1));
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'EVE');
  const words: string[] = [];
  expect(await readWhile(page, ['EVE', 'RUINS_SEAL', 'MORNING', 'RAID', 'LURE', 'VILLAGE_MIREI', 'FORM1_START'], words)).toEqual([
    'EVE',
    'RUINS_SEAL',
    'MORNING',
    'RAID',
    'LURE',
    'VILLAGE_MIREI',
    'FORM1_START',
  ]);
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  await page.getByTestId('pb-auto').click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 60_000 });
  await page.getByTestId('pb-result-next').click();

  // The fight stops; the shell breaks; the same creature, its second form.
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'SHELL_BREAK');
  await expect.poll(() => stage(page)).toBe('FORM1_WON');
  expect(await readWhile(page, ['SHELL_BREAK'], words)).toEqual(['SHELL_BREAK']);
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  await expect(page.getByTestId('pb-enemy-art')).toHaveAttribute('src', /valsheel-form2/);
  await expect(page.getByTestId('pb-enemy-plate')).toContainText('ヴァルシール');
  await page.getByTestId('pb-auto').click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'VICTORY', { timeout: 60_000 });
  await page.getByTestId('pb-result-next').click();

  // What follows: the finishers, the stop (the music lets go), the village meanwhile, the return, who stays, who comes.
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'KAOS_FINISHER');
  await expect.poll(() => stage(page)).toBe('FORM2_WON');
  expect(await readWhile(page, ['KAOS_FINISHER', 'HERO_FINISHER'], words)).toEqual(['KAOS_FINISHER', 'HERO_FINISHER']);
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'STOPPED');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __mugenAudio: { bgmState(): { sounding: boolean; current: string | null } } }).__mugenAudio.bgmState().current)).not.toBe('CHAPTER1_FINAL_BOSS');
  expect(await readWhile(page, ['STOPPED', 'VILLAGE_BAKERY', 'RETURN', 'KAOS_STAYS', 'GRAVE_STAYS', 'ARIA_LEVI'], words)).toEqual([
    'STOPPED',
    'VILLAGE_BAKERY',
    'RETURN',
    'KAOS_STAYS',
    'GRAVE_STAYS',
    'ARIA_LEVI',
  ]);
  await expect(page.getByTestId('finale-pause')).toBeVisible();
  await expect.poll(() => stage(page)).toBe('STOPPED');
  expect(words.join('\n')).not.toMatch(DEATH);
  expect(words.join('\n')).toContain('みんな、生きてる');

  await page.getByTestId('finale-pause-ok').click();
  await page.getByTestId('continue-button').click();
  await expect(page.getByTestId('finale-pause')).toBeVisible();
  await expect(page.getByTestId('world-clock')).toHaveCount(0);
});

test('the first form lost: on their feet again, from the grassland’s words — never the raid again; still LURED', async ({ page }) => {
  test.setTimeout(180_000);
  await heaviestVillage(page);
  await page.evaluate(() => ((window as unknown as { __mugenFinalePartyHp?: number }).__mugenFinalePartyHp = 1));
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'EVE');
  await readWhile(page, ['EVE', 'RUINS_SEAL', 'MORNING', 'RAID', 'LURE', 'VILLAGE_MIREI', 'FORM1_START']);
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  await page.getByTestId('pb-auto').click();
  await expect(page.getByTestId('pb-result')).toHaveAttribute('data-outcome', 'DEFEAT', { timeout: 60_000 });
  await page.evaluate(() => delete (window as unknown as { __mugenFinalePartyHp?: number }).__mugenFinalePartyHp);
  await page.getByTestId('pb-result-next').click();
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'FORM1_START');
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-at', '0');
  expect(await stage(page)).toBe('LURED');
  expect(await readWhile(page, ['FORM1_START'])).toEqual(['FORM1_START']);
  // On their feet again: whole.
  await expect(page.getByTestId('pb-screen')).toBeVisible();
  await expect(page.getByTestId('pb-member-grave')).toContainText('180/180');
});

test('coming back into the village at PHASE 3 is the night before too', async ({ page }) => {
  await heaviestVillage(page);
  await page.getByTestId('explore-button').click();
  await page.getByTestId('back-to-village').click();
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'EVE');
});

test('before PHASE 3 a rest is only a rest', async ({ page }) => {
  await heaviestVillage(page, 0);
  expect(await world<number>(page, `(w) => w.getIncidentPhase()`)).toBeLessThan(3);
  const day = await page.getByTestId('world-clock').textContent();
  await page.getByTestId('rest-button').click();
  await expect(page.getByTestId('world-clock')).not.toHaveText(day ?? '');
  await expect(page.getByTestId('finale-scene')).toHaveCount(0);
  expect(await stage(page)).toBe('NONE');
});

for (const [w, h] of [
  [844, 390],
  [640, 300],
] as const) {
  test(`${w}×${h}: the words and つぎへ on screen; the second form’s fight with every control on screen`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto('/?preview=finale&from=FORM1_WON');
    await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'SHELL_BREAK');
    const box = (await page.getByTestId('finale-next').boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(h);
    expect(box.x + box.width).toBeLessThanOrEqual(w);
    await readWhile(page, ['SHELL_BREAK']);
    await expect(page.getByTestId('pb-screen')).toBeVisible();
    for (const id of ['pb-commands', 'pb-members', 'pb-turn-order', 'pb-enemy-plate', 'pb-auto', 'pb-speed']) {
      const b = (await page.getByTestId(id).boundingBox())!;
      expect(b.y + b.height, id).toBeLessThanOrEqual(h + 1);
      expect(b.x + b.width, id).toBeLessThanOrEqual(w + 1);
      expect(b.y, id).toBeGreaterThanOrEqual(-1);
    }
  });
}

/** Reads on until the line on screen is `text` (as shown, 「」 and all). */
async function readUntil(page: Page, text: string) {
  for (let i = 0; i < 300; i++) {
    if (((await page.getByTestId('finale-line').textContent()) ?? '') === text) return;
    if (!(await page.getByTestId('finale-next').isEnabled().catch(() => false))) {
      await page.waitForTimeout(50);
      continue;
    }
    await page.getByTestId('finale-next').click({ timeout: 5_000 }).catch(() => {});
  }
  throw new Error(`never reached ${text}`);
}

test('faces above the words: the line’s face for the five and Mirei, the baker and Lina; Rizel’s too; none for narration; the broken village for the fire', async ({ page }) => {
  test.setTimeout(120_000);
  const face = page.getByTestId('finale-face');
  await page.goto('/?preview=finale&from=NONE');
  await readUntil(page, '「……ねえ。」');
  await expect(face).toHaveAttribute('data-face', 'kaos:SERIOUS');
  await readUntil(page, '「ん？」');
  await expect(face).toHaveAttribute('data-face', 'hero:NORMAL');
  await readUntil(page, '少しの間。');
  await expect(face).toHaveCount(0);
  await readUntil(page, '「こっち！ 道を空けて！」');
  await expect(face).toHaveAttribute('data-face', 'mirei:ANGRY');
  await readUntil(page, '「歩ける人は、動けない人を手伝って！」');
  await expect(face).toHaveAttribute('data-face', 'rizel:SAD');
  await readUntil(page, '「リナ、離れるな！」');
  await expect(face).toHaveAttribute('data-face', 'owner:NORMAL');
  await readUntil(page, '「うん！」');
  await expect(face).toHaveAttribute('data-face', 'lina:NORMAL');
  await readUntil(page, '「ここでやり合ったら村がもたねぇ！」');
  await expect(face).toHaveAttribute('data-face', 'grave:ANGRY');

  // After the stop: the village's bucket line in the broken village; Aria and Levi with their faces.
  await page.goto('/?preview=finale&from=FORM2_WON');
  await readUntil(page, '「水だ！ 桶を回せ！」');
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-backdrop', 'VILLAGE_BROKEN');
  await readUntil(page, '「久しぶりね、ケイオス。」');
  await expect(face).toHaveAttribute('data-face', 'aria:SMILE');
  await readUntil(page, '「派手にやられたな。」');
  await expect(face).toHaveAttribute('data-face', 'levi:NORMAL');
  await readUntil(page, '「で、来てみたらこれだ。」');
  await expect(face).toHaveAttribute('data-face', 'levi:ANGRY');
  await readUntil(page, '「……この人間が、あなたの言っていた人？」');
  await expect(face).toHaveAttribute('data-face', 'aria:TROUBLED');
});

test('ヴァルシール: the first form has 500 HP, the second 420 (作者指示 2026-10-12: 少し手応えを)', async ({ page }) => {
  test.setTimeout(120_000);
  await page.goto('/?preview=finale&from=LURED');
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'FORM1_START');
  await readWhile(page, ['FORM1_START']);
  await expect(page.getByTestId('pb-enemy-hp')).toHaveAttribute('data-hp', '500');
  await page.goto('/?preview=finale&from=FORM1_WON');
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'SHELL_BREAK');
  await readWhile(page, ['SHELL_BREAK']);
  await expect(page.getByTestId('pb-enemy-hp')).toHaveAttribute('data-hp', '420');
});

test('DEBUG: 第1章終盤 from the 3人戦闘 chooser — nothing kept', async ({ page }) => {
  await page.goto('/?preview=party&enemy=select');
  await page.getByTestId('pb-select-finale').click();
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'EVE');
  await page.goto('/?preview=finale&from=LURED&weak=1');
  await expect(page.getByTestId('finale-scene')).toHaveAttribute('data-scene', 'FORM1_START');
});
