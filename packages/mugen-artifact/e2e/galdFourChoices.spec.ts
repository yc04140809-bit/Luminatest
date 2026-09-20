import { test, expect, type Page } from './fixtures';
import {
  GALD_CHOICE_EVENT_ID,
  GALD_CHOICE_EVENT_TYPE,
  decideGaldLife,
  ontoTheMap,
  playToLifeChoice,
  readMemoryEvents,
  readWorldStateValue,
  tapField,
} from './helpers';

/**
 * ROUND 9 — THE FOUR ANSWERS, ON A REAL BUILD.
 *
 * Gald's four answers are the one decision MUGEN ZERO does not let
 * anybody take again, and until now only SPARE had ever been played
 * through the actual UI: twelve specs press 「逃がす」 and exactly one
 * presses 「殺す」. CAPTURE had never been pressed at all.
 *
 * So this walks each of the four from a fresh world — the whole way,
 * prologue to fight to answer — and asks the four questions the canon
 * turns on:
 *
 *   1. Is the answer WRITTEN DOWN, as itself and as nothing else?
 *   2. Does it survive the player closing the game?
 *   3. Can the question be asked a second time? (It must not be.)
 *   4. Does the world leak the three lives that were not chosen?
 *
 * The four run as four tests rather than one loop so a failure names
 * the route it belongs to, and so three browsers can take them at once.
 */

const ROUTES = ['SPARE', 'HELP', 'CAPTURE', 'KILL'] as const;

const ALL_CHOICE_TYPES = Object.values(GALD_CHOICE_EVENT_TYPE) as string[];

/** Every life-choice event in WORLD MEMORY, whichever route wrote it. */
async function choiceEvents(page: Page) {
  const events = await readMemoryEvents(page);
  return events.filter((e) => ALL_CHOICE_TYPES.includes(e.type));
}

/**
 * Back into the forest, standing where he stood, tapping where he was.
 *
 * A negative test, so it is bounded by time rather than by an event
 * that is never coming: the meeting is switched off at the scene
 * (`encounterEnabled`), and what that looks like from outside is a tap
 * that does nothing at all.
 */
async function theMeetingDoesNotHappenAgain(page: Page) {
  await ontoTheMap(page);
  await page.getByTestId('location-GREENWOOD_FOREST').click();
  await expect(page.locator('.phaser-wrap canvas')).toBeVisible({ timeout: 20_000 });
  await page.waitForTimeout(600); // let the scene finish booting
  await tapField(page); // where the first meeting stood
  await page.waitForTimeout(4000); // long enough for it to have happened
  await expect(page.getByTestId('gald-encounter')).toHaveCount(0);
  await expect(page.getByTestId('life-choice-screen')).toHaveCount(0);
}

for (const route of ROUTES) {
  const type = GALD_CHOICE_EVENT_TYPE[route];

  test(`${route}: decided once, written down, and never asked again`, async ({ page }) => {
    await playToLifeChoice(page);
    await decideGaldLife(page, route);

    // --- 1. WRITTEN DOWN, as itself ---
    await expect(page.getByTestId('recorded-event-type')).toHaveText(type);

    const written = await choiceEvents(page);
    expect(written, 'a world holds exactly one life-choice event').toHaveLength(1);
    expect(written[0].type).toBe(type);
    // The single fixed id is what makes a contradictory second answer
    // impossible at the store level rather than only in the UI.
    expect(written[0].id).toBe(GALD_CHOICE_EVENT_ID);
    expect(written[0].actors).toEqual(['PLAYER', 'GALD']);
    expect(written[0].location).toBe('GREENWOOD_FOREST');

    /**
     * KILL IS THE ONLY ANSWER THAT CHANGES HIM ON THE SPOT.
     *
     * A character row is a DELTA, not a record card: the world keeps
     * everybody's starting state in code and writes a row only once
     * something has actually changed about them. `GALD_LIFE_CHOICE_
     * STATE_EFFECTS` has exactly one entry, `KILL: { alive: false }`,
     * so KILL is the one answer that leaves a row behind at this
     * moment. Sparing, helping and capturing him change what happens
     * NEXT — and those rows arrive with the events that follow, days
     * later, which is what phaseC and phaseE already pin down.
     */
    const gald = (await readWorldStateValue(page, 'character_GALD')) as
      | { alive?: boolean }
      | undefined;
    if (route === 'KILL') {
      expect(gald, 'KILL writes him down as dead, immediately').toMatchObject({ alive: false });
    } else {
      expect(gald?.alive ?? true, `${route} leaves him alive`).toBe(true);
    }

    await page.getByTestId('return-home-button').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();

    // --- 4. The player is shown their own life and no other ---
    await page.getByTestId('world-memory-button').click();
    await expect(page.getByTestId(`memory-event-${type}`)).toBeVisible();
    for (const other of ALL_CHOICE_TYPES.filter((t) => t !== type)) {
      await expect(
        page.getByTestId(`memory-event-${other}`),
        `${route} must not show ${other}`,
      ).toHaveCount(0);
    }
    await page.getByTestId('world-memory-back').click();
    await expect(page.getByTestId('world-clock')).toBeVisible();

    // --- 2. It survives the game being closed ---
    await page.reload();
    await page.getByTestId('continue-button').click();

    const afterRestart = await choiceEvents(page);
    expect(afterRestart).toHaveLength(1);
    expect(afterRestart[0].type).toBe(type);
    expect(afterRestart[0].id).toBe(GALD_CHOICE_EVENT_ID);

    // --- 3. The question is not asked again ---
    await theMeetingDoesNotHappenAgain(page);

    // And nothing about that walk wrote a second answer.
    const afterWalk = await choiceEvents(page);
    expect(afterWalk, 'walking back in must not record anything').toHaveLength(1);
    expect(afterWalk[0].type).toBe(type);
  });
}
