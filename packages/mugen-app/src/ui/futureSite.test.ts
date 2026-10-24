import { describe, expect, it } from 'vitest';
import { FUTURE_SITE_DEFS, futureSiteDef } from '@mugen/content/world/futureSites';
import { BAKERY_SHOP_DESCRIPTION, BAKERY_SHOP_LINES } from '@mugen/content/dialogue/bakeryShop';
import { appUnknownDescription } from './futureSite';

/**
 * ALDEN_BAKERY: THE APP AND THE ARTIFACT SAY THEIR OWN THING.
 *
 * The shared content is what the Artifact shows, and it is left as it
 * was. The App says, on its list of places to look into and nowhere
 * else, what is true of its own Alden. And the bakery a player walks
 * into from the village never hints at Gald's future.
 */
describe('ALDEN_BAKERY, App and Artifact independent', () => {
  const bakery = futureSiteDef('ALDEN_BAKERY')!;

  it('the shared content — the Artifact’s card — is unchanged', () => {
    expect(bakery.unknownDescription).toBe('以前は空き店舗だった場所に、新しい店ができている。');
  });

  it('the App’s list says the App’s own line', () => {
    expect(appUnknownDescription(bakery)).toBe('リナの父が営むパン屋。近ごろ、店の奥が少し賑やかになったらしい。');
  });

  it('every other place reads exactly as the content wrote it', () => {
    for (const def of FUTURE_SITE_DEFS.filter((d) => d.id !== 'ALDEN_BAKERY')) {
      expect(appUnknownDescription(def), def.id).toBe(def.unknownDescription);
    }
  });

  it('follows the content, rather than hiding a change to it', () => {
    const changed = { ...bakery, unknownDescription: '別の文。' };
    expect(appUnknownDescription(changed)).toBe('別の文。');
  });

  it('the village bakery itself never hints at the future', () => {
    const said = [BAKERY_SHOP_DESCRIPTION, ...BAKERY_SHOP_LINES.map((l) => l.text)].join('');
    expect(said).not.toContain('賑やか');
    expect(said).not.toContain('ガルド');
    expect(said).not.toContain('男');
  });
});
